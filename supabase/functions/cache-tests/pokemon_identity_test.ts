import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getPokemonDexNumber } from "../../../src/data/providers/contracts.ts";

Deno.test("resolves the National Pokédex number from the species URL", () => {
  assertEquals(getPokemonDexNumber({
    species: { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon-species/25/" },
  }), 25);
});

Deno.test("accepts a species URL without a trailing slash", () => {
  assertEquals(getPokemonDexNumber({
    species: { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon-species/25" },
  }), 25);
});

Deno.test("does not substitute a Pokémon resource ID when species data is missing", () => {
  assertEquals(getPokemonDexNumber({ species: undefined }), null);
});

Deno.test("rejects malformed or unsafe species identifiers", () => {
  assertEquals(getPokemonDexNumber({
    species: { name: "unknown", url: "https://pokeapi.co/api/v2/pokemon/10041/" },
  }), null);
  assertEquals(getPokemonDexNumber({
    species: { name: "unknown", url: "https://pokeapi.co/api/v2/pokemon-species/0/" },
  }), null);
  assertEquals(getPokemonDexNumber({
    species: { name: "unknown", url: "https://pokeapi.co/api/v2/pokemon-species/9007199254740992/" },
  }), null);
});
