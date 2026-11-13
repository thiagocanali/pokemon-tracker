import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPoGoApiFormKey, reconcileCrosswalk } from "./reconciliation.ts";

Deno.test("builds a form key from both Pokémon ID and form", () => {
  assertEquals(buildPoGoApiFormKey(25, "Normal"), "25:normal");
  assertEquals(buildPoGoApiFormKey(25, "alola"), "25:alola");
});

Deno.test("rejects invalid or missing form identity instead of guessing", () => {
  assertThrows(() => buildPoGoApiFormKey(0, "Normal"), Error, "positive safe integer");
  assertThrows(() => buildPoGoApiFormKey(25, "  "), Error, "non-empty string");
});

Deno.test("matches only explicit mappings to existing canonical IDs", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["25:normal", "25:alola", "26:normal"],
    mappings: [
      { externalKey: "25:normal", canonicalId: "pikachu-normal" },
      { externalKey: "25:alola", canonicalId: "raichu-alola" },
    ],
    canonicalIds: ["pikachu-normal", "raichu-alola"],
  });

  assertEquals(report.totals, { matched: 2, unmatched: 1, ambiguous: 0, rejected: 0 });
  assertEquals(report.items[0].canonicalId, "pikachu-normal");
  assertEquals(report.items[2].status, "unmatched");
});

Deno.test("rejects crosswalk targets absent from canonical data", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:123"],
    mappings: [{ externalKey: "move:123", canonicalId: "missing-move" }],
    canonicalIds: [],
  });
  assertEquals(report.items[0].status, "rejected");
});

Deno.test("flags one external key mapped to multiple canonical entities", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["25:normal"],
    mappings: [
      { externalKey: "25:normal", canonicalId: "pikachu" },
      { externalKey: "25:normal", canonicalId: "raichu" },
    ],
    canonicalIds: ["pikachu", "raichu"],
  });
  assertEquals(report.items[0].status, "ambiguous");
});

Deno.test("flags multiple external keys mapping to one canonical entity", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:1", "move:2"],
    mappings: [
      { externalKey: "move:1", canonicalId: "thunder-shock" },
      { externalKey: "move:2", canonicalId: "thunder-shock" },
    ],
    canonicalIds: ["thunder-shock"],
  });
  assertEquals(report.items.map((item) => item.status), ["ambiguous", "ambiguous"]);
});

Deno.test("flags duplicate and empty input keys without silently dropping them", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["move:1", "MOVE:1", "  "],
    mappings: [{ externalKey: "move:1", canonicalId: "thunder-shock" }],
    canonicalIds: ["thunder-shock"],
  });
  assertEquals(report.items.map((item) => item.status), ["ambiguous", "ambiguous", "rejected"]);
  assertEquals(report.totals, { matched: 0, unmatched: 0, ambiguous: 2, rejected: 1 });
});

Deno.test("duplicate keys never yield a matched record regardless of ordering", () => {
  const report = reconcileCrosswalk({
    externalKeys: ["MOVE:1", "move:2", " move:1 "],
    mappings: [
      { externalKey: "move:1", canonicalId: "thunder-shock" },
      { externalKey: "move:2", canonicalId: "quick-attack" },
    ],
    canonicalIds: ["thunder-shock", "quick-attack"],
  });
  assertEquals(report.items.map((item) => item.status), ["ambiguous", "matched", "ambiguous"]);
  assertEquals(report.totals, { matched: 1, unmatched: 0, ambiguous: 2, rejected: 0 });
});
