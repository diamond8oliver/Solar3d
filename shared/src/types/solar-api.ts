import { LatLng, RoofSegmentStats } from './roof';

export interface SolarPanel {
  center: LatLng;
  orientation: 'LANDSCAPE' | 'PORTRAIT';
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: {
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
  }[];
}

export interface SolarPotential {
  maxArrayPanelsCount: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  panelLifetimeYears: number;
  roofSegmentStats: RoofSegmentStats[];
  solarPanels: SolarPanel[];
  solarPanelConfigs: SolarPanelConfig[];
  carbonOffsetFactorKgPerMwh: number;
  wholeRoofStats: {
    areaMeters2: number;
    groundAreaMeters2: number;
    sunshineQuantiles: number[];
  };
}

export interface SolarApiResponse {
  name: string;
  center: LatLng;
  imageryDate: { year: number; month: number; day: number };
  postalCode: string;
  administrativeArea: string;
  regionCode: string;
  solarPotential: SolarPotential;
}
