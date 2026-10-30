import { supabase } from "../lib/supabase";
import type { Pokemon } from "./providers/contracts";

const apiBase = "https://pokeapi.co/api/v2";
const memoryCache = new Map<string, Pokemon>();

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
  const query = Number.isInteger(Number(key))
    ? supabase.from("pokemon_records").select("payload").eq("id", Number(key)).maybeSingle()
    : supabase.from("pokemon_records").select("payload").ilike("name", key).maybeSingle();
  const { data, error } = await query;
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
  if (cached) return { data: cached, status: "cached", source: "pokeapi" };

  try {
    const canonical = await fromCanonicalStore(key);
    if (canonical) {
      memoryCache.set(key, canonical);
      return { data: canonical, status: "fresh", source: "supabase" };
    }
  } catch {
    // The external provider remains the availability fallback.
  }

  try {
    const data = await fromPokeApi(key);
    memoryCache.set(key, data);
    return { data, status: "fresh", source: "pokeapi" };
  } catch (error) {
    if (cached) return { data: cached, status: "offline", source: "pokeapi" };
    throw error;
  }
}

export function clearCanonicalCache() {
  memoryCache.clear();
}
