// TODO: replace with a durable adapter (Postgres / SQLite / Redis) before any
//       production deploy. The in-memory repo below is process-local — server
//       restarts wipe it and it does not survive across instances.

import {
  EnrichmentStatus,
  IncentiveProgram,
  IncentiveType,
  LocalInstaller,
  MarketSignal,
  MarketSignalKind,
  ProjectEnrichment,
} from '@solar3d/shared';
import {
  ApifyActorRunner,
  createActorRunner,
} from '../integrations/apify';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export interface EnrichmentRepository {
  save(e: ProjectEnrichment): Promise<void>;
  findByProjectId(id: string): Promise<ProjectEnrichment | null>;
}

/**
 * Process-local map. Not durable. Not safe across multiple server instances.
 * Acceptable only for first-pass scaffolding and local dev.
 */
export class InMemoryEnrichmentRepository implements EnrichmentRepository {
  private store = new Map<string, ProjectEnrichment>();

  async save(e: ProjectEnrichment): Promise<void> {
    this.store.set(e.projectId, e);
  }

  async findByProjectId(id: string): Promise<ProjectEnrichment | null> {
    return this.store.get(id) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Adapter functions — vendor payload → internal domain.
//
// These exist so that swapping in real Apify actor IDs later is a mechanical
// change. Each is pure, never throws, and defensively handles malformed input.
// For now (placeholder actors), they happily accept empty inputs and return
// empty arrays.
// ---------------------------------------------------------------------------

const VALID_INCENTIVE_TYPES: ReadonlySet<IncentiveType> = new Set<IncentiveType>([
  'rebate',
  'tax-credit',
  'grant',
]);

const VALID_MARKET_SIGNAL_KINDS: ReadonlySet<MarketSignalKind> = new Set<MarketSignalKind>([
  'avg-system-price',
  'permit-volume',
  'rate-trend',
]);

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function adaptIncentives(raw: unknown[]): IncentiveProgram[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx): IncentiveProgram | null => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;

      const id = asString(r.id, `incentive-${idx}`);
      const name = asString(r.name);
      if (!name) return null;

      const rawType = asString(r.type);
      const type: IncentiveType = VALID_INCENTIVE_TYPES.has(rawType as IncentiveType)
        ? (rawType as IncentiveType)
        : 'rebate';

      return {
        id,
        name,
        jurisdiction: asString(r.jurisdiction, 'unknown'),
        type,
        amountUsd: asNumber(r.amountUsd),
        percentOfCost: asNumber(r.percentOfCost),
        source: asString(r.source, 'apify'),
        lastSeenAt: asString(r.lastSeenAt) || nowIso(),
      };
    })
    .filter((x): x is IncentiveProgram => x !== null);
}

export function adaptInstallers(raw: unknown[]): LocalInstaller[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx): LocalInstaller | null => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;

      const name = asString(r.name);
      if (!name) return null;

      return {
        id: asString(r.id, `installer-${idx}`),
        name,
        region: asString(r.region, 'unknown'),
        rating: asNumber(r.rating),
        reviewCount: asNumber(r.reviewCount),
        source: asString(r.source, 'apify'),
        lastSeenAt: asString(r.lastSeenAt) || nowIso(),
      };
    })
    .filter((x): x is LocalInstaller => x !== null);
}

export function adaptMarketSignals(raw: unknown[]): MarketSignal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx): MarketSignal | null => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;

      const value = asNumber(r.value);
      if (value === undefined) return null;

      const rawKind = asString(r.kind);
      const kind: MarketSignalKind = VALID_MARKET_SIGNAL_KINDS.has(
        rawKind as MarketSignalKind,
      )
        ? (rawKind as MarketSignalKind)
        : 'avg-system-price';

      return {
        id: asString(r.id, `signal-${idx}`),
        region: asString(r.region, 'unknown'),
        kind,
        value,
        unit: asString(r.unit, ''),
        asOf: asString(r.asOf) || nowIso(),
        source: asString(r.source, 'apify'),
      };
    })
    .filter((x): x is MarketSignal => x !== null);
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface EnrichmentContext {
  lat: number;
  lng: number;
  address: string;
}

// Placeholder actor IDs — swap for real Apify actor IDs once they exist.
const ACTOR_IDS = {
  incentives: 'placeholder/incentives',
  installers: 'placeholder/installers',
  marketSignals: 'placeholder/market-signals',
} as const;

export class EnrichmentEngine {
  constructor(
    private readonly runner: ApifyActorRunner,
    private readonly repo: EnrichmentRepository,
  ) {}

  /**
   * Fire-and-forget. Synchronously seeds a `running` (or `disabled`) record,
   * then kicks off the background work. Never throws — caller does NOT await.
   */
  enrichProject(projectId: string, ctx: EnrichmentContext): void {
    try {
      // Disabled mode: write a `disabled` record and return immediately. No
      // background work scheduled. Idempotent against missing token at boot.
      if (!config.apifyEnabled) {
        const startedAt = nowIso();
        const record: ProjectEnrichment = {
          projectId,
          status: { status: 'disabled', startedAt, finishedAt: startedAt },
          incentives: [],
          installers: [],
          marketSignals: [],
        };
        // Repo writes are async but we don't block — the fire-and-forget
        // contract applies here too.
        void this.repo.save(record).catch((err) => {
          console.warn(
            `[enrichment] failed to persist disabled record for ${projectId}:`,
            err,
          );
        });
        return;
      }

      const startedAt = nowIso();
      const seed: ProjectEnrichment = {
        projectId,
        status: { status: 'running', startedAt },
        incentives: [],
        installers: [],
        marketSignals: [],
      };

      void this.repo
        .save(seed)
        .catch((err) => {
          console.warn(
            `[enrichment] failed to persist running seed for ${projectId}:`,
            err,
          );
        })
        .finally(() => {
          void this._runEnrichment(projectId, ctx, startedAt).catch((err) =>
            this._markFailed(projectId, startedAt, err),
          );
        });
    } catch (err) {
      // Truly defensive — synchronous queueing should never throw, but if
      // something really weird happens we swallow it so the calling HTTP
      // request still returns cleanly.
      console.error(
        `[enrichment] unexpected error queueing project ${projectId}:`,
        err,
      );
    }
  }

  async getEnrichment(projectId: string): Promise<ProjectEnrichment | null> {
    return this.repo.findByProjectId(projectId);
  }

  private async _runEnrichment(
    projectId: string,
    ctx: EnrichmentContext,
    startedAt: string,
  ): Promise<void> {
    const actorInput = {
      lat: ctx.lat,
      lng: ctx.lng,
      address: ctx.address,
    };

    // Each dimension has its own try/catch — one slow/broken actor must not
    // kill the others. Failures are logged and the dimension stays empty.
    const incentives = await this._safeRun(
      ACTOR_IDS.incentives,
      actorInput,
      adaptIncentives,
    );
    const installers = await this._safeRun(
      ACTOR_IDS.installers,
      actorInput,
      adaptInstallers,
    );
    const marketSignals = await this._safeRun(
      ACTOR_IDS.marketSignals,
      actorInput,
      adaptMarketSignals,
    );

    const finishedAt = nowIso();
    const record: ProjectEnrichment = {
      projectId,
      status: { status: 'succeeded', startedAt, finishedAt },
      incentives,
      installers,
      marketSignals,
    };
    await this.repo.save(record);
  }

  private async _safeRun<T>(
    actorId: string,
    input: unknown,
    adapt: (raw: unknown[]) => T[],
  ): Promise<T[]> {
    try {
      const raw = await this.runner.runActor<unknown, unknown>(actorId, input);
      return adapt(raw);
    } catch (err) {
      console.warn(
        `[enrichment] actor "${actorId}" failed:`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }

  private async _markFailed(
    projectId: string,
    startedAt: string,
    err: unknown,
  ): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[enrichment] orchestrator failed for project ${projectId}:`,
      message,
    );
    const record: ProjectEnrichment = {
      projectId,
      status: {
        status: 'failed',
        startedAt,
        finishedAt: nowIso(),
        error: message,
      },
      incentives: [],
      installers: [],
      marketSignals: [],
    };
    try {
      await this.repo.save(record);
    } catch (saveErr) {
      console.error(
        `[enrichment] could not persist failed record for ${projectId}:`,
        saveErr,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton — initialized at module load. Keep simple, no DI container.
// ---------------------------------------------------------------------------

export const enrichmentEngine = new EnrichmentEngine(
  createActorRunner(),
  new InMemoryEnrichmentRepository(),
);
