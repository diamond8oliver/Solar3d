// Resilient fetch wrapper with timeout, exponential backoff + jitter, and
// configurable retry policy. Wraps native Node 20 fetch / AbortController.
// Returns the raw Response so callers control body parsing.

export interface FetchRetryOptions {
  timeoutMs?: number;
  retries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  retryOn?: (res: Response) => boolean;
  label?: string;
}

export class FetchError extends Error {
  public readonly url: string;
  public readonly status?: number;
  public readonly attempts: number;
  public readonly cause?: unknown;

  constructor(
    message: string,
    init: { url: string; status?: number; attempts: number; cause?: unknown }
  ) {
    super(message);
    this.name = 'FetchError';
    this.url = init.url;
    this.status = init.status;
    this.attempts = init.attempts;
    this.cause = init.cause;
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BASE_BACKOFF_MS = 250;
const DEFAULT_MAX_BACKOFF_MS = 4_000;

function defaultRetryOn(res: Response): boolean {
  return res.status === 429 || (res.status >= 500 && res.status <= 599);
}

function computeBackoff(
  attempt: number,
  baseBackoffMs: number,
  maxBackoffMs: number
): number {
  const exp = Math.min(maxBackoffMs, baseBackoffMs * 2 ** attempt);
  // +/- 25% jitter
  const jitter = exp * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exp + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Combine an external AbortSignal (from caller's init) with an internal
 * timeout-driven AbortController. Returns the controller plus a cleanup fn.
 */
function linkSignals(external: AbortSignal | null | undefined): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  if (!external) {
    return { controller, cleanup: () => {} };
  }
  if (external.aborted) {
    controller.abort(external.reason);
    return { controller, cleanup: () => {} };
  }
  const onAbort = () => controller.abort(external.reason);
  external.addEventListener('abort', onAbort, { once: true });
  return {
    controller,
    cleanup: () => external.removeEventListener('abort', onAbort),
  };
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchRetryOptions
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const baseBackoffMs = options?.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const maxBackoffMs = options?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const retryOn = options?.retryOn ?? defaultRetryOn;
  const label = options?.label;

  const totalAttempts = retries + 1;
  const labelPrefix = label ? `[${label}] ` : '';

  let lastError: unknown;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const { controller, cleanup } = linkSignals(init?.signal);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });

      if (res.ok) {
        return res;
      }

      lastStatus = res.status;

      // Non-retryable HTTP error → fail fast.
      if (!retryOn(res)) {
        throw new FetchError(
          `${labelPrefix}request failed: ${res.status} ${res.statusText}`,
          { url, status: res.status, attempts: attempt + 1 }
        );
      }

      // Retryable HTTP error: if no retries remain, throw.
      if (attempt === totalAttempts - 1) {
        throw new FetchError(
          `${labelPrefix}failed after ${totalAttempts} attempts: ${res.status}`,
          { url, status: res.status, attempts: totalAttempts }
        );
      }
    } catch (err) {
      // Re-throw FetchError immediately (already shaped).
      if (err instanceof FetchError) {
        throw err;
      }

      // If caller's external signal aborted, propagate without retry.
      if (init?.signal?.aborted) {
        throw new FetchError(`${labelPrefix}aborted by caller`, {
          url,
          attempts: attempt + 1,
          cause: err,
        });
      }

      lastError = err;

      if (attempt === totalAttempts - 1) {
        throw new FetchError(
          `${labelPrefix}failed after ${totalAttempts} attempts: ${
            err instanceof Error ? err.message : String(err)
          }`,
          { url, attempts: totalAttempts, cause: err }
        );
      }
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }

    // Backoff before next attempt.
    await sleep(computeBackoff(attempt, baseBackoffMs, maxBackoffMs));
  }

  // Unreachable in practice — loop either returns or throws — but TS needs it.
  throw new FetchError(
    `${labelPrefix}failed after ${totalAttempts} attempts`,
    { url, status: lastStatus, attempts: totalAttempts, cause: lastError }
  );
}
