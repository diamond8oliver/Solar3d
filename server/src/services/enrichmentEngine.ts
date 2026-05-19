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
  SolarIrradianceSample,
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

/**
 * PVGIS-style payload from velvety_bedbug/pvgis-solar-scraper. The actor
 * returns one dataset item per (lat, lng) query. Field names vary across
 * versions, so we accept the most common shapes and ignore the rest.
 */
export function adaptSolarIrradiance(raw: unknown[]): SolarIrradianceSample[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx): SolarIrradianceSample | null => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;

      const lat = asNumber(r.lat) ?? asNumber(r.latitude);
      const lng = asNumber(r.lng) ?? asNumber(r.longitude) ?? asNumber(r.lon);
      if (lat === undefined || lng === undefined) return null;

      const monthlyRaw = r.monthlyKwhPerKwp ?? r.monthly;
      const monthly = Array.isArray(monthlyRaw)
        ? monthlyRaw
            .map((v) => asNumber(v))
            .filter((v): v is number => v !== undefined)
        : undefined;

      return {
        id: asString(r.id, `irradiance-${idx}`),
        lat,
        lng,
        annualKwhPerKwp:
          asNumber(r.annualKwhPerKwp) ??
          asNumber(r.annual) ??
          asNumber(r.yearlyKwhPerKwp),
        monthlyKwhPerKwp: monthly && monthly.length === 12 ? monthly : undefined,
        optimalTiltDeg: asNumber(r.optimalTiltDeg) ?? asNumber(r.optimalTilt),
        optimalAzimuthDeg:
          asNumber(r.optimalAzimuthDeg) ?? asNumber(r.optimalAzimuth),
        source: asString(r.source, 'pvgis'),
        asOf: asString(r.asOf) || nowIso(),
      };
    })
    .filter((x): x is SolarIrradianceSample => x !== null);
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface EnrichmentContext {
  lat: number;
  lng: number;
  address: string;
  /**
   * Two-letter US state code. Used to scope DSIRE / installer-directory
   * actors. Optional — when missing the actors fall back to running for
   * the full US which is slower and noisier.
   */
  state?: string;
}

/**
 * Real Apify actor IDs. The `~` form (`user~actor-name`) is the public
 * slug; the bare ID form (`SXuQd0O7VrW2whBxT`) is the internal actor id —
 * both are accepted by `/v2/acts/{actorId}/run-sync-get-dataset-items`.
 */
const ACTOR_IDS = {
  incentives: 'jungle_synthesizer~dsire-energy-incentives-crawler',
  installers: 'SXuQd0O7VrW2whBxT',
  marketSignals: 'zjKUZEAWlWalVUOjd',
  solarIrradiance: 'Xxyuc9PC1XW1ZZMjn',
} as const;

/**
 * Two-letter US state code → full name. The buseta market-signal scraper
 * declares `states` as full names ("California"), while DSIRE + EnergySage
 * declare codes ("CA"). Keeping the map local avoids a dep just for this.
 */
const US_STATE_CODE_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming',
};

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
          solarIrradiance: [],
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
        solarIrradiance: [],
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
    // Per-actor input shapes — each scraper has a strict schema that 400s on
    // unknown fields, so we only forward what each actor declares. Schemas
    // confirmed against /v2/acts/{id}/builds/default on 2026-05-18.
    const stateCode = ctx.state ? ctx.state.toUpperCase() : undefined;
    const stateName = stateCode ? US_STATE_CODE_TO_NAME[stateCode] : undefined;

    // DSIRE: maxItems is required; stateAbbreviations scopes the crawl.
    // sp_intended_usage is technically optional but the actor's UX gates on
    // it — provide a real-sounding string so the crawl actually runs.
    const incentivesInput = {
      maxItems: 25,
      sp_intended_usage:
        'Powering a homeowner-facing solar quote tool — surface state-level rebates and tax credits.',
      ...(stateCode ? { stateAbbreviations: [stateCode] } : {}),
    };

    // EnergySage installer directory: `states` is an array of two-letter
    // codes per the schema description ("'CA', 'NY', 'TX'"). Other fields
    // (address/lat/lng) caused 400 Bad Request — drop them.
    const installersInput = {
      maxItems: 25,
      sp_intended_usage:
        'Surfacing trusted local installers in homeowner solar quotes.',
      ...(stateCode ? { states: [stateCode] } : {}),
    };

    // buseta solar-industry-scraper: scrape_type is REQUIRED (enum:
    // installers | incentives | all). `states` here wants FULL state names
    // ("California"), not codes. We pick "all" to get both review-derived
    // installer trends and the actor's aggregate market analysis.
    const marketInput = {
      scrape_type: 'all',
      get_reviews: true,
      ai_analysis: true,
      ...(stateName ? { states: [stateName] } : {}),
    };

    // PVGIS scraper: the field names are `latitude`/`longitude` (NOT
    // lat/lng — that's why the first run silently returned the default
    // (45, 8) ≈ Lake Como). peakPower keyed off the layout's actual
    // capacity would be ideal; 1 kWp keeps the response unit-normalized.
    const irradianceInput = {
      latitude: ctx.lat,
      longitude: ctx.lng,
      peakPower: 1,
      dataType: 'pvcalc',
      maxItems: 12,
    };

    // Run all four dimensions in parallel — they're independent, and the
    // buseta + DSIRE actors can each take 2-3 minutes when AI analysis or a
    // wide state scan is involved. Each dimension has its own try/catch via
    // _safeRun so one slow/broken actor cannot kill the others. The serial
    // version made wall-clock = sum-of-actors which routinely exceeded the
    // user's patience.
    const [incentives, installers, marketSignals, solarIrradiance] =
      await Promise.all([
        this._safeRun(ACTOR_IDS.incentives, incentivesInput, adaptIncentives, 240_000),
        this._safeRun(ACTOR_IDS.installers, installersInput, adaptInstallers, 180_000),
        this._safeRun(ACTOR_IDS.marketSignals, marketInput, adaptMarketSignals, 300_000),
        this._safeRun(ACTOR_IDS.solarIrradiance, irradianceInput, adaptSolarIrradiance, 60_000),
      ]);

    const finishedAt = nowIso();
    const record: ProjectEnrichment = {
      projectId,
      status: { status: 'succeeded', startedAt, finishedAt },
      incentives,
      installers,
      marketSignals,
      solarIrradiance,
    };
    await this.repo.save(record);
  }

  private async _safeRun<T>(
    actorId: string,
    input: unknown,
    adapt: (raw: unknown[]) => T[],
    timeoutMs?: number,
  ): Promise<T[]> {
    try {
      const raw = await this.runner.runActor<unknown, unknown>(
        actorId,
        input,
        timeoutMs ? { timeoutMs } : undefined,
      );
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
      solarIrradiance: [],
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
