import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPoGoApiStatsExternalKey,
  validatePoGoApiCrosswalk,
  type PoGoApiCrosswalkEntry,
} from "./crosswalk.ts";

const base: PoGoApiCrosswalkEntry = {
  providerId: "pogoapi",
  domain: "pokemon_stats",
  externalId: "25",
  externalFormKey: "25:normal",
  canonicalEntityType: "pokemon_form",
  canonicalEntityId: "pikachu-normal",
  sourceUrl: "https://pogoapi.net/api/v1/pokemon_stats.json",
  dataVersion: "sha256:example",
};

Deno.test("builds the stats external key without guessing the form", () => {
  assertEquals(buildPoGoApiStatsExternalKey(25, "Normal"), "25:normal");
});

Deno.test("accepts a reviewed stats crosswalk entry", () => {
  const report = validatePoGoApiCrosswalk([base]);
  assertEquals(report.issues, []);
  assertEquals(report.valid[0], base);
});

Deno.test("rejects stats entries without explicit form identity", () => {
  const report = validatePoGoApiCrosswalk([{ ...base, externalFormKey: undefined }]);
  assertEquals(report.valid, []);
  assertEquals(report.issues, [{
    index: 0,
    field: "externalFormKey",
    reason: "pokemon_stats requires an explicit external form key.",
  }]);
});

Deno.test("requires Pokémon stats to map to canonical forms", () => {
  const report = validatePoGoApiCrosswalk([
    { ...base, canonicalEntityType: "move" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues[0].field, "canonicalEntityType");
});

Deno.test("rejects provider and metadata omissions instead of guessing them", () => {
  const report = validatePoGoApiCrosswalk([
    {
      ...base,
      providerId: "other" as "pogoapi",
      sourceUrl: " ",
      dataVersion: "",
    },
  ]);
  assertEquals(report.valid, []);
  assertEquals(
    report.issues.map((issue) => issue.field),
    ["providerId", "sourceUrl", "dataVersion"],
  );
});

Deno.test("does not allow form keys on move domains", () => {
  const report = validatePoGoApiCrosswalk([
    {
      ...base,
      domain: "fast_moves",
      externalFormKey: "25:normal",
      canonicalEntityType: "move",
    },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues[0].field, "externalFormKey");
});
