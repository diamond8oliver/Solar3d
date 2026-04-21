import {
  RoofPlane,
  RoofSegmentStats,
  SolarPotential,
  PanelPosition,
  PanelLayout,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
  PANEL_GAP,
  ROOF_SETBACK,
  PANEL_ROOF_OFFSET,
} from '@solar3d/shared';
import { v4 as uuid } from 'uuid';

interface LayoutOptions {
  maxPanels?: number;
  skipNorthFacing?: boolean;
}

/**
 * Convert geographic roof segments to local 3D coordinates, then grid-fill
 * panels on the best-oriented faces. Returns a complete PanelLayout.
 */
export function computeLayout(
  solarPotential: SolarPotential,
  buildingCenter: { latitude: number; longitude: number },
  options: LayoutOptions = {}
): PanelLayout {
  const { skipNorthFacing = true } = options;
  const maxPanels = options.maxPanels ?? solarPotential.maxArrayPanelsCount;

  const panelW = solarPotential.panelWidthMeters ?? DEFAULT_PANEL_WIDTH;
  const panelH = solarPotential.panelHeightMeters ?? DEFAULT_PANEL_HEIGHT;
  const panelWatts = solarPotential.panelCapacityWatts ?? 400;

  // Convert roof segments to local coordinate roof planes
  const roofPlanes = solarPotential.roofSegmentStats.map((seg, i) =>
    segmentToRoofPlane(seg, i, buildingCenter)
  );

  // Sort segments by solar quality: south-facing first, then west/east, skip north
  const ranked = roofPlanes
    .filter((plane) => {
      if (!skipNorthFacing) return true;
      const az = plane.azimuthDegrees;
      // Skip north-facing segments (315–360 or 0–45)
      return !(az >= 315 || az <= 45);
    })
    .sort((a, b) => {
      // Prefer segments with azimuth closest to 180 (south)
      const aDist = Math.abs(180 - a.azimuthDegrees);
      const bDist = Math.abs(180 - b.azimuthDegrees);
      return aDist - bDist;
    });

  // Build a map of per-panel energy from the API's solarPanels array
  const panelEnergyBySegment = new Map<number, number[]>();
  for (const sp of solarPotential.solarPanels) {
    const list = panelEnergyBySegment.get(sp.segmentIndex) || [];
    list.push(sp.yearlyEnergyDcKwh);
    panelEnergyBySegment.set(sp.segmentIndex, list);
  }

  const allPanels: PanelPosition[] = [];
  let remaining = maxPanels;

  for (const plane of ranked) {
    if (remaining <= 0) break;
    const placed = fillSegment(plane, panelW, panelH, remaining, panelEnergyBySegment);
    allPanels.push(...placed);
    remaining -= placed.length;
  }

  return {
    panels: allPanels,
    totalPanelCount: allPanels.length,
    totalCapacityKw: (allPanels.length * panelWatts) / 1000,
    panelWidthMeters: panelW,
    panelHeightMeters: panelH,
  };
}

/**
 * Convert a Google Solar API roof segment into a local-coordinate RoofPlane.
 * Uses equirectangular approximation (accurate at building scale).
 */
function segmentToRoofPlane(
  seg: RoofSegmentStats,
  index: number,
  buildingCenter: { latitude: number; longitude: number }
): RoofPlane {
  const dLat = seg.center.latitude - buildingCenter.latitude;
  const dLng = seg.center.longitude - buildingCenter.longitude;
  const cosLat = Math.cos((buildingCenter.latitude * Math.PI) / 180);

  const centerX = dLng * cosLat * 111320;
  const centerZ = dLat * 110540;
  const centerY = seg.planeHeightAtCenterMeters;

  // Estimate width/height from area and a 3:2 aspect ratio heuristic
  const area = seg.stats.areaMeters2;
  const aspectRatio = 1.5;
  const width = Math.sqrt(area * aspectRatio);
  const height = area / width;

  return {
    segmentIndex: index,
    pitchDegrees: seg.pitchDegrees,
    azimuthDegrees: seg.azimuthDegrees,
    areaMeters2: area,
    centerX,
    centerY,
    centerZ,
    widthMeters: width,
    heightMeters: height,
  };
}

/**
 * Grid-fill a single roof segment with panels.
 * Starts from the bottom-left of the usable area and fills in rows/cols.
 */
function fillSegment(
  plane: RoofPlane,
  panelW: number,
  panelH: number,
  maxPanels: number,
  energyMap: Map<number, number[]>
): PanelPosition[] {
  const usableW = plane.widthMeters - 2 * ROOF_SETBACK;
  const usableH = plane.heightMeters - 2 * ROOF_SETBACK;
  if (usableW < panelW || usableH < panelH) return [];

  const cols = Math.floor((usableW + PANEL_GAP) / (panelW + PANEL_GAP));
  const rows = Math.floor((usableH + PANEL_GAP) / (panelH + PANEL_GAP));
  if (cols <= 0 || rows <= 0) return [];

  const pitchRad = (plane.pitchDegrees * Math.PI) / 180;
  const azRad = (plane.azimuthDegrees * Math.PI) / 180;

  // Energy values from API for this segment, consumed in order
  const energyValues = energyMap.get(plane.segmentIndex) || [];
  let energyIdx = 0;

  const panels: PanelPosition[] = [];
  const startX = -(cols * (panelW + PANEL_GAP) - PANEL_GAP) / 2;
  const startH = -(rows * (panelH + PANEL_GAP) - PANEL_GAP) / 2;

  for (let r = 0; r < rows && panels.length < maxPanels; r++) {
    for (let c = 0; c < cols && panels.length < maxPanels; c++) {
      // Position in the segment's local flat space
      const localX = startX + c * (panelW + PANEL_GAP) + panelW / 2;
      const localUpSlope = startH + r * (panelH + PANEL_GAP) + panelH / 2;

      // Transform to world coordinates using the segment's orientation
      // Azimuth rotates around Y, pitch tilts the slope direction
      const sinAz = Math.sin(azRad);
      const cosAz = Math.cos(azRad);

      const worldX =
        plane.centerX + localX * cosAz - localUpSlope * Math.cos(pitchRad) * sinAz;
      const worldZ =
        plane.centerZ + localX * sinAz + localUpSlope * Math.cos(pitchRad) * cosAz;
      const worldY =
        plane.centerY + localUpSlope * Math.sin(pitchRad) + PANEL_ROOF_OFFSET;

      const energy =
        energyIdx < energyValues.length ? energyValues[energyIdx++] : 460;

      panels.push({
        id: uuid(),
        segmentIndex: plane.segmentIndex,
        row: r,
        col: c,
        centerX: worldX,
        centerY: worldY,
        centerZ: worldZ,
        rotationZ: -azRad,
        tiltX: pitchRad,
        yearlyEnergyDcKwh: energy,
      });
    }
  }

  return panels;
}

/** Extracts normalized RoofPlane array for the frontend 3D viewer. */
export function extractRoofPlanes(
  solarPotential: SolarPotential,
  buildingCenter: { latitude: number; longitude: number }
): RoofPlane[] {
  return solarPotential.roofSegmentStats.map((seg, i) =>
    segmentToRoofPlane(seg, i, buildingCenter)
  );
}
