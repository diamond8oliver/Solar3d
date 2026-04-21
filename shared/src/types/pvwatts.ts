export interface PvwattsRequest {
  systemCapacityKw: number;
  lat: number;
  lon: number;
  azimuth: number;
  tilt: number;
  arrayType?: number;   // 0 = fixed open rack, 1 = fixed roof mount
  moduleType?: number;  // 0 = standard, 1 = premium, 2 = thin film
  losses?: number;      // system losses percentage (default 14.08)
}

export interface PvwattsResponse {
  inputs: Record<string, unknown>;
  version: string;
  station_info: {
    lat: number;
    lon: number;
    elev: number;
    tz: number;
    location: string;
    city: string;
    state: string;
  };
  outputs: {
    ac_monthly: number[];
    dc_monthly: number[];
    poa_monthly: number[];
    solrad_monthly: number[];
    ac_annual: number;
    solrad_annual: number;
    capacity_factor: number;
  };
}
