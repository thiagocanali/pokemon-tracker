import type { PoGoApiCrosswalkDomain } from "./crosswalk.ts";
import type { ReconciliationReport, ReconciliationStatus } from "./reconciliation.ts";

export type CoverageSummary = {
  total: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  rejected: number;
  coveragePercent: number;
  requiresReview: number;
};

/**
 * Pure, read-only coverage summary for a reviewed reconciliation dry-run.
 * Coverage is the fraction of input records with a unique, verified mapping,
 * not the percentage of the complete Pokémon GO dataset represented locally.
 */
export function summarizeReconciliationCoverage(
  report: ReconciliationReport,
): CoverageSummary {
  const totals: Record<ReconciliationStatus, number> = {
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    rejected: 0,
  };
  for (const item of report.items) {
    totals[item.status] += 1;
  }
  const total = report.items.length;
  return {
    total,
    ...totals,
    coveragePercent: total === 0 ? 0 : Math.round((totals.matched / total) * 10000) / 100,
    requiresReview: totals.unmatched + totals.ambiguous + totals.rejected,
  };
}

/**
 * Splits one dry-run by its caller-provided domain identity.
 * Each input index must have a domain; otherwise the report would be misleading.
 * This function does not fetch or persist provider data.
 */
const VALID_DOMAINS = new Set<PoGoApiCrosswalkDomain>([
  "pokemon_stats", "fast_moves", "charged_moves",
  "pvp_fast_moves", "pvp_charged_moves", "current_pokemon_moves",
]);

export function summarizeCoverageByDomain(
  report: ReconciliationReport,
  domains: readonly PoGoApiCrosswalkDomain[],
): Partial<Record<PoGoApiCrosswalkDomain, CoverageSummary>> {
  if (domains.length !== report.items.length) {
    throw new Error("Each reconciliation item requires exactly one domain.");
  }
  const grouped = new Map<PoGoApiCrosswalkDomain, ReconciliationReport["items"]>();
  report.items.forEach((item, index) => {
    const domain = domains[index];
    if (typeof domain !== "string" || !domain.trim()) {
      throw new Error("Domain must be a non-empty string.");
    }
    const normalized = domain.trim() as PoGoApiCrosswalkDomain;
    if (!VALID_DOMAINS.has(normalized)) {
      throw new Error(`Unsupported PoGoAPI domain: ${normalized}`);
    }
    const items = grouped.get(normalized) ?? [];
    items.push(item);
    grouped.set(normalized, items);
  });
  const summaries: Partial<Record<PoGoApiCrosswalkDomain, CoverageSummary>> = Object.create(null);
  for (const [domain, items] of grouped) {
    summaries[domain] = summarizeReconciliationCoverage({
      items,
      totals: { matched: 0, unmatched: 0, ambiguous: 0, rejected: 0 },
    });
  }
  return summaries;
}
