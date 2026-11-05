export type StalePokemonCacheSource = "supabase" | "indexeddb" | "pokeapi";

export type StalePokemonCacheEntry<T> = {
  value: T;
  cachedAt: string;
  source: StalePokemonCacheSource;
};

/**
 * Selects the newest usable stale copy across persistence layers.
 * Invalid timestamps are excluded because their relative freshness is unknown.
 */
export function selectNewestStalePokemonCache<T>(
  candidates: Array<StalePokemonCacheEntry<T> | null | undefined>,
): StalePokemonCacheEntry<T> | null {
  return candidates
    .filter((candidate): candidate is StalePokemonCacheEntry<T> => {
      return Boolean(candidate && Number.isFinite(Date.parse(candidate.cachedAt)));
    })
    .sort((a, b) => Date.parse(b.cachedAt) - Date.parse(a.cachedAt))[0] ?? null;
}
