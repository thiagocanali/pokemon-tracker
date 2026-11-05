import { supabase } from "../lib/supabase";
import type { Pokemon } from "./providers/contracts";
import { readPersistentCache, writePersistentCache } from "./cache/indexedDb";
import { isCacheFresh } from "./cache/freshness";

const apiBase = "https://pokeapi.co/api/v2";
const memoryCache = new Map<string, { result: PokemonResult; cachedAt: string }>();

export type DataStatus = "fresh" | "cached" | "offline" | "unavailable";

export type PokemonResult = {
  data: Pokemon;
  status: DataStatus;
  source: "supabase" | "indexeddb" | "pokeapi";
};

type CanonicalSnapshot = {
  payload: Pokemon;
  capturedAt: string;
};

function normalizeKey(value: string | number) {
  return String(value).trim().toLowerCase();
}

async function fromCanonicalStore(key: string): Promise<CanonicalSnapshot | null> {
  if (!supabase) return null;

  let pokemonId = Number(key);
  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    // Resolve a form slug first so alternate forms do not fall back to the species default.
    const { data: form } = await supabase
      .from("pokemon_forms")
      .select("id")
      .eq("slug", key)
      .maybeSingle();

    const formPokemonId = form?.id.startsWith("form-") ? Number(form.id.slice(5)) : NaN;
    if (Number.isInteger(formPokemonId) && formPokemonId > 0) {
      pokemonId = formPokemonId;
    } else {
      const { data: species, error: speciesError } = await supabase
        .from("pokemon_species")
        .select("dex_number")
        .eq("slug", key)
        .maybeSingle();
      if (speciesError || !species) return null;
      pokemonId = species.dex_number;
    }
  }

  const { data, error } = await supabase
    .from("data_snapshots")
    .select("payload,captured_at")
    .eq("entity_type", "pokemon")
    .eq("entity_id", String(pokemonId))
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.payload || typeof data.captured_at !== "string") return null;
  return {
    payload: data.payload as Pokemon,
    capturedAt: data.captured_at,
  };
}

async function fromPokeApi(key: string): Promise<Pokemon> {
  const response = await fetch(`${apiBase}/pokemon/${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error("Pokémon não encontrado");
  return (await response.json()) as Pokemon;
}

export async function getCanonicalPokemon(value: string | number): Promise<PokemonResult> {
  const key = normalizeKey(value);
  const cached = memoryCache.get(key);

  if (cached && isCacheFresh(cached.cachedAt)) {
    return { ...cached.result, status: "cached" };
  }

  let canonical: CanonicalSnapshot | null = null;

  try {
    canonical = await fromCanonicalStore(key);

    if (canonical && isCacheFresh(canonical.capturedAt)) {
      const result: PokemonResult = {
        data: canonical.payload,
        status: "fresh",
        source: "supabase",
      };
      memoryCache.set(key, { result, cachedAt: canonical.capturedAt });
      return result;
    }
  } catch {
    // PokéAPI and persistent caches remain availability fallbacks.
  }

  const persistent = await readPersistentCache<Pokemon>(`pokemon:${key}`);
  if (persistent && isCacheFresh(persistent.cachedAt)) {
    const result: PokemonResult = {
      data: persistent.value,
      status: "cached",
      source: "indexeddb",
    };
    memoryCache.set(key, { result, cachedAt: persistent.cachedAt });
    return result;
  }

  try {
    const data = await fromPokeApi(key);
    await writePersistentCache(`pokemon:${key}`, data);
    const result: PokemonResult = { data, status: "fresh", source: "pokeapi" };
    memoryCache.set(key, { result, cachedAt: new Date().toISOString() });
    return result;
  } catch (error) {
    const stale = persistent
      ? { value: persistent.value, cachedAt: persistent.cachedAt, source: "indexeddb" as const }
      : canonical
        ? { value: canonical.payload, cachedAt: canonical.capturedAt, source: "supabase" as const }
        : cached
          ? { value: cached.result.data, cachedAt: cached.cachedAt, source: cached.result.source }
          : null;

    if (stale) {
      const result: PokemonResult = {
        data: stale.value,
        status: "offline",
        source: stale.source,
      };
      memoryCache.set(key, { result, cachedAt: stale.cachedAt });
      return result;
    }

    throw error;
  }
}

export function clearCanonicalCache() {
  memoryCache.clear();
}
