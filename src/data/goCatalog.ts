import { supabase } from "../lib/supabase";
import { isCacheFresh } from "./cache/freshness";
import { readPersistentCache, writePersistentCache } from "./cache/indexedDb";
import type { SourceNameRelation } from "./provenance";

export type EventRow = {
  id: string;
  slug: string;
  names: Record<string, string>;
  description: Record<string, string> | null;
  starts_at: string;
  ends_at: string;
  timezone: string | null;
  source_id: string;
  source_url: string;
  collected_at: string;
  source_updated_at: string | null;
  data_version: string | null;
  data_sources?: SourceNameRelation;
};

export type SeasonRow = {
  id: string;
  names: Record<string, string>;
  starts_at: string;
  ends_at: string;
  source_id: string;
  source_url: string;
  collected_at: string;
  source_updated_at: string | null;
  data_version: string | null;
  data_sources?: SourceNameRelation;
};

export type RaidBoss = {
  tier: string;
  pokemon_forms: {
    slug: string;
    names: Record<string, string>;
    pokemon_species: { names: Record<string, string>; dex_number: number } | null;
  } | null;
};

export type RaidRotation = {
  id: string;
  starts_at: string;
  ends_at: string;
  source_id: string;
  source_url: string;
  collected_at: string;
  source_updated_at: string | null;
  data_version: string | null;
  data_sources?: SourceNameRelation;
  raid_rotation_bosses: RaidBoss[];
};

export type GoCatalogStatus = "fresh" | "cached" | "offline";

export type GoCatalogResult<T> = {
  data: T;
  status: GoCatalogStatus;
  cachedAt: string;
};

const EVENT_CACHE_KEY = "pokego:events-and-seasons";
const RAID_CACHE_KEY = "pokego:raid-rotations";
const EVENT_TTL_MS = 15 * 60 * 1000;
const RAID_TTL_MS = 5 * 60 * 1000;

async function loadWithPersistentFallback<T>(
  key: string,
  ttlMs: number,
  fetchData: () => Promise<T>,
): Promise<GoCatalogResult<T>> {
  const cached = await readPersistentCache<T>(key);

  if (cached && isCacheFresh(cached.cachedAt, ttlMs)) {
    return { data: cached.value, status: "cached", cachedAt: cached.cachedAt };
  }

  try {
    const data = await fetchData();
    const cachedAt = new Date().toISOString();
    await writePersistentCache(key, data);
    return { data, status: "fresh", cachedAt };
  } catch (error) {
    if (cached) {
      return { data: cached.value, status: "offline", cachedAt: cached.cachedAt };
    }
    throw error;
  }
}

export function getEventsAndSeasons(now = new Date()): Promise<{
  events: GoCatalogResult<EventRow[]>;
  seasons: GoCatalogResult<SeasonRow[]>;
}> {
  if (!supabase) {
    return Promise.all([
      readPersistentCache<EventRow[]>(EVENT_CACHE_KEY),
      readPersistentCache<SeasonRow[]>(EVENT_CACHE_KEY + ":seasons"),
    ]).then(([events, seasons]) => {
      if (!events || !seasons) throw new Error("Supabase indisponível e calendário sem cache local.");
      return {
        events: { data: events.value, status: "offline", cachedAt: events.cachedAt },
        seasons: { data: seasons.value, status: "offline", cachedAt: seasons.cachedAt },
      };
    });
  }

  const client = supabase;
  const cutoff = now.toISOString();
  return Promise.all([
    loadWithPersistentFallback(EVENT_CACHE_KEY, EVENT_TTL_MS, async () => {
      const { data, error } = await client.from("events")
        .select("id,slug,names,description,starts_at,ends_at,timezone,source_id,source_url,collected_at,source_updated_at,data_version,data_sources(name)")
        .gte("ends_at", cutoff).order("starts_at").limit(30);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    }),
    loadWithPersistentFallback(EVENT_CACHE_KEY + ":seasons", EVENT_TTL_MS, async () => {
      const { data, error } = await client.from("seasons")
        .select("id,names,starts_at,ends_at,source_id,source_url,collected_at,source_updated_at,data_version,data_sources(name)")
        .gte("ends_at", cutoff).order("starts_at").limit(10);
      if (error) throw error;
      return (data ?? []) as SeasonRow[];
    }),
  ]).then(([events, seasons]) => ({ events, seasons }));
}

export function getRaidRotations(now = new Date()): Promise<GoCatalogResult<RaidRotation[]>> {
  if (!supabase) {
    return readPersistentCache<RaidRotation[]>(RAID_CACHE_KEY).then((cached) => {
      if (!cached) throw new Error("Supabase indisponível e rotações sem cache local.");
      return { data: cached.value, status: "offline", cachedAt: cached.cachedAt };
    });
  }

  const client = supabase;
  const cutoff = now.toISOString();
  return loadWithPersistentFallback(RAID_CACHE_KEY, RAID_TTL_MS, async () => {
    const { data, error } = await client.from("raid_rotations")
      .select("id,starts_at,ends_at,source_id,source_url,collected_at,source_updated_at,data_version,data_sources(name),raid_rotation_bosses(tier,pokemon_forms(slug,names,pokemon_species(names,dex_number)))")
      .gte("ends_at", cutoff).order("starts_at").limit(20);
    if (error) throw error;
    return (data ?? []) as unknown as RaidRotation[];
  });
}
