const POKEMON_TYPES = new Set([
  "bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying",
  "ghost", "grass", "ground", "ice", "normal", "poison", "psychic", "rock",
  "steel", "water",
]);

export type PoGoApiFastMove = {
  move_id: number;
  name: string;
  type: string;
  power: number;
  energy_delta: number;
  duration: number;
  stamina_loss_scaler: number;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function fail<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

export function parsePoGoApiFastMoves(value: unknown): ValidationResult<PoGoApiFastMove[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return fail("PoGoAPI fast moves payload must be a non-empty array.");
  }

  const ids = new Set<number>();
  const moves: PoGoApiFastMove[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)
      || !Number.isSafeInteger(item.move_id)
      || (item.move_id as number) <= 0
      || typeof item.name !== "string"
      || item.name.trim().length === 0
      || typeof item.type !== "string"
      || !POKEMON_TYPES.has(item.type)
      || !isFiniteNumber(item.power)
      || item.power < 0
      || !isFiniteNumber(item.energy_delta)
      || !isFiniteNumber(item.duration)
      || item.duration <= 0
      || !isFiniteNumber(item.stamina_loss_scaler)
      || item.stamina_loss_scaler < 0) {
      return fail(`PoGoAPI fast move at index ${index} has an invalid shape.`);
    }

    const moveId = item.move_id as number;
    if (ids.has(moveId)) {
      return fail(`PoGoAPI fast moves contains duplicate move_id ${moveId}.`);
    }
    ids.add(moveId);

    moves.push({
      move_id: moveId,
      name: item.name,
      type: item.type,
      power: item.power,
      energy_delta: item.energy_delta,
      duration: item.duration,
      stamina_loss_scaler: item.stamina_loss_scaler,
    });
  }

  return { ok: true, value: moves };
}

export function unwrapPoGoApiValidation<T>(result: ValidationResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
