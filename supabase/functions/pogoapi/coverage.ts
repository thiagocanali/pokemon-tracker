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
