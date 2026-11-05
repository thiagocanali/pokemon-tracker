import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formatCollectedAt,
  formatDataVersion,
  formatSourceName,
  formatSourceUpdatedAt,
} from "../../../src/data/provenance.ts";

Deno.test("formats collection timestamps explicitly in UTC", () => {
  const formatted = formatCollectedAt("2026-11-05T12:30:00.000Z");
  assertStringIncludes(formatted, "UTC");
  assertEquals(formatCollectedAt(null), "Coleta não informada");
  assertEquals(formatCollectedAt("invalid"), "Data de coleta inválida");
});

Deno.test("does not invent an official source update timestamp", () => {
  assertEquals(formatSourceUpdatedAt(null), "Atualização oficial não informada");
  assertEquals(formatSourceUpdatedAt("invalid"), "Data de atualização inválida");
  assertStringIncludes(formatSourceUpdatedAt("2026-11-05T12:30:00.000Z"), "UTC");
});

Deno.test("formats provider version without fabricating missing values", () => {
  assertEquals(formatDataVersion("pokeapi-v2"), "Versão: pokeapi-v2");
  assertEquals(formatDataVersion(null), "Versão da fonte não informada");
});

Deno.test("normalizes source relations returned as object or array", () => {
  assertEquals(formatSourceName({ name: "PokéMiners" }), "PokéMiners");
  assertEquals(formatSourceName([{ name: "PvPoke" }]), "PvPoke");
  assertEquals(formatSourceName([]), "Fonte não identificada");
  assertEquals(formatSourceName(null), "Fonte não identificada");
  assertEquals(formatSourceName(undefined), "Fonte não identificada");
});
