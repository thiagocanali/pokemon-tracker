import { supabase } from "../lib/supabase";
import { isCacheFresh } from "./cache/freshness";
import { readPersistentCache, writePersistentCache } from "./cache/indexedDb";
import type { SourceNameRelation } from "./provenance";

export type MoveRow = {
  id: string;
  slug: string;
  names: Record<string, string>;
  type_id: string;
  category: string;
  pve_damage: number | null;
  pve_energy_delta: number | null;
  pve_duration_ms: number | null;
  pvp_damage: number | null;
  pvp_energy_delta: number | null;
  pvp_duration_turns: number | null;
  source_id: string;
  source_url: string;
  collected_at: string;
  source_updated_at: string | null;
  data_version: string | null;
  pokemon_types?: { names: Record<string, string> } | null;
  data_sources?: SourceNameRelation;
};

export type MovesCatalogResult = {
  data: MoveRow[];
  status: "fresh" | "cached" | "offline";
  cachedAt: string;
};

const CACHE_KEY = "pokego:moves";
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function getMovesCatalog(): Promise<MovesCatalogResult> {
  const cached = await readPersistentCache<MoveRow[]>(CACHE_KEY);

  if (cached && isCacheFresh(cached.cachedAt, CACHE_TTL_MS)) {
    return { data: cached.value, status: "cached", cachedAt: cached.cachedAt };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("moves")
        .select("id,slug,names,type_id,category,pve_damage,pve_energy_delta,pve_duration_ms,pvp_damage,pvp_energy_delta,pvp_duration_turns,source_id,source_url,collected_at,source_updated_at,data_version,pokemon_types(names),data_sources(name)")
        .order("slug");

      if (error) throw error;

      const rows = (data ?? []) as unknown as MoveRow[];
      const cachedAt = new Date().toISOString();
      await writePersistentCache(CACHE_KEY, rows);
      return { data: rows, status: "fresh", cachedAt };
    } catch (error) {
      if (cached) return { data: cached.value, status: "offline", cachedAt: cached.cachedAt };
      throw error;
    }
  }

  if (cached) return { data: cached.value, status: "offline", cachedAt: cached.cachedAt };
  throw new Error("Supabase indisponível e catálogo de moves sem cache local.");
}
