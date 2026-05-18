import { RoofPlane } from './roof';

export interface PanelPosition {
  id: string;
  segmentIndex: number;
  row: number;
  col: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  rotationZ: number;  // radians — panel azimuth orientation
  tiltX: number;      // radians — follows roof pitch
  yearlyEnergyDcKwh: number;
}

export interface PanelLayout {
  panels: PanelPosition[];
  totalCapacityKw: number;
  totalPanelCount: number;
  panelWidthMeters: number;
  panelHeightMeters: number;
}

export interface EnergyEstimate {
  acMonthly: number[];
  acAnnual: number;
  solradAnnual: number;
  capacityFactor: number;
}

export interface Project {
  id: string;
  address: string;
  lat: number;
  lng: number;
  /**
   * Roof centroid from Google Solar API (`building.center`). More accurate
   * than the geocoded address lat/lng — the camera focuses on this so the
   * 3D viewer lands on the actual rooftop rather than a neighbor's parcel.
   */
  buildingCenter: { lat: number; lng: number } | null;
  createdAt: string;
  shareToken: string | null;
  roofPlanes: RoofPlane[];
  panelLayout: PanelLayout;
  energyEstimate: EnergyEstimate;
  monthlyBillUsd: number;
  utilityRatePerKwh: number;
}

export interface CreateProjectInput {
  address: string;
  lat: number;
  lng: number;
  monthlyBillUsd: number;
  /**
   * Two-letter US state code (e.g. "CA"). Optional; when present it is
   * forwarded to the enrichment engine to scope DSIRE / installer-directory
   * actor queries. Quote math does not use it.
   */
  state?: string;
}
