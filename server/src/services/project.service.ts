import { v4 as uuid } from 'uuid';
import {
  Project,
  CreateProjectInput,
  DEFAULT_UTILITY_RATE,
  DEFAULT_SYSTEM_LOSSES,
  DEFAULT_OFFSET_TARGET,
} from '@solar3d/shared';
import { GoogleSolarClient } from '../clients/google-solar.client';
import { PvwattsClient } from '../clients/pvwatts.client';
import { ProjectRepository } from '../repositories/project.repository';
import { computeLayout, extractRoofPlanes, pickPanelCountForBill } from '../engine/layout';
import { enrichmentEngine } from './enrichmentEngine';

export class ProjectService {
  constructor(
    private solarClient: GoogleSolarClient,
    private pvwattsClient: PvwattsClient,
    private repo: ProjectRepository
  ) {}

  async createProject(input: CreateProjectInput): Promise<Project> {
    // 1. Fetch roof geometry and solar potential
    const building = await this.solarClient.getBuildingInsights(input.lat, input.lng);
    const sp = building.solarPotential;

    // 2. Size the system to the customer's bill (NEM 3.0 sweet spot at 85%
    //    offset), then compute the panel layout. If no bill is provided the
    //    layout engine falls back to maxArrayPanelsCount.
    const maxPanels = pickPanelCountForBill(
      sp,
      input.monthlyBillUsd,
      DEFAULT_UTILITY_RATE,
      DEFAULT_OFFSET_TARGET,
    ) ?? undefined;
    const layout = computeLayout(sp, building.center, { maxPanels });

    // 3. Get production estimate from PVWatts
    // Use the dominant segment's tilt/azimuth (first in sorted order = best)
    const bestSegment = sp.roofSegmentStats.reduce((best, seg) =>
      Math.abs(180 - seg.azimuthDegrees) < Math.abs(180 - best.azimuthDegrees)
        ? seg
        : best
    );

    const pvResult = await this.pvwattsClient.getEstimate({
      systemCapacityKw: layout.totalCapacityKw,
      lat: input.lat,
      lon: input.lng,
      azimuth: bestSegment.azimuthDegrees,
      tilt: bestSegment.pitchDegrees,
      arrayType: 1,
      moduleType: 0,
      losses: DEFAULT_SYSTEM_LOSSES,
    });

    // 4. Build and store the project
    const roofPlanes = extractRoofPlanes(sp, building.center);

    const project: Project = {
      id: uuid(),
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      buildingCenter: building.center
        ? { lat: building.center.latitude, lng: building.center.longitude }
        : null,
      createdAt: new Date().toISOString(),
      shareToken: null,
      roofPlanes,
      panelLayout: layout,
      energyEstimate: {
        acMonthly: pvResult.outputs.ac_monthly,
        acAnnual: pvResult.outputs.ac_annual,
        solradAnnual: pvResult.outputs.solrad_annual,
        capacityFactor: pvResult.outputs.capacity_factor,
      },
      monthlyBillUsd: input.monthlyBillUsd,
      utilityRatePerKwh: DEFAULT_UTILITY_RATE,
    };

    const saved = await this.repo.save(project);

    // Fire-and-forget enrichment. Apify is NEVER on the quote-critical path:
    // we don't await this, and we wrap it in try/catch so even synchronous
    // queueing errors can't bubble up to the HTTP response.
    try {
      enrichmentEngine.enrichProject(saved.id, {
        address: input.address,
        lat: input.lat,
        lng: input.lng,
      });
    } catch (err) {
      // Defensive — enrichmentEngine.enrichProject already swallows internally.
      console.error('[project.service] enrichment queue failed (ignored):', err);
    }

    return saved;
  }

  async getProject(id: string): Promise<Project | null> {
    return this.repo.findById(id);
  }

  async listProjects(): Promise<Project[]> {
    return this.repo.findAll();
  }

  async generateShareToken(id: string): Promise<string | null> {
    const project = await this.repo.findById(id);
    if (!project) return null;

    const token = uuid().replace(/-/g, '').slice(0, 12);
    project.shareToken = token;
    await this.repo.save(project);
    return token;
  }

  async getProjectByShareToken(token: string): Promise<Project | null> {
    return this.repo.findByShareToken(token);
  }
}
