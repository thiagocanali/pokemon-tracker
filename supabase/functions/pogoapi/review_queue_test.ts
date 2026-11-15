import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reconcileCrosswalk } from "./reconciliation.ts";
import { buildReconciliationReviewQueue } from "./review_queue.ts";

Deno.test("review queue retains each unresolved record and its input position", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:1", "move:2", "MOVE:2", "move:3", " "],
    mappings: [
      { externalKey: "move:1", canonicalId: "one" },
      { externalKey: "move:2", canonicalId: "two" },
      { externalKey: "move:3", canonicalId: "missing" },
    ],
    canonicalIds: ["one", "two"],
  });
  const queue = buildReconciliationReviewQueue(report);
  assertEquals(queue.total, 4);
  assertEquals(queue.items.map((item) => item.index), [1, 2, 3, 4]);
  assertEquals(queue.items.map((item) => item.status), [
    "ambiguous", "ambiguous", "rejected", "rejected",
  ]);
  assertEquals(queue.byStatus, { unmatched: 0, ambiguous: 2, rejected: 2 });
});

Deno.test("review queue retains missing mappings and returns empty for all matched", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:1", "move:2"],
    mappings: [{ externalKey: "move:1", canonicalId: "one" }],
    canonicalIds: ["one"],
  });
  assertEquals(buildReconciliationReviewQueue(report).byStatus.unmatched, 1);
  const matched = reconcileCrosswalk({
    externalKeys: ["move:1"],
    mappings: [{ externalKey: "move:1", canonicalId: "one" }],
    canonicalIds: ["one"],
  });
  assertEquals(buildReconciliationReviewQueue(matched).total, 0);
});

Deno.test("rejects unsupported statuses rather than silently excluding them", () => {
  const report = reconcileCrosswalk({ externalKeys: ["missing"], mappings: [], canonicalIds: [] });
  report.items[0].status = "unknown" as typeof report.items[0]["status"];
  assertThrows(() => buildReconciliationReviewQueue(report), Error, "Unsupported reconciliation status");
});
