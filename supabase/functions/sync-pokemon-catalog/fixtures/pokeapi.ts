export const validPokemonList = {
  count: 1,
  results: [{ name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" }],
};

export const validPokemonResource = {
  id: 1,
  name: "bulbasaur",
  height: 7,
  weight: 69,
  sprites: {},
  types: [{ slot: 1, type: { name: "grass" } }, { slot: 2, type: { name: "poison" } }],
  stats: [],
  abilities: [],
  moves: [],
  species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
};

export const validPokemonSpecies = {
  id: 1,
  name: "bulbasaur",
  names: [{ language: { name: "en" }, name: "Bulbasaur" }],
  genera: [{ genus: "Seed Pokémon", language: { name: "en" } }],
  flavor_text_entries: [{ flavor_text: "A strange seed was planted on its back.", language: { name: "en" } }],
  generation: { name: "generation-i" },
};
