import { buildPoGoApiFormKey } from "./reconciliation.ts";

export type PoGoApiCrosswalkDomain =
  | "pokemon_stats"
  | "fast_moves"
  | "charged_moves"
  | "pvp_fast_moves"
  | "pvp_charged_moves"
  | "current_pokemon_moves";

export type CanonicalEntityType = "pokemon_form" | "move";

export type PoGoApiCrosswalkEntry = {
  providerId: "pogoapi";
  domain: PoGoApiCrosswalkDomain;
  externalId: string;
  externalFormKey?: string;
  canonicalEntityType: CanonicalEntityType;
  canonicalEntityId: string;
  sourceUrl: string;
  dataVersion: string;
};

export type CrosswalkValidationIssue = {
  index: number;
  field: string;
  reason: string;
};

export type CrosswalkValidationReport = {
  valid: PoGoApiCrosswalkEntry[];
  issues: CrosswalkValidationIssue[];
};

const DOMAIN_ENTITY: Record<PoGoApiCrosswalkDomain, CanonicalEntityType> = {
  pokemon_stats: "pokemon_form",
  current_pokemon_moves: "pokemon_form",
  fast_moves: "move",
  charged_moves: "move",
  pvp_fast_moves: "move",
  pvp_charged_moves: "move",
};

const FORM_SCOPED_DOMAINS = new Set<PoGoApiCrosswalkDomain>([
  "pokemon_stats",
  "current_pokemon_moves",
]);

const NUMERIC_ID_DOMAINS = new Set<PoGoApiCrosswalkDomain>([
  "pokemon_stats",
  "current_pokemon_moves",
  "fast_moves",
  "charged_moves",
  "pvp_fast_moves",
  "pvp_charged_moves",
]);

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates manually reviewed PoGoAPI crosswalk entries. Domain/entity
 * compatibility is enforced so Pokémon records cannot be mapped to moves
 * and move records cannot be mapped to forms.
 */
export function validatePoGoApiCrosswalk(
  entries: readonly PoGoApiCrosswalkEntry[],
): CrosswalkValidationReport {
  const valid: PoGoApiCrosswalkEntry[] = [];
  const issues: CrosswalkValidationIssue[] = [];
  const acceptedIndices: number[] = [];

  entries.forEach((entry, index) => {
    const addIssue = (field: string, reason: string) => issues.push({ index, field, reason });

    if (entry.providerId !== "pogoapi") addIssue("providerId", "Provider must be pogoapi.");
    if (!(Object.prototype.hasOwnProperty.call(DOMAIN_ENTITY, entry.domain))) addIssue("domain", "Unsupported PoGoAPI domain.");
    if (!nonEmpty(entry.externalId)) addIssue("externalId", "External ID must be non-empty.");
    if (!nonEmpty(entry.canonicalEntityId)) {
      addIssue("canonicalEntityId", "Canonical entity ID must be non-empty.");
    }
    if (!nonEmpty(entry.sourceUrl)) {
      addIssue("sourceUrl", "Source URL must be non-empty.");
    } else {
      try {
        const url = new URL(entry.sourceUrl);
        if (url.protocol !== "https:") addIssue("sourceUrl", "Source URL must use HTTPS.");
      } catch {
        addIssue("sourceUrl", "Source URL must be a valid absolute URL.");
      }
    }
    if (!nonEmpty(entry.dataVersion)) addIssue("dataVersion", "Data version must be non-empty.");

    const expectedEntity = Object.prototype.hasOwnProperty.call(DOMAIN_ENTITY, entry.domain)
      ? DOMAIN_ENTITY[entry.domain]
      : undefined;
    if (expectedEntity && entry.canonicalEntityType !== expectedEntity) {
      addIssue(
        "canonicalEntityType",
        `${entry.domain} must map to a canonical ${expectedEntity}.`,
      );
    }

    if (FORM_SCOPED_DOMAINS.has(entry.domain)) {
      if (!nonEmpty(entry.externalFormKey)) {
        addIssue("externalFormKey", `${entry.domain} requires an explicit external form key.`);
      }
    } else if (entry.externalFormKey !== undefined) {
      addIssue("externalFormKey", "Only form-scoped domains accept an external form key.");
    }

    if (NUMERIC_ID_DOMAINS.has(entry.domain) && nonEmpty(entry.externalId) &&
      (!/^\d+$/.test(entry.externalId.trim()) || !Number.isSafeInteger(Number(entry.externalId.trim())) || Number(entry.externalId.trim()) <= 0)) {
      addIssue("externalId", `${entry.domain} requires a numeric external ID.`);
    }

    if (NUMERIC_ID_DOMAINS.has(entry.domain) && nonEmpty(entry.externalId) &&
      /^\d+$/.test(entry.externalId.trim()) &&
      Number.isSafeInteger(Number(entry.externalId.trim())) &&
      Number(entry.externalId.trim()) > 0 &&
      entry.externalId.trim() !== String(Number(entry.externalId.trim()))) {
      addIssue("externalId", "External numeric ID must use canonical decimal notation without leading zeros.");
    }

    if (FORM_SCOPED_DOMAINS.has(entry.domain) && nonEmpty(entry.externalId) &&
      nonEmpty(entry.externalFormKey) && /^\d+$/.test(entry.externalId.trim()) && Number.isSafeInteger(Number(entry.externalId.trim())) && Number(entry.externalId.trim()) > 0) {
      const expectedPrefix = `${Number(entry.externalId.trim())}:`;
      const formKey = entry.externalFormKey.trim().toLowerCase();
      if (!formKey.startsWith(expectedPrefix) || formKey.length <= expectedPrefix.length ||
        formKey.slice(expectedPrefix.length).trim() !== formKey.slice(expectedPrefix.length) ||
        /\s/.test(formKey.slice(expectedPrefix.length))) {
        addIssue("externalFormKey", "Form key must match the external Pokémon ID and contain a form.");
      }
    }

    if (issues.some((issue) => issue.index === index)) return;
    acceptedIndices.push(index);
    valid.push({
      ...entry,
      externalId: entry.externalId.trim(),
      ...(entry.externalFormKey !== undefined ? { externalFormKey: entry.externalFormKey.trim().toLowerCase() } : {}),
      canonicalEntityId: entry.canonicalEntityId.trim(),
      sourceUrl: entry.sourceUrl.trim(),
      dataVersion: entry.dataVersion.trim(),
    });
  });

  // Duplicate provider identities are ambiguous, even with identical targets.
  const identityIndices = new Map<string, number[]>();
  valid.forEach((entry, position) => {
    const externalKey = FORM_SCOPED_DOMAINS.has(entry.domain)
      ? entry.externalFormKey!.trim().toLowerCase()
      : entry.externalId.trim();
    const identity = JSON.stringify([entry.providerId, entry.domain, externalKey]);
    const indices = identityIndices.get(identity) ?? [];
    indices.push(acceptedIndices[position]);
    identityIndices.set(identity, indices);
  });
  const duplicateIndices = new Set<number>();
  for (const indices of identityIndices.values()) {
    if (indices.length <= 1) continue;
    for (const index of indices) {
      duplicateIndices.add(index);
      issues.push({
        index,
        field: "externalId",
        reason: "Duplicate provider identity within the same domain.",
      });
    }
  }
  return {
    valid: valid.filter((_, position) => !duplicateIndices.has(acceptedIndices[position])),
    issues: issues.sort((a, b) => a.index - b.index),
  };
}

/** Builds the explicit composite identity for stats and form-scoped records. */
export function buildPoGoApiStatsExternalKey(pokemonId: number, form: string): string {
  return buildPoGoApiFormKey(pokemonId, form);
}
