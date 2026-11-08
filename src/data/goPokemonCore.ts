import { supabase } from "../lib/supabase";
import { getSourceFreshness, isCacheFresh, type SourceFreshness } from "./cache/freshness";
import { readPersistentCache, writePersistentCache } from "./cache/indexedDb";
import type { PokemonTypeId } from "./model";

export type GoPokemonCore = {
  formId: string;
  speciesId: string;
  dexNumber: number;
  formSlug: string;
  speciesSlug: string;
  names: Record<string, string>;
  variant: string;
  isDefault: boolean;
  availability: "available" | "unavailable" | "unknown";
  types: Array<{ id: PokemonTypeId; slot: number; names: Record<string, string> }>;
  stats: {
    attack: number;
    defense: number;
    stamina: number;
    maxCp: number | null;
    provenance: {
      sourceId: string;
      sourceUrl: string;
      collectedAt: string;
      sourceUpdatedAt: string | null;
      dataVersion: string | null;
      confidence: number | null;
    };
  } | null;
  provenance: {
    sourceId: string;
    sourceUrl: string;
    collectedAt: string;
    sourceUpdatedAt: string | null;
    dataVersion: string | null;
    confidence: number | null;
  };
};

export type GoPokemonCoreResult = {
  data: GoPokemonCore[];
  status: "fresh" | "cached" | "offline" | "unavailable";
  cachedAt: string;
  sourceFreshness: SourceFreshness;
  statsSourceFreshness: SourceFreshness;
};

const CACHE_PREFIX = "pokego:core:";
const CACHE_TTL_MS = 30 * 60 * 1000;
const SOURCE_FRESHNESS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function cacheKey(query: string, dexNumber?: number) {
  return `${CACHE_PREFIX}${query.trim().toLowerCase()}:${dexNumber ?? "all"}`;
}

function mapRow(row: any): GoPokemonCore {
  const species = row.pokemon_species;
  return {
    formId: row.id,
    speciesId: row.species_id,
    dexNumber: species.dex_number,
    formSlug: row.slug,
    speciesSlug: species.slug,
    names: row.names ?? {},
    variant: row.variant,
    isDefault: row.is_default,
    availability: row.availability,
    types: (row.pokemon_form_types ?? []).map((item: any) => ({
      id: item.type_id as PokemonTypeId,
      slot: item.slot,
      names: item.pokemon_types?.names ?? {},
    })),
    stats: row.pokemon_go_stats
      ? {
          attack: row.pokemon_go_stats.attack,
          defense: row.pokemon_go_stats.defense,
          stamina: row.pokemon_go_stats.stamina,
          maxCp: row.pokemon_go_stats.max_cp,
          provenance: {
            sourceId: row.pokemon_go_stats.source_id,
            sourceUrl: row.pokemon_go_stats.source_url,
            collectedAt: row.pokemon_go_stats.collected_at,
            sourceUpdatedAt: row.pokemon_go_stats.source_updated_at,
            dataVersion: row.pokemon_go_stats.data_version,
            confidence: row.pokemon_go_stats.confidence,
          },
        }
      : null,
    provenance: {
      sourceId: row.source_id,
      sourceUrl: row.source_url,
      collectedAt: row.collected_at,
      sourceUpdatedAt: row.source_updated_at,
      dataVersion: row.data_version,
      confidence: row.confidence,
    },
  };
}

function createCoreQuery() {
  if (!supabase) throw new Error("Supabase indisponível para o núcleo de dados Pokémon GO.");

  return supabase
    .from("pokemon_forms")
    .select(
      "id,species_id,slug,names,variant,is_default,availability,source_id,source_url,collected_at,source_updated_at,data_version,confidence,pokemon_species!inner(dex_number,slug),pokemon_form_types(slot,type_id,pokemon_types(names)),pokemon_go_stats(attack,defense,stamina,max_cp,source_id,source_url,collected_at,source_updated_at,data_version,confidence)",
    )
    .order("species_id")
    .order("is_default", { ascending: false })
    .limit(100);
}

async function fetchCore(query: string, dexNumber?: number): Promise<GoPokemonCore[]> {
  if (!supabase) throw new Error("Supabase indisponível para o núcleo de dados Pokémon GO.");

  if (dexNumber !== undefined) {
    const { data, error } = await createCoreQuery().eq("pokemon_species.dex_number", dexNumber);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    const { data, error } = await createCoreQuery();
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  // PostgREST cannot OR filters across the parent table and an embedded relation.
  // Query each indexed slug independently, then merge by canonical form ID.
  const pattern = `%${normalizedQuery.replace(/[\\\\%_]/g, "\\\\$&")}%`;
  const [formResult, speciesResult] = await Promise.all([
    createCoreQuery().ilike("slug", pattern),
    createCoreQuery().ilike("pokemon_species.slug", pattern),
  ]);

  if (formResult.error) throw formResult.error;
  if (speciesResult.error) throw speciesResult.error;

  const unique = new Map<string, any>();
  for (const row of [...(formResult.data ?? []), ...(speciesResult.data ?? [])]) {
    unique.set(row.id, row);
  }
  return [...unique.values()].map(mapRow);
}

export async function getGoPokemonCore(
  query = "",
  dexNumber?: number,
): Promise<GoPokemonCoreResult> {
  const key = cacheKey(query, dexNumber);
  const cached = await readPersistentCache<GoPokemonCore[]>(key);

  if (cached && isCacheFresh(cached.cachedAt, CACHE_TTL_MS)) {
    return { data: cached.value, status: "cached", cachedAt: cached.cachedAt, sourceFreshness: getSourceFreshness(cached.value.map((item) => item.provenance), SOURCE_FRESHNESS_MAX_AGE_MS), statsSourceFreshness: getSourceFreshness(cached.value.flatMap((item) => item.stats ? [item.stats.provenance] : []), SOURCE_FRESHNESS_MAX_AGE_MS) };
  }

  try {
    const data = await fetchCore(query, dexNumber);
    const cachedAt = new Date().toISOString();
    await writePersistentCache(key, data);
    return { data, status: "fresh", cachedAt, sourceFreshness: getSourceFreshness(data.map((item) => item.provenance), SOURCE_FRESHNESS_MAX_AGE_MS), statsSourceFreshness: getSourceFreshness(data.flatMap((item) => item.stats ? [item.stats.provenance] : []), SOURCE_FRESHNESS_MAX_AGE_MS) };
  } catch (error) {
    if (cached) return { data: cached.value, status: "offline", cachedAt: cached.cachedAt, sourceFreshness: getSourceFreshness(cached.value.map((item) => item.provenance), SOURCE_FRESHNESS_MAX_AGE_MS), statsSourceFreshness: getSourceFreshness(cached.value.flatMap((item) => item.stats ? [item.stats.provenance] : []), SOURCE_FRESHNESS_MAX_AGE_MS) };
    if (supabase) throw error;
    return { data: [], status: "unavailable", cachedAt: new Date(0).toISOString(), sourceFreshness: getSourceFreshness([], SOURCE_FRESHNESS_MAX_AGE_MS), statsSourceFreshness: getSourceFreshness([], SOURCE_FRESHNESS_MAX_AGE_MS) };
  }
}

export async function getGoPokemonForm(
  formSlug: string,
): Promise<GoPokemonCore | null> {
  const result = await getGoPokemonCore(formSlug);
  return result.data.find((form) => form.formSlug === formSlug.trim().toLowerCase()) ?? null;
}
