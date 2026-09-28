import type { DataSource, Pokemon, PokemonProvider } from "./contracts";

const API_BASE = "https://pokeapi.co/api/v2";
const responseCache = new Map<string, unknown>();

interface PokemonCatalog {
  count: number;
  results: { name: string; url: string }[];
}

interface PokemonTypeCatalog {
  pokemon: { pokemon: { name: string } }[];
}

const pokemonTypes = [
  "bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying", "ghost",
  "grass", "ground", "ice", "normal", "poison", "psychic", "rock", "steel", "water",
];

async function fetchJson<T>(path: string): Promise<T> {
  const cached = responseCache.get(path);
  if (cached) return cached as T;

  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error("Não foi possível consultar a Pokédex");

  const data = (await response.json()) as T;
  responseCache.set(path, data);
  return data;
}

const source: DataSource = {
  id: "pokeapi",
  name: "PokéAPI",
  url: "https://pokeapi.co/",
  scope: "Dados gerais da franquia Pokémon",
  limitations: "Não fornece dados atuais específicos de Pokémon GO, como raids, eventos e rankings PvP/PvE.",
};

export const pokeApiPokemonProvider: PokemonProvider = {
  source,

  async list(page, type = "") {
    const offset = (page - 1) * 20;
    let names: string[];
    let totalCount: number;

    if (type) {
      const catalog = await fetchJson<PokemonTypeCatalog>(`/type/${encodeURIComponent(type)}`);
      const matchingNames = catalog.pokemon.map(({ pokemon }) => pokemon.name);
      names = matchingNames.slice(offset, offset + 20);
      totalCount = matchingNames.length;
    } else {
      const catalog = await fetchJson<PokemonCatalog>(`/pokemon?limit=20&offset=${offset}`);
      names = catalog.results.map(({ name }) => name);
      totalCount = catalog.count;
    }

    const details = await Promise.all(names.map((name) => this.get(name)));

    return {
      pokemon: details,
      types: pokemonTypes,
      totalCount,
    };
  },

  async search(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    try {
      return [await this.get(normalized)];
    } catch {
      const catalog = await fetchJson<PokemonCatalog>("/pokemon?limit=2000&offset=0");
      const matches = catalog.results
        .filter(({ name, url }) => name.includes(normalized) || url.split("/").filter(Boolean).pop() === normalized)
        .slice(0, 20);
      return Promise.all(matches.map(({ name }) => this.get(name)));
    }
  },

  get(idOrName) {
    return fetchJson<Pokemon>(`/pokemon/${encodeURIComponent(String(idOrName).toLowerCase())}`);
  },
};