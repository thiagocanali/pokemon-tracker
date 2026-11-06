import type { DataSource, Pokemon, PokemonProvider } from "./contracts";
import { readPersistentCache, writePersistentCache } from "../cache/indexedDb";
import { isCacheFresh } from "../cache/freshness";
import { selectNewestStalePokemonCache } from "../cache/stalePokemonFallback";

const API_BASE = "https://pokeapi.co/api/v2";
const responseCache = new Map<string, { value: unknown; cachedAt: string }>();

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
  const memory = responseCache.get(path);
  if (memory && isCacheFresh(memory.cachedAt)) return memory.value as T;

  const persistent = await readPersistentCache<T>(`pokeapi:${path}`);
  if (persistent && isCacheFresh(persistent.cachedAt)) {
    responseCache.set(path, persistent);
    return persistent.value;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error("Não foi possível consultar a Pokédex");

    const data = (await response.json()) as T;
    const entry = { value: data, cachedAt: new Date().toISOString() };
    responseCache.set(path, entry);
    await writePersistentCache(`pokeapi:${path}`, data);
    return data;
  } catch (error) {
    const stale = selectNewestStalePokemonCache([
      persistent
        ? { value: persistent.value, cachedAt: persistent.cachedAt, source: "indexeddb" as const }
        : null,
      memory
        ? { value: memory.value as T, cachedAt: memory.cachedAt, source: "pokeapi" as const }
        : null,
    ]);
    if (stale) {
      responseCache.set(path, { value: stale.value, cachedAt: stale.cachedAt });
      return stale.value;
    }
    throw error;
  }
}


async function resolvePokemonDetails(names: string[]): Promise<Pokemon[]> {
  const settled = await Promise.allSettled(names.map((name) => pokeApiPokemonProvider.get(name)));
  const details = settled
    .filter((result): result is PromiseFulfilledResult<Pokemon> => result.status === "fulfilled")
    .map((result) => result.value);

  if (!details.length && names.length) {
    throw new Error("Não foi possível carregar os detalhes dos Pokémon");
  }

  return details;
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

    const details = await resolvePokemonDetails(names);

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
      const direct = await this.get(normalized);
      if (!/^\d+$/.test(normalized)) return [direct];

      const dexNumber = direct.species?.url.match(/\/pokemon-species\/(\d+)\/?$/)?.[1];
      if (dexNumber === normalized) return [direct];
    } catch {
      // Continue with the catalog search below.
    }

    const summary = await fetchJson<PokemonCatalog>("/pokemon?limit=1&offset=0");
    const catalog = summary.count > 1
      ? await fetchJson<PokemonCatalog>(`/pokemon?limit=${summary.count}&offset=0`)
      : summary;

    const matches = catalog.results
      .filter(({ name, url }) => {
        const resourceId = url.split("/").filter(Boolean).pop();
        return name.includes(normalized) || resourceId === normalized;
      })
      .slice(0, 20);

    return resolvePokemonDetails(matches.map(({ name }) => name));
  },

  get(idOrName) {
    return fetchJson<Pokemon>(`/pokemon/${encodeURIComponent(String(idOrName).toLowerCase())}`);
  },
};