export const MAX_BATCH_SIZE = 25;
export const DEFAULT_BATCH_SIZE = 20;
const POKEAPI_ORIGIN = "https://pokeapi.co";
const POKEMON_TYPES = new Set([
  "bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying",
  "ghost", "grass", "ground", "ice", "normal", "poison", "psychic", "rock",
  "steel", "water",
]);

export type SyncPagination = { offset: number; limit: number };
export type PaginationResult =
  | { ok: true; value: SyncPagination }
  | { ok: false; error: string };

export type PokemonListEntry = { name: string; url: string };
export type PokemonList = { count: number; results: PokemonListEntry[] };

export type PokemonResource = Record<string, unknown> & {
  id: number;
  name: string;
  types: { slot: number; type: { name: string } }[];
  species: { name: string; url: string };
};

export type PokemonSpeciesResource = {
  id: number;
  name: string;
  names: { language: { name: string }; name: string }[];
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  generation: { name: string } | null;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function fail<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function success<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function resourceIdFromUrl(value: unknown, resource: "pokemon" | "pokemon-species"): number | null {
  if (!isNonEmptyString(value)) return null;
  try {
    const url = new URL(value);
    if (url.origin !== POKEAPI_ORIGIN || url.search || url.hash) return null;
    const match = url.pathname.match(new RegExp(`^/api/v2/${resource}/([1-9]\\d*)/?$`));
    if (!match) return null;
    const id = Number(match[1]);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function parseSyncPagination(body: unknown): PaginationResult {
  if (!isRecord(body)) return { ok: false, error: "Request body must be a JSON object." };

  const offset = body.offset === undefined ? 0 : body.offset;
  const limit = body.limit === undefined ? DEFAULT_BATCH_SIZE : body.limit;

  if (!Number.isSafeInteger(offset) || (offset as number) < 0) {
    return { ok: false, error: "offset must be a non-negative safe integer." };
  }

  if (!Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > MAX_BATCH_SIZE) {
    return { ok: false, error: `limit must be an integer between 1 and ${MAX_BATCH_SIZE}.` };
  }

  return { ok: true, value: { offset: offset as number, limit: limit as number } };
}

export function parsePokemonList(value: unknown): ValidationResult<PokemonList> {
  if (!isRecord(value) || !Number.isSafeInteger(value.count) || (value.count as number) < 0
    || !Array.isArray(value.results)) {
    return fail("PokéAPI Pokémon list has an invalid shape.");
  }

  const results: PokemonListEntry[] = [];
  for (const [index, item] of value.results.entries()) {
    if (!isRecord(item) || !isNonEmptyString(item.name)) {
      return fail(`PokéAPI Pokémon list entry ${index} has no valid name.`);
    }
    const id = resourceIdFromUrl(item.url, "pokemon");
    if (id === null) return fail(`PokéAPI Pokémon list entry ${index} has an invalid resource URL.`);
    results.push({ name: item.name, url: item.url as string });
  }

  if (results.length > (value.count as number)) {
    return fail("PokéAPI Pokémon list contains more results than its declared count.");
  }
  return success({ count: value.count as number, results });
}

export function parsePokemonResource(
  value: unknown,
  expected?: PokemonListEntry,
): ValidationResult<PokemonResource> {
  if (!isRecord(value) || !isPositiveSafeInteger(value.id) || !isNonEmptyString(value.name)
    || !isRecord(value.species) || !isNonEmptyString(value.species.name)
    || !Array.isArray(value.types) || value.types.length < 1) {
    return fail("PokéAPI Pokémon resource has an invalid shape.");
  }

  if (expected) {
    const expectedId = resourceIdFromUrl(expected.url, "pokemon");
    if (value.name !== expected.name || value.id !== expectedId) {
      return fail("PokéAPI Pokémon resource does not match the requested list entry.");
    }
  }

  const speciesId = resourceIdFromUrl(value.species.url, "pokemon-species");
  if (speciesId === null) return fail("PokéAPI Pokémon resource has an invalid species URL.");

  const slots = new Set<number>();
  for (const [index, item] of value.types.entries()) {
    if (!isRecord(item) || ![1, 2].includes(item.slot as number)
      || !isRecord(item.type) || !isNonEmptyString(item.type.name)
      || !POKEMON_TYPES.has(item.type.name)) {
      return fail(`PokéAPI Pokémon type at slot ${index} is invalid.`);
    }
    if (slots.has(item.slot as number)) return fail("PokéAPI Pokémon resource contains duplicate type slots.");
    slots.add(item.slot as number);
  }

  return success(value as PokemonResource);
}

export function parsePokemonSpeciesResource(
  value: unknown,
  expected?: { name: string; url: string },
): ValidationResult<PokemonSpeciesResource> {
  if (!isRecord(value) || !isPositiveSafeInteger(value.id) || !isNonEmptyString(value.name)
    || !Array.isArray(value.names) || !Array.isArray(value.genera)
    || !Array.isArray(value.flavor_text_entries)) {
    return fail("PokéAPI species resource has an invalid shape.");
  }

  if (expected) {
    const expectedId = resourceIdFromUrl(expected.url, "pokemon-species");
    if (value.id !== expectedId || value.name !== expected.name) {
      return fail("PokéAPI species resource does not match the Pokémon species reference.");
    }
  }

  for (const [index, item] of value.names.entries()) {
    if (!isRecord(item) || !isRecord(item.language) || !isNonEmptyString(item.language.name)
      || !isNonEmptyString(item.name)) {
      return fail(`PokéAPI species name at index ${index} is invalid.`);
    }
  }
  for (const [index, item] of value.genera.entries()) {
    if (!isRecord(item) || !isRecord(item.language) || !isNonEmptyString(item.language.name)
      || !isNonEmptyString(item.genus)) {
      return fail(`PokéAPI species genus at index ${index} is invalid.`);
    }
  }
  for (const [index, item] of value.flavor_text_entries.entries()) {
    if (!isRecord(item) || !isRecord(item.language) || !isNonEmptyString(item.language.name)
      || typeof item.flavor_text !== "string") {
      return fail(`PokéAPI species flavor text at index ${index} is invalid.`);
    }
  }

  if (value.generation !== null
    && (!isRecord(value.generation) || !isNonEmptyString(value.generation.name))) {
    return fail("PokéAPI species generation is invalid.");
  }

  return success(value as unknown as PokemonSpeciesResource);
}

export function unwrapValidation<T>(result: ValidationResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
