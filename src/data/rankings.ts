import { supabase } from "../lib/supabase";
import { getSourceFreshness, isCacheFresh, type SourceFreshness } from "./cache/freshness";
import { readPersistentCache, writePersistentCache } from "./cache/indexedDb";
import type { SourceNameRelation } from "./provenance";

export type BattleRanking = {
  id: number;
  mode: "pve" | "pvp";
  league: string | null;
  rank: number;
  rating: number | null;
  source_id: string;
  source_url: string;
  collected_at: string;
  data_version: string | null;
  data_sources?: SourceNameRelation;
  battle_ranking_moves?: {
    slot: number;
    moves: { names: Record<string, string>; slug: string } | null;
  }[];
};

export type RankingsResult = {
  data: BattleRanking[];
  status: "fresh" | "cached" | "offline";
  cachedAt: string;
  sourceFreshness: SourceFreshness;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const SOURCE_FRESHNESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cacheKey(pokemonId: number, mode: "pve" | "pvp") {
  return `pokego:rankings:${pokemonId}:${mode}`;
}

export async function getBattleRankings(
  pokemonId: number,
  mode: "pve" | "pvp",
): Promise<RankingsResult> {
  const key = cacheKey(pokemonId, mode);
  const cached = await readPersistentCache<BattleRanking[]>(key);

  if (cached && isCacheFresh(cached.cachedAt, CACHE_TTL_MS)) {
    return { data: cached.value, status: "cached", cachedAt: cached.cachedAt, sourceFreshness: getSourceFreshness(cached.value.map((row) => ({ collected_at: row.collected_at, source_updated_at: null })), SOURCE_FRESHNESS_MAX_AGE_MS) };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("battle_rankings")
        .select(
          "id,mode,league,rank,rating,source_id,source_url,collected_at,data_version,data_sources(name),battle_ranking_moves(slot,moves(names,slug)),pokemon_forms!inner(species_id)",
        )
        .eq("pokemon_forms.species_id", `species-${pokemonId}`)
        .eq("mode", mode)
        .order("rank")
        .limit(10);

      if (error) throw error;

      const rows = (data ?? []) as unknown as BattleRanking[];
      const cachedAt = new Date().toISOString();
      await writePersistentCache(key, rows);
      return { data: rows, status: "fresh", cachedAt, sourceFreshness: getSourceFreshness(rows.map((row) => ({ collected_at: row.collected_at, source_updated_at: null })), SOURCE_FRESHNESS_MAX_AGE_MS) };
    } catch (error) {
      if (cached) return { data: cached.value, status: "offline", cachedAt: cached.cachedAt, sourceFreshness: getSourceFreshness(cached.value, SOURCE_FRESHNESS_MAX_AGE_MS) };
      throw error;
    }
  }

  if (cached) return { data: cached.value, status: "offline", cachedAt: cached.cachedAt };
  throw new Error("Supabase indisponível e rankings sem cache local.");
}
