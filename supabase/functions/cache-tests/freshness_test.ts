import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isCacheFresh } from "../../../src/data/cache/freshness.ts";

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
