import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getSourceFreshness, isCacheFresh } from "../../../src/data/cache/freshness.ts";

Deno.test("cache entry is fresh inside the default TTL", () => {
  const now = Date.parse("2026-11-04T12:00:00.000Z");
  assertEquals(isCacheFresh("2026-11-04T00:00:00.000Z", undefined, now), true);
});

Deno.test("cache entry expires after the default TTL", () => {
  const now = Date.parse("2026-11-05T00:00:01.000Z");
  assertEquals(isCacheFresh("2026-11-04T00:00:00.000Z", undefined, now), false);
});

Deno.test("invalid and future timestamps are not fresh", () => {
  const now = Date.parse("2026-11-04T12:00:00.000Z");
  assertEquals(isCacheFresh("not-a-date", undefined, now), false);
  assertEquals(isCacheFresh("2026-11-04T13:00:00.000Z", undefined, now), false);
});


Deno.test("source freshness is fresh only when every record has a recent upstream timestamp", () => {
  const now = Date.parse("2026-11-08T12:00:00.000Z");
  assertEquals(
    getSourceFreshness(
      [
        { collected_at: "2026-11-08T11:00:00.000Z", source_updated_at: "2026-11-08T10:00:00.000Z" },
        { collected_at: "2026-11-08T11:30:00.000Z", source_updated_at: "2026-11-08T11:00:00.000Z" },
      ],
      24 * 60 * 60 * 1000,
      now,
    ),
    {
      status: "fresh",
      collectedAt: "2026-11-08T11:30:00.000Z",
      sourceUpdatedAt: "2026-11-08T10:00:00.000Z",
      ageMs: 2 * 60 * 60 * 1000,
    },
  );
});

Deno.test("missing upstream timestamp is unknown, not fresh", () => {
  const now = Date.parse("2026-11-08T12:00:00.000Z");
  const result = getSourceFreshness(
    [{ collected_at: "2026-11-08T11:59:00.000Z", source_updated_at: null }],
    24 * 60 * 60 * 1000,
    now,
  );
  assertEquals(result.status, "unknown");
  assertEquals(result.collectedAt, "2026-11-08T11:59:00.000Z");
  assertEquals(result.sourceUpdatedAt, null);
});

Deno.test("oldest source timestamp controls freshness", () => {
  const now = Date.parse("2026-11-08T12:00:00.000Z");
  const result = getSourceFreshness(
    [
      { collected_at: "2026-11-08T11:00:00.000Z", source_updated_at: "2026-11-08T11:30:00.000Z" },
      { collected_at: "2026-11-08T11:00:00.000Z", source_updated_at: "2026-11-07T00:00:00.000Z" },
    ],
    24 * 60 * 60 * 1000,
    now,
  );
  assertEquals(result.status, "stale");
  assertEquals(result.sourceUpdatedAt, "2026-11-07T00:00:00.000Z");
});
