import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selectNewestStalePokemonCache } from "../../../src/data/cache/stalePokemonFallback.ts";

Deno.test("selects the newest stale snapshot regardless of storage priority", () => {
  const selected = selectNewestStalePokemonCache([
    { value: "older local copy", cachedAt: "2026-11-01T10:00:00.000Z", source: "indexeddb" },
    { value: "newer canonical copy", cachedAt: "2026-11-03T10:00:00.000Z", source: "supabase" },
  ]);

  assertEquals(selected?.value, "newer canonical copy");
  assertEquals(selected?.source, "supabase");
});

Deno.test("ignores cache entries with invalid timestamps", () => {
  const selected = selectNewestStalePokemonCache([
    { value: "unknown age", cachedAt: "invalid", source: "indexeddb" },
    { value: "known age", cachedAt: "2026-11-03T10:00:00.000Z", source: "supabase" },
  ]);

  assertEquals(selected?.value, "known age");
});

Deno.test("returns null when no cache has a valid timestamp", () => {
  assertEquals(selectNewestStalePokemonCache([
    { value: "invalid", cachedAt: "invalid", source: "indexeddb" },
    null,
    undefined,
  ]), null);
});
