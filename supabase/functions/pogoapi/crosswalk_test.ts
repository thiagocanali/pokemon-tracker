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

Deno.test("rejects every duplicate provider identity within one domain", () => {
  const report = validatePoGoApiCrosswalk([
    moveEntry,
    { ...moveEntry, canonicalEntityId: "different-move" },
    statsEntry,
    { ...statsEntry, externalFormKey: "25:NORMAL" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => [issue.index, issue.field]), [
    [0, "externalId"], [1, "externalId"], [2, "externalId"], [3, "externalId"],
  ]);
});

Deno.test("allows the same numeric ID in separate move domains", () => {
  const report = validatePoGoApiCrosswalk([
    moveEntry,
    { ...moveEntry, domain: "charged_moves" },
    { ...moveEntry, domain: "pvp_fast_moves" },
  ]);
  assertEquals(report.issues, []);
  assertEquals(report.valid.length, 3);
});

Deno.test("normalizes reviewed form keys to canonical lowercase", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalFormKey: "25:Normal" },
  ]);
  assertEquals(report.issues, []);
  assertEquals(report.valid[0].externalFormKey, "25:normal");
});

Deno.test("rejects whitespace inside form identity tokens", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalFormKey: "25:normal form" },
    { ...statsEntry, externalFormKey: "25: normal" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => issue.field), [
    "externalFormKey", "externalFormKey",
  ]);
});

Deno.test("rejects provider URLs containing embedded credentials", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, sourceUrl: "https://user:secret@pogoapi.net/api/v1/fast_moves.json" },
  ]);
  assertEquals(report.valid.length, 0);
  assertEquals(report.issues.map((issue) => issue.field), ["sourceUrl"]);
});

Deno.test("rejects local provider hostnames", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, sourceUrl: "https://localhost/api/v1/fast_moves.json" },
    { ...moveEntry, externalId: "205", sourceUrl: "https://internal.localhost/api/v1/fast_moves.json" },
  ]);
  assertEquals(report.valid.length, 0);
  assertEquals(report.issues.map((issue) => issue.field), ["sourceUrl", "sourceUrl"]);
});

Deno.test("rejects IPv4 and IPv6 literal provider origins", () => {
  const report = validatePoGoApiCrosswalk([
    { ...moveEntry, sourceUrl: "https://127.0.0.1/api/v1/fast_moves.json" },
    { ...moveEntry, externalId: "205", sourceUrl: "https://192.168.1.10/api/v1/fast_moves.json" },
    { ...moveEntry, externalId: "206", sourceUrl: "https://[::1]/api/v1/fast_moves.json" },
  ]);
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => issue.field), [
    "sourceUrl", "sourceUrl", "sourceUrl",
  ]);
});

Deno.test("rejects extra separators in Pokémon form keys", () => {
  const report = validatePoGoApiCrosswalk([
    { ...statsEntry, externalFormKey: "25:normal:variant" },
    { ...statsEntry, externalFormKey: "25::normal" },
    { ...statsEntry, externalFormKey: "25:normal" },
  ]);
  assertEquals(report.valid.length, 1);
  assertEquals(report.issues.map((issue) => issue.field), [
    "externalFormKey", "externalFormKey",
  ]);
});

Deno.test("rejects non-public and reserved DNS source hostnames", () => {
  const urls = [
    "https://intranet/api/v1/fast_moves.json",
    "https://source.internal/api/v1/fast_moves.json",
    "https://source.local/api/v1/fast_moves.json",
    "https://source.test/api/v1/fast_moves.json",
    "https://source.invalid/api/v1/fast_moves.json",
    "https://source.example/api/v1/fast_moves.json",
  ];
  const report = validatePoGoApiCrosswalk(urls.map((sourceUrl, index) => ({
    ...moveEntry, externalId: String(300 + index), sourceUrl,
  })));
  assertEquals(report.valid, []);
  assertEquals(report.issues.map((issue) => issue.field), urls.map(() => "sourceUrl"));
});
