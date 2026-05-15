/**
 * Enrichment domain types.
 *
 * These are the *internal* normalized shapes emitted by the enrichment engine.
 * Vendor-specific Apify payloads are mapped into these by the actor adapters
 * inside `server/src/services/enrichmentEngine.ts` — nothing upstream of those
 * adapters should ever see a raw Apify dataset item.
 *
 * Plain TS interfaces are intentional: zod validation lives at the boundary
 * (the adapters), not in the shared type module.
 */

/**
 * Lifecycle of an enrichment job for a single project.
 *
 * Transitions:
 *   pending  → running   (engine begins work)
 *   running  → succeeded (all dimensions resolved without throwing)
 *   running  → failed    (the orchestrator itself threw; per-dimension
 *                         failures are swallowed and logged, they do NOT
 *                         flip the overall status to `failed`)
 *   *        → disabled  (token missing or apifyEnabled=false at boot;
 *                         no work is attempted)
 */
export type EnrichmentStatus =
  | { status: 'pending'; startedAt?: string; finishedAt?: string; error?: string }
  | { status: 'running'; startedAt: string; finishedAt?: string; error?: string }
  | { status: 'succeeded'; startedAt: string; finishedAt: string; error?: string }
  | { status: 'failed'; startedAt: string; finishedAt: string; error: string }
  | { status: 'disabled'; startedAt?: string; finishedAt?: string; error?: string };

export type IncentiveType = 'rebate' | 'tax-credit' | 'grant';

export interface IncentiveProgram {
  id: string;
  name: string;
  jurisdiction: string;
  type: IncentiveType;
  amountUsd?: number;
  percentOfCost?: number;
  source: string;
  lastSeenAt: string;
}

export interface LocalInstaller {
  id: string;
  name: string;
  region: string;
  rating?: number;
  reviewCount?: number;
  source: string;
  lastSeenAt: string;
}

export type MarketSignalKind =
  | 'avg-system-price'
  | 'permit-volume'
  | 'rate-trend';

export interface MarketSignal {
  id: string;
  region: string;
  kind: MarketSignalKind;
  value: number;
  unit: string;
  asOf: string;
  source: string;
}

export interface ProjectEnrichment {
  projectId: string;
  status: EnrichmentStatus;
  incentives: IncentiveProgram[];
  installers: LocalInstaller[];
  marketSignals: MarketSignal[];
}
