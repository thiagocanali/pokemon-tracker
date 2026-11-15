import type { ReconciliationItem, ReconciliationReport, ReconciliationStatus } from "./reconciliation.ts";

export type ReviewItem = ReconciliationItem & { index: number };
export type ReviewQueue = {
  total: number;
  items: ReviewItem[];
  byStatus: Record<Exclude<ReconciliationStatus, "matched">, number>;
};

/**
 * Returns all non-matched records in input order for human review.
 * No automatic mapping or write operation is performed.
 */
export function buildReconciliationReviewQueue(report: ReconciliationReport): ReviewQueue {
  const items: ReviewItem[] = [];
  const byStatus = { unmatched: 0, ambiguous: 0, rejected: 0 };
  report.items.forEach((item, index) => {
    if (item.status === "matched") return;
    if (!(item.status in byStatus)) {
      throw new Error("Unsupported reconciliation status.");
    }
    items.push({ ...item, index });
    byStatus[item.status] += 1;
  });
  return { total: items.length, items, byStatus };
}
