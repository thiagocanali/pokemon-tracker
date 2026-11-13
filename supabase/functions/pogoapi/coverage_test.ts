import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { summarizeReconciliationCoverage } from "./coverage.ts";
import { reconcileCrosswalk } from "./reconciliation.ts";

Deno.test("reports coverage from a read-only reconciliation without claiming full GO coverage", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["1:normal", "2:normal", "3:normal", "4:normal"],
    mappings: [
      { externalKey: "1:normal", canonicalId: "one" },
      { externalKey: "3:normal", canonicalId: "missing" },
      { externalKey: "4:normal", canonicalId: "four" },
    ],
    canonicalIds: ["one", "four"],
  });
  assertEquals(summarizeReconciliationCoverage(report), {
    total: 4,
    matched: 2,
    unmatched: 1,
    ambiguous: 0,
    rejected: 1,
    coveragePercent: 50,
    requiresReview: 2,
  });
});

Deno.test("empty dry-run does not imply complete coverage", () => {
  const report = reconcileCrosswalk({ externalKeys: [], mappings: [], canonicalIds: [] });
  assertEquals(summarizeReconciliationCoverage(report).coveragePercent, 0);
  assertEquals(summarizeReconciliationCoverage(report).total, 0);
});

Deno.test("duplicates count as review items rather than coverage", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:1", "MOVE:1", "move:2"],
    mappings: [
      { externalKey: "move:1", canonicalId: "one" },
      { externalKey: "move:2", canonicalId: "two" },
    ],
    canonicalIds: ["one", "two"],
  });
  assertEquals(summarizeReconciliationCoverage(report), {
    total: 3,
    matched: 1,
    unmatched: 0,
    ambiguous: 2,
    rejected: 0,
    coveragePercent: 33.33,
    requiresReview: 2,
  });
});
