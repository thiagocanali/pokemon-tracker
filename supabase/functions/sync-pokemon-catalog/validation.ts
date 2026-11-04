export const MAX_BATCH_SIZE = 25;
export const DEFAULT_BATCH_SIZE = 20;

export type SyncPagination = { offset: number; limit: number };
export type PaginationResult =
  | { ok: true; value: SyncPagination }
  | { ok: false; error: string };

export function parseSyncPagination(body: unknown): PaginationResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const input = body as Record<string, unknown>;
  const offset = input.offset === undefined ? 0 : input.offset;
  const limit = input.limit === undefined ? DEFAULT_BATCH_SIZE : input.limit;

  if (!Number.isSafeInteger(offset) || (offset as number) < 0) {
    return { ok: false, error: "offset must be a non-negative safe integer." };
  }

  if (!Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > MAX_BATCH_SIZE) {
    return { ok: false, error: `limit must be an integer between 1 and ${MAX_BATCH_SIZE}.` };
  }

  return { ok: true, value: { offset: offset as number, limit: limit as number } };
}
