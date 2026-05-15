/**
 * Apify integration — generic actor runner.
 *
 * The runner is intentionally domain-agnostic: it executes an actor by id,
 * forwards an arbitrary input payload, and returns the dataset items as
 * `unknown[]` (typed as `TOutput[]` for caller convenience). Domain shaping
 * happens upstream in adapter functions, never here.
 *
 * Two implementations:
 *   - HttpApifyActorRunner — real HTTP calls, used when APIFY_TOKEN is present.
 *   - NoopApifyActorRunner — returns [] for every call. Used when token is
 *                            missing so the rest of the system can run
 *                            unchanged in dev / CI.
 */

import { config } from '../config';
import { fetchWithRetry } from '../utils/fetch';

export interface ApifyActorRunOptions {
  /** Hard timeout (ms) for a single actor run. Default: 60s. */
  timeoutMs?: number;
}

export interface ApifyActorRunner {
  runActor<TInput, TOutput>(
    actorId: string,
    input: TInput,
    opts?: ApifyActorRunOptions,
  ): Promise<TOutput[]>;
}

export class ApifyError extends Error {
  public readonly status: number;
  public readonly bodySnippet: string;
  public readonly actorId: string;

  constructor(actorId: string, status: number, bodySnippet: string) {
    super(`Apify actor "${actorId}" failed with HTTP ${status}: ${bodySnippet}`);
    this.name = 'ApifyError';
    this.actorId = actorId;
    this.status = status;
    this.bodySnippet = bodySnippet;
  }
}

const APIFY_BASE = 'https://api.apify.com/v2';
const DEFAULT_TIMEOUT_MS = 60_000;
const APIFY_DEFAULT_MEMORY_MB = 512;

export class HttpApifyActorRunner implements ApifyActorRunner {
  constructor(private readonly token: string) {
    if (!token) {
      throw new Error(
        'HttpApifyActorRunner requires a non-empty token. Use NoopApifyActorRunner when token is missing.',
      );
    }
  }

  async runActor<TInput, TOutput>(
    actorId: string,
    input: TInput,
    opts?: ApifyActorRunOptions,
  ): Promise<TOutput[]> {
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // Apify expects timeout in seconds; floor to be safe.
    const timeoutSecs = Math.max(1, Math.floor(timeoutMs / 1000));

    const url =
      `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items` +
      `?token=${encodeURIComponent(this.token)}` +
      `&timeout=${timeoutSecs}` +
      `&memory=${APIFY_DEFAULT_MEMORY_MB}` +
      `&format=json`;

    const res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input ?? {}),
      },
      {
        // The fetch wrapper has its own per-attempt timeout; give it headroom
        // beyond the Apify-side `timeout` query param.
        timeoutMs: timeoutMs + 5_000,
        retries: 1,
        label: `apify:${actorId}`,
      },
    );

    // fetchWithRetry only resolves on 2xx; defensive parse + branch anyway.
    if (!res.ok) {
      const snippet = await safeReadSnippet(res);
      throw new ApifyError(actorId, res.status, snippet);
    }

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch (err) {
      throw new ApifyError(
        actorId,
        res.status,
        `invalid JSON response: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!Array.isArray(parsed)) {
      // Run-sync-get-dataset-items always returns an array. If we ever see
      // an object, treat it as an unexpected vendor response — surface as
      // an empty result rather than poisoning the adapters with a non-array.
      return [];
    }

    return parsed as TOutput[];
  }
}

export class NoopApifyActorRunner implements ApifyActorRunner {
  async runActor<TInput, TOutput>(
    _actorId: string,
    _input: TInput,
    _opts?: ApifyActorRunOptions,
  ): Promise<TOutput[]> {
    return [];
  }
}

/**
 * Pick the appropriate runner based on runtime config. Called once at
 * `enrichmentEngine.ts` module load.
 */
export function createActorRunner(): ApifyActorRunner {
  if (config.apifyEnabled && config.apifyToken) {
    return new HttpApifyActorRunner(config.apifyToken);
  }
  return new NoopApifyActorRunner();
}

async function safeReadSnippet(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return '<unreadable response body>';
  }
}
