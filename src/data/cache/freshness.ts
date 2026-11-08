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


export type SourceFreshnessStatus = "fresh" | "stale" | "unknown";

export type SourceFreshness = {
  status: SourceFreshnessStatus;
  collectedAt: string | null;
  sourceUpdatedAt: string | null;
  ageMs: number | null;
};

export type SourceFreshnessRecord = {
  collected_at: string | null;
  source_updated_at: string | null;
};

export function getSourceFreshness(
  records: SourceFreshnessRecord[],
  maxAgeMs: number,
  now = Date.now(),
): SourceFreshness {
  if (!records.length || !Number.isFinite(now) || maxAgeMs < 0) {
    return { status: "unknown", collectedAt: null, sourceUpdatedAt: null, ageMs: null };
  }

  const collectedTimestamps = records
    .map((record) => Date.parse(record.collected_at ?? ""))
    .filter(Number.isFinite);
  const latestCollectedAt = collectedTimestamps.length
    ? new Date(Math.max(...collectedTimestamps)).toISOString()
    : null;

  const sourceTimestamps = records.map((record) =>
    record.source_updated_at ? Date.parse(record.source_updated_at) : NaN
  );

  if (sourceTimestamps.some((timestamp) => !Number.isFinite(timestamp))) {
    return {
      status: "unknown",
      collectedAt: latestCollectedAt,
      sourceUpdatedAt: null,
      ageMs: null,
    };
  }

  const oldestSourceUpdatedAt = Math.min(...sourceTimestamps);
  const ageMs = now - oldestSourceUpdatedAt;

  if (ageMs < 0) {
    return {
      status: "unknown",
      collectedAt: latestCollectedAt,
      sourceUpdatedAt: new Date(oldestSourceUpdatedAt).toISOString(),
      ageMs: null,
    };
  }

  return {
    status: ageMs <= maxAgeMs ? "fresh" : "stale",
    collectedAt: latestCollectedAt,
    sourceUpdatedAt: new Date(oldestSourceUpdatedAt).toISOString(),
    ageMs,
  };
}
