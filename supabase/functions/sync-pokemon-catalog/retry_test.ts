import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fetchWithRetry, getRetryDelayMs, parseRetryAfterMs } from "./retry.ts";

Deno.test("Retry-After parses delta seconds", () => {
  assertEquals(parseRetryAfterMs("2", 1_000), 2_000);
});

Deno.test("Retry-After parses HTTP dates relative to the supplied clock", () => {
  assertEquals(parseRetryAfterMs(new Date(5_000).toUTCString(), 1_000), 4_000);
  assertEquals(parseRetryAfterMs(new Date(500).toUTCString(), 1_000), 0);
});

Deno.test("Retry-After rejects malformed values and caps excessive waits", () => {
  assertEquals(parseRetryAfterMs("not-a-date", 1_000), null);
  assertEquals(parseRetryAfterMs("999", 1_000, 5_000), 5_000);
});

Deno.test("exponential backoff uses full jitter within the attempt cap", () => {
  assertEquals(getRetryDelayMs(0, null, { random: () => 0.5 }), 150);
  assertEquals(getRetryDelayMs(2, null, { random: () => 0.5 }), 600);
  assertEquals(getRetryDelayMs(20, null, { random: () => 0.5 }), 5_000);
});

Deno.test("Retry-After takes precedence over a shorter jittered delay", () => {
  assertEquals(getRetryDelayMs(0, "2", { nowMs: 1_000, random: () => 0 }), 2_000);
});

Deno.test("HTTP retries respect Retry-After before the next request", async () => {
  const delays: number[] = [];
  let calls = 0;
  const response = await fetchWithRetry("https://fixture.invalid/resource", {
    fetcher: async () => {
      calls += 1;
      return calls === 1
        ? new Response(null, { status: 429, headers: { "Retry-After": "2" } })
        : new Response("ok", { status: 200 });
    },
    wait: async (milliseconds) => { delays.push(milliseconds); },
    nowMs: 1_000,
    random: () => 0,
  });

  assertEquals(response.status, 200);
  assertEquals(calls, 2);
  assertEquals(delays, [2_000]);
});

Deno.test("network failures retry with jitter and eventually return the response", async () => {
  const delays: number[] = [];
  let calls = 0;
  const response = await fetchWithRetry("https://fixture.invalid/resource", {
    fetcher: async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary network failure");
      return new Response("ok");
    },
    wait: async (milliseconds) => { delays.push(milliseconds); },
    random: () => 0.5,
  });

  assertEquals(response.status, 200);
  assertEquals(calls, 2);
  assertEquals(delays, [150]);
});

Deno.test("non-retryable responses return immediately", async () => {
  const delays: number[] = [];
  let calls = 0;
  const response = await fetchWithRetry("https://fixture.invalid/resource", {
    fetcher: async () => {
      calls += 1;
      return new Response("not found", { status: 404 });
    },
    wait: async (milliseconds) => { delays.push(milliseconds); },
  });

  assertEquals(response.status, 404);
  assertEquals(calls, 1);
  assertEquals(delays, []);
});

Deno.test("network failures stop after the configured retry budget", async () => {
  let calls = 0;
  await assertRejects(
    () => fetchWithRetry("https://fixture.invalid/resource", {
      fetcher: async () => {
        calls += 1;
        throw new Error("network unavailable");
      },
      wait: async () => {},
      maxRetries: 2,
      random: () => 0,
    }),
    Error,
    "network unavailable",
  );
  assertEquals(calls, 3);
});
