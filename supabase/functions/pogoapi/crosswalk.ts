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

const DOMAINS = new Set<PoGoApiCrosswalkDomain>([
  "pokemon_stats",
  "fast_moves",
  "charged_moves",
  "pvp_fast_moves",
  "pvp_charged_moves",
  "current_pokemon_moves",
]);

const ENTITY_TYPES = new Set<CanonicalEntityType>(["pokemon_form", "move"]);

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates a manually reviewed PoGoAPI crosswalk without deriving mappings
 * from names. Invalid entries are returned as issues and never silently kept.
 */
export function validatePoGoApiCrosswalk(
  entries: readonly PoGoApiCrosswalkEntry[],
): CrosswalkValidationReport {
  const valid: PoGoApiCrosswalkEntry[] = [];
  const issues: CrosswalkValidationIssue[] = [];

  entries.forEach((entry, index) => {
    const addIssue = (field: string, reason: string) => issues.push({ index, field, reason });

    if (entry.providerId !== "pogoapi") addIssue("providerId", "Provider must be pogoapi.");
    if (!DOMAINS.has(entry.domain)) addIssue("domain", "Unsupported PoGoAPI domain.");
    if (!nonEmpty(entry.externalId)) addIssue("externalId", "External ID must be non-empty.");
    if (!ENTITY_TYPES.has(entry.canonicalEntityType)) {
      addIssue("canonicalEntityType", "Unsupported canonical entity type.");
    }
    if (!nonEmpty(entry.canonicalEntityId)) {
      addIssue("canonicalEntityId", "Canonical entity ID must be non-empty.");
    }
    if (!nonEmpty(entry.sourceUrl)) addIssue("sourceUrl", "Source URL must be non-empty.");
    if (!nonEmpty(entry.dataVersion)) addIssue("dataVersion", "Data version must be non-empty.");

    if (entry.domain === "pokemon_stats") {
      if (entry.canonicalEntityType !== "pokemon_form") {
        addIssue("canonicalEntityType", "pokemon_stats must map to a canonical Pokémon form.");
      }
      if (!nonEmpty(entry.externalFormKey)) {
        addIssue("externalFormKey", "pokemon_stats requires an explicit external form key.");
      }
    }

    if (entry.domain !== "pokemon_stats" && entry.externalFormKey !== undefined) {
      addIssue("externalFormKey", "Only pokemon_stats uses an external form key.");
    }

    if (issues.some((issue) => issue.index === index)) return;
    valid.push({
      ...entry,
      externalId: entry.externalId.trim(),
      externalFormKey: entry.externalFormKey?.trim(),
      canonicalEntityId: entry.canonicalEntityId.trim(),
      sourceUrl: entry.sourceUrl.trim(),
      dataVersion: entry.dataVersion.trim(),
    });
  });

  return { valid, issues };
}

/** Creates the canonical external identity used by the stats crosswalk. */
export function buildPoGoApiStatsExternalKey(pokemonId: number, form: string): string {
  return buildPoGoApiFormKey(pokemonId, form);
}
