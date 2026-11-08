import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parsePoGoApiFastMoves, unwrapPoGoApiValidation } from "./validation.ts";

// These are synthetic contract examples for validator tests, not captured game data.
const validFastMoves = [
  {
    move_id: 1,
    name: "Test Fast Move",
    type: "grass",
    power: 5,
    energy_delta: 6,
    duration: 1,
    stamina_loss_scaler: 0.01,
  },
];

Deno.test("accepts a valid PoGoAPI PvE fast-move contract", () => {
  assertEquals(parsePoGoApiFastMoves(validFastMoves), { ok: true, value: validFastMoves });
});

Deno.test("rejects empty, null and non-array payloads", () => {
  for (const payload of [null, {}, [], "[]"]) {
    assertEquals(parsePoGoApiFastMoves(payload).ok, false);
  }
});

Deno.test("rejects invalid move identity, name and type", () => {
  for (const patch of [
    { move_id: 0 },
    { move_id: 1.5 },
    { move_id: Number.MAX_SAFE_INTEGER + 1 },
    { name: "" },
    { type: "unknown" },
  ]) {
    assertEquals(parsePoGoApiFastMoves([{ ...validFastMoves[0], ...patch }]).ok, false);
  }
});

Deno.test("rejects invalid combat values and non-finite numbers", () => {
  for (const patch of [
    { power: -1 },
    { power: Number.NaN },
    { energy_delta: Number.POSITIVE_INFINITY },
    { duration: 0 },
    { duration: -1 },
    { stamina_loss_scaler: -0.1 },
  ]) {
    assertEquals(parsePoGoApiFastMoves([{ ...validFastMoves[0], ...patch }]).ok, false);
  }
});

Deno.test("rejects duplicate move IDs instead of silently overwriting", () => {
  assertEquals(parsePoGoApiFastMoves([validFastMoves[0], validFastMoves[0]]).ok, false);
});

Deno.test("preserves negative energy deltas and optional future fields are ignored", () => {
  const payload = [{ ...validFastMoves[0], energy_delta: -8, future_field: "ignored" }];
  const result = parsePoGoApiFastMoves(payload);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value[0].energy_delta, -8);
});

Deno.test("unwrap throws the validation error", () => {
  assertThrows(
    () => unwrapPoGoApiValidation(parsePoGoApiFastMoves([])),
    Error,
    "non-empty array",
  );
});
