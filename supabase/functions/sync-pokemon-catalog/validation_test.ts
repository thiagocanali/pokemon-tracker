import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseSyncPagination } from "./validation.ts";

Deno.test("uses defaults for an empty object", () => {
  assertEquals(parseSyncPagination({}), { ok: true, value: { offset: 0, limit: 20 } });
});

Deno.test("accepts valid pagination boundaries", () => {
  assertEquals(parseSyncPagination({ offset: 10, limit: 25 }), {
    ok: true, value: { offset: 10, limit: 25 },
  });
  assertEquals(parseSyncPagination({ offset: 0, limit: 1 }), {
    ok: true, value: { offset: 0, limit: 1 },
  });
});

Deno.test("rejects negative, fractional and unsafe offsets", () => {
  for (const offset of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2", null]) {
    assertEquals(parseSyncPagination({ offset }).ok, false);
  }
});

Deno.test("rejects limits outside 1..25 and non-integers", () => {
  for (const limit of [0, -1, 26, 1.2, "10", null]) {
    assertEquals(parseSyncPagination({ limit }).ok, false);
  }
});

Deno.test("rejects non-object JSON values and arrays", () => {
  for (const body of [null, [], "{}", 1, true]) {
    assertEquals(parseSyncPagination(body).ok, false);
  }
});
