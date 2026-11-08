import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  parsePokemonList,
  parsePokemonResource,
  parsePokemonSpeciesResource,
  parseSyncPagination,
  unwrapValidation,
} from "./validation.ts";
import {
  validPokemonList,
  validPokemonResource,
  validPokemonSpecies,
} from "./fixtures/pokeapi.ts";

Deno.test("uses defaults for an empty pagination object", () => {
  assertEquals(parseSyncPagination({}), { ok: true, value: { offset: 0, limit: 20 } });
});

Deno.test("accepts valid pagination boundaries", () => {
  assertEquals(parseSyncPagination({ offset: 10, limit: 25 }), {
    ok: true, value: { offset: 10, limit: 25 },
  });
  assertEquals(parseSyncPagination({ offset: 0, limit: 1 }), {
    ok: true, value: { offset: 0, limit: 1 },
  });
});

Deno.test("rejects negative, fractional and unsafe offsets", () => {
  for (const offset of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2", null]) {
    assertEquals(parseSyncPagination({ offset }).ok, false);
  }
});

Deno.test("rejects limits outside 1..25 and non-integers", () => {
  for (const limit of [0, -1, 26, 1.2, "10", null]) {
    assertEquals(parseSyncPagination({ limit }).ok, false);
  }
});

Deno.test("rejects non-object JSON values and arrays", () => {
  for (const body of [null, [], "{}", 1, true]) {
    assertEquals(parseSyncPagination(body).ok, false);
  }
});

Deno.test("accepts a valid PokéAPI Pokémon list fixture", () => {
  assertEquals(parsePokemonList(validPokemonList), { ok: true, value: validPokemonList });
});

Deno.test("rejects malformed Pokémon list metadata and external resource URLs", () => {
  assertEquals(parsePokemonList({ ...validPokemonList, count: -1 }).ok, false);
  assertEquals(parsePokemonList({ ...validPokemonList, results: [{ name: "bulbasaur", url: "https://evil.example/pokemon/1" }] }).ok, false);
  assertEquals(parsePokemonList({ count: 0, results: validPokemonList.results }).ok, false);
});

Deno.test("accepts a Pokémon resource only when it matches its list entry", () => {
  const entry = validPokemonList.results[0];
  assertEquals(parsePokemonResource(validPokemonResource, entry).ok, true);
  assertEquals(parsePokemonResource({ ...validPokemonResource, id: 2 }, entry).ok, false);
  assertEquals(parsePokemonResource({ ...validPokemonResource, name: "ivysaur" }, entry).ok, false);
});

Deno.test("rejects invalid, duplicate or unsupported Pokémon types", () => {
  assertEquals(parsePokemonResource({ ...validPokemonResource, types: [] }).ok, false);
  assertEquals(parsePokemonResource({
    ...validPokemonResource,
    types: [{ slot: 3, type: { name: "grass" } }],
  }).ok, false);
  assertEquals(parsePokemonResource({
    ...validPokemonResource,
    types: [{ slot: 1, type: { name: "grass" } }, { slot: 1, type: { name: "poison" } }],
  }).ok, false);
  assertEquals(parsePokemonResource({
    ...validPokemonResource,
    types: [{ slot: 1, type: { name: "unknown-type" } }],
  }).ok, false);
});

Deno.test("rejects invalid species URLs in Pokémon resources", () => {
  assertEquals(parsePokemonResource({
    ...validPokemonResource,
    species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
  }).ok, false);
});

Deno.test("accepts a species fixture matching the Pokémon reference", () => {
  assertEquals(parsePokemonSpeciesResource(validPokemonSpecies, validPokemonResource.species).ok, true);
});

Deno.test("rejects species identity mismatches and malformed localized fields", () => {
  assertEquals(parsePokemonSpeciesResource({
    ...validPokemonSpecies,
    id: 2,
  }, validPokemonResource.species).ok, false);
  assertEquals(parsePokemonSpeciesResource({
    ...validPokemonSpecies,
    names: [{ language: {}, name: "Bulbasaur" }],
  }).ok, false);
  assertEquals(parsePokemonSpeciesResource({
    ...validPokemonSpecies,
    generation: { name: "" },
  }).ok, false);
});

Deno.test("unwrapValidation throws the source validation error", () => {
  const result = parsePokemonList({ count: -1, results: [] });
  assertThrows(() => unwrapValidation(result), Error, "invalid shape");
});
