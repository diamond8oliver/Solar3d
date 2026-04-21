import { PvwattsRequest, PvwattsResponse } from '@solar3d/shared';
import sampleData from '../fixtures/pvwatts-response.json';

export interface PvwattsClient {
  getEstimate(params: PvwattsRequest): Promise<PvwattsResponse>;
}

export class MockPvwattsClient implements PvwattsClient {
  async getEstimate(_params: PvwattsRequest): Promise<PvwattsResponse> {
    return sampleData as unknown as PvwattsResponse;
  }
}

export class RealPvwattsClient implements PvwattsClient {
  constructor(private apiKey: string) {}

  async getEstimate(params: PvwattsRequest): Promise<PvwattsResponse> {
    const query = new URLSearchParams({
      api_key: this.apiKey,
      system_capacity: String(params.systemCapacityKw),
      lat: String(params.lat),
      lon: String(params.lon),
      azimuth: String(params.azimuth),
      tilt: String(params.tilt),
      array_type: String(params.arrayType ?? 1),
      module_type: String(params.moduleType ?? 0),
      losses: String(params.losses ?? 14.08),
    });
    const res = await fetch(
      `https://developer.nrel.gov/api/pvwatts/v8.json?${query}`
    );
    if (!res.ok) {
      throw new Error(`PVWatts API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<PvwattsResponse>;
  }
}
