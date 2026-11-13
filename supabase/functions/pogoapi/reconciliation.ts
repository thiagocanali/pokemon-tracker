export type CrosswalkMapping = {
  externalKey: string;
  canonicalId: string;
};

export type ReconciliationStatus = "matched" | "unmatched" | "ambiguous" | "rejected";

export type ReconciliationItem = {
  externalKey: string;
  status: ReconciliationStatus;
  canonicalId: string | null;
  reason: string;
};

export type ReconciliationReport = {
  items: ReconciliationItem[];
  totals: Record<ReconciliationStatus, number>;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Builds the PoGoAPI Pokémon form identity without guessing a default form.
 * The upstream numeric Pokémon ID alone is not sufficient to identify a form.
 */
export function buildPoGoApiFormKey(pokemonId: number, form: string): string {
  if (!Number.isSafeInteger(pokemonId) || pokemonId <= 0) {
    throw new Error("pokemonId must be a positive safe integer.");
  }
  const normalizedForm = normalizeKey(form);
  if (!normalizedForm) throw new Error("form must be a non-empty string.");
  return `${pokemonId}:${normalizedForm}`;
}

/**
 * Reconciles an externally supplied list against an explicit crosswalk and
 * canonical IDs. It never derives mappings from names or creates entities.
 *
 * All occurrences of duplicate external keys and canonical-target collisions are marked
 * ambiguous. Mappings to missing canonical IDs are rejected.
 */
export function reconcileCrosswalk(input: {
  externalKeys: string[];
  mappings: CrosswalkMapping[];
  canonicalIds: Iterable<string>;
}): ReconciliationReport {
  const canonical = new Set([...input.canonicalIds].map(normalizeKey));
  const mappingsByExternal = new Map<string, Set<string>>();
  const externalByCanonical = new Map<string, Set<string>>();

  for (const mapping of input.mappings) {
    const externalKey = normalizeKey(mapping.externalKey);
    const canonicalId = normalizeKey(mapping.canonicalId);
    if (!externalKey || !canonicalId) continue;

    const targets = mappingsByExternal.get(externalKey) ?? new Set<string>();
    targets.add(canonicalId);
    mappingsByExternal.set(externalKey, targets);

    const sources = externalByCanonical.get(canonicalId) ?? new Set<string>();
    sources.add(externalKey);
    externalByCanonical.set(canonicalId, sources);
  }

  const frequencies = new Map<string, number>();
  for (const rawKey of input.externalKeys) {
    const key = normalizeKey(rawKey);
    if (key) frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
  }
  const items = input.externalKeys.map((rawKey): ReconciliationItem => {
    const externalKey = normalizeKey(rawKey);
    if (!externalKey) {
      return { externalKey: rawKey, status: "rejected", canonicalId: null, reason: "External key is empty." };
    }
    if ((frequencies.get(externalKey) ?? 0) > 1) {
      return { externalKey, status: "ambiguous", canonicalId: null, reason: "Duplicate external key in input." };
    }

    const targets = mappingsByExternal.get(externalKey);
    if (!targets?.size) {
      return { externalKey, status: "unmatched", canonicalId: null, reason: "No explicit crosswalk mapping exists." };
    }
    if (targets.size !== 1) {
      return { externalKey, status: "ambiguous", canonicalId: null, reason: "External key maps to multiple canonical IDs." };
    }

    const [canonicalId] = targets;
    if (!canonical.has(canonicalId)) {
      return { externalKey, status: "rejected", canonicalId, reason: "Crosswalk target does not exist in the canonical dataset." };
    }

    const sources = externalByCanonical.get(canonicalId);
    if (sources && sources.size > 1) {
      return { externalKey, status: "ambiguous", canonicalId, reason: "Multiple external keys map to the same canonical ID." };
    }

    return { externalKey, status: "matched", canonicalId, reason: "Unique explicit mapping to an existing canonical ID." };
  });

  const totals: ReconciliationReport["totals"] = {
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    rejected: 0,
  };
  for (const item of items) totals[item.status] += 1;

  return { items, totals };
}
