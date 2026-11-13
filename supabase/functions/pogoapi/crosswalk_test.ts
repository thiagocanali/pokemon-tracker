import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPoGoApiStatsExternalKey,
  validatePoGoApiCrosswalk,
  type PoGoApiCrosswalkEntry,
} from "./crosswalk.ts";

const statsEntry: PoGoApiCrosswalkEntry = {
  providerId: "pogoapi",
  domain: "pokemon_stats",
  externalId: "25",
  externalFormKey: "25:normal",
  canonicalEntityType: "pokemon_form",
  canonicalEntityId: "pikachu-normal",
  sourceUrl: "https://pogoapi.net/api/v1/pokemon_stats.json",
  dataVersion: "sha256:example",
};

const moveEntry: PoGoApiCrosswalkEntry = {
  providerId: "pogoapi",
  domain: "fast_moves",
  externalId: "204",
  canonicalEntityType: "move",
  canonicalEntityId: "thunder-shock",
  sourceUrl: "https://pogoapi.net/api/v1/fast_moves.json",
  dataVersion: "sha256:example",
};

Deno.test("builds the stats external key without guessing the form", () => {
  assertEquals(buildPoGoApiStatsExternalKey(25, "Normal"), "25:normal");
});

Deno.test("accepts reviewed stats and move crosswalk entries", () => {
  const report = validatePoGoApiCrosswalk([statsEntry, moveEntry]);
  assertEquals(report.issues, []);
  assertEquals(report.valid, [statsEntry, moveEntry]);
});

Deno.test("requires explicit form identity for stats and current moves", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalFormKey: undefined },
    {
      ...statsEntry,
      domain: "current_pokemon_moves",
      externalFormKey: undefined,
    },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => issue.field), [
    "externalFormKey",
    "externalFormKey",
  ]);
});

Deno.test("enforces domain-to-canonical-entity compatibility", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, canonicalEntityType: "move" },
    { ...moveEntry, canonicalEntityType: "pokemon_form" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => issue.reason), [
    "pokemon_stats must map to a canonical pokemon_form.",
    "fast_moves must map to a canonical move.",
  ]);
});

Deno.test("requires numeric provider IDs for documented numeric domains", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalId: "pikachu" },
    { ...moveEntry, externalId: "thunder-shock" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => issue.field), ["externalId", "externalId"]);
});

Deno.test("rejects provider and metadata omissions instead of guessing them", () => {
  const report = validatePoGoApiCrosswalk([
    {
      ...statsEntry,
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

Deno.test("requires HTTPS source URLs", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, sourceUrl: "http://pogoapi.net/api/v1/fast_moves.json" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues[0].field, "sourceUrl");
});

Deno.test("does not allow form keys on move domains", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, externalFormKey: "25:normal" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues[0].field, "externalFormKey");
});

Deno.test("rejects numeric-looking invalid IDs and accepts positive digit strings", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalId: "25" },
    { ...moveEntry, externalId: "204" },
    { ...moveEntry, externalId: "20d" },
    { ...moveEntry, externalId: "-204" },
  ]);
  assertEquals(report.valid.length, 2);
  assertEquals(report.issues.map((issue) => issue.field), ["externalId", "externalId"]);
});

Deno.test("requires form keys to identify the same Pokémon as the external ID", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalFormKey: "26:normal" },
    { ...statsEntry, externalFormKey: "25:" },
    { ...statsEntry, externalFormKey: "25:normal" },
    { ...statsEntry, domain: "current_pokemon_moves", externalFormKey: "999:normal" },
  ]);
  assertEquals(report.valid.length, 1);
  assertEquals(report.issues.map((issue) => issue.field), [
    "externalFormKey",
    "externalFormKey",
    "externalFormKey",
  ]);
});

Deno.test("rejects zero and unsafe numeric provider identities", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, externalId: "0" },
    { ...moveEntry, externalId: "9007199254740992" },
    { ...moveEntry, externalId: "204" },
  ]);
  assertEquals(report.valid.length, 1);
  assertEquals(report.issues.map((issue) => issue.field), ["externalId", "externalId"]);
});

Deno.test("rejects inherited object properties as unsupported domains", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, domain: "toString" as typeof moveEntry.domain },
  ]);
  assertEquals(report.valid.length, 0);
  assertEquals(report.issues.map((issue) => issue.field), ["domain"]);
});

Deno.test("rejects leading-zero numeric IDs to avoid duplicate external identities", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, externalId: "0204" },
    { ...statsEntry, externalId: "025" },
    { ...moveEntry, externalId: "204" },
  ]);
  assertEquals(report.valid.length, 1);
  assertEquals(report.issues.map((issue) => issue.field), ["externalId", "externalId"]);
});
