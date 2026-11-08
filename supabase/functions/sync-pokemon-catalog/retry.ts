export interface RetryDelayOptions {
  nowMs?: number;
  random?: () => number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface FetchRetryOptions extends RetryDelayOptions {
  fetcher?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
  maxRetries?: number;
}

const DEFAULT_BASE_DELAY_MS = 300;
const DEFAULT_MAX_DELAY_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function parseRetryAfterMs(
  value: string | null,
  nowMs = Date.now(),
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
): number | null {
  if (value === null || value.trim() === "") return null;

  const normalized = value.trim();
  let delayMs: number;

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    delayMs = Number(normalized) * 1_000;
  } else {
    const retryAt = Date.parse(normalized);
    if (!Number.isFinite(retryAt)) return null;
    delayMs = Math.max(0, retryAt - nowMs);
  }

  if (!Number.isFinite(delayMs)) return maxDelayMs;
  return Math.min(maxDelayMs, Math.max(0, Math.ceil(delayMs)));
}

/** Full-jitter exponential backoff, never earlier than a valid Retry-After. */
export function getRetryDelayMs(
  attempt: number,
  retryAfter: string | null = null,
  options: RetryDelayOptions = {},
): number {
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt));
  const randomValue = Math.min(0.999999999, Math.max(0, (options.random ?? Math.random)()));
  const jitteredBackoff = Math.floor(randomValue * cap);
  const serverDelay = parseRetryAfterMs(retryAfter, options.nowMs ?? Date.now(), maxDelayMs) ?? 0;

  return Math.max(jitteredBackoff, serverDelay);
}

function defaultWait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const fetcher = options.fetcher ?? fetch;
  const wait = options.wait ?? defaultWait;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;

    try {
      response = await fetcher(url);
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      await wait(getRetryDelayMs(attempt, null, options));
      continue;
    }

    if (!RETRYABLE_HTTP_STATUSES.has(response.status) || attempt >= maxRetries) {
      return response;
    }

    const retryAfter = response.headers.get("Retry-After");
    await response.body?.cancel();
    await wait(getRetryDelayMs(attempt, retryAfter, options));
  }
}
