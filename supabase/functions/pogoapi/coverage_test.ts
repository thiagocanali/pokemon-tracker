import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { summarizeCoverageByDomain, summarizeReconciliationCoverage } from "./coverage.ts";
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

Deno.test("summarizes independently per domain without implying complete dataset coverage", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["25:normal", "26:normal", "move:204"],
    mappings: [
      { externalKey: "25:normal", canonicalId: "pikachu-normal" },
      { externalKey: "move:204", canonicalId: "thunder-shock" },
    ],
    canonicalIds: ["pikachu-normal", "thunder-shock"],
  });
  const result = summarizeCoverageByDomain(report, [
    "pokemon_stats", "pokemon_stats", "fast_moves",
  ]);
  assertEquals(result.pokemon_stats?.coveragePercent, 50);
  assertEquals(result.pokemon_stats?.requiresReview, 1);
  assertEquals(result.fast_moves?.coveragePercent, 100);
  assertEquals(result.fast_moves?.total, 1);
});

Deno.test("rejects missing and empty domain labels", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["25:normal"],
    mappings: [],
    canonicalIds: [],
  });
  assertThrows(() => summarizeCoverageByDomain(report, []), Error, "exactly one domain");
  assertThrows(() => summarizeCoverageByDomain(report, [" " as "fast_moves"]), Error, "non-empty");
});

Deno.test("rejects inherited and unsupported domain names", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:204"],
    mappings: [],
    canonicalIds: [],
  });
  assertThrows(
    () => summarizeCoverageByDomain(report, ["toString" as "fast_moves"]),
    Error,
    "Unsupported PoGoAPI domain",
  );
});
