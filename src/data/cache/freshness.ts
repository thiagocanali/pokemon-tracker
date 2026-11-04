export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function isCacheFresh(
  cachedAt: string,
  ttlMs = DEFAULT_CACHE_TTL_MS,
  now = Date.now(),
): boolean {
  const timestamp = Date.parse(cachedAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || ttlMs < 0) return false;
  const age = now - timestamp;
  return age >= 0 && age <= ttlMs;
}
