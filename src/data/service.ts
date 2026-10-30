import { supabase } from "../lib/supabase";
import type { Pokemon } from "./providers/contracts";

const apiBase = "https://pokeapi.co/api/v2";
const memoryCache = new Map<string, PokemonResult>();

export type DataStatus = "fresh" | "cached" | "offline" | "unavailable";

export type PokemonResult = {
  data: Pokemon;
  status: DataStatus;
  source: "supabase" | "pokeapi";
};

function normalizeKey(value: string | number) {
  return String(value).trim().toLowerCase();
}

async function fromCanonicalStore(key: string): Promise<Pokemon | null> {
  if (!supabase) return null;

  let pokemonId = Number(key);
  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    const { data: species, error: speciesError } = await supabase
      .from("pokemon_species")
      .select("dex_number")
      .eq("slug", key)
      .maybeSingle();
    if (speciesError || !species) return null;
    pokemonId = species.dex_number;
  }

  const { data, error } = await supabase
    .from("data_snapshots")
    .select("payload")
    .eq("entity_type", "pokemon")
    .eq("entity_id", String(pokemonId))
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.payload) return null;
  return data.payload as Pokemon;
}

async function fromPokeApi(key: string): Promise<Pokemon> {
  const response = await fetch(`${apiBase}/pokemon/${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error("Pokémon não encontrado");
  return (await response.json()) as Pokemon;
}

export async function getCanonicalPokemon(value: string | number): Promise<PokemonResult> {
  const key = normalizeKey(value);
  const cached = memoryCache.get(key);
  if (cached) return { ...cached, status: "cached" };

  try {
    const canonical = await fromCanonicalStore(key);
    if (canonical) {
      const result: PokemonResult = { data: canonical, status: "fresh", source: "supabase" };
      memoryCache.set(key, result);
      return result;
    }
  } catch {
    // PokéAPI remains the availability fallback when Supabase is unreachable.
  }

  const data = await fromPokeApi(key);
  const result: PokemonResult = { data, status: "fresh", source: "pokeapi" };
  memoryCache.set(key, result);
  return result;
}

export function clearCanonicalCache() {
  memoryCache.clear();
}
