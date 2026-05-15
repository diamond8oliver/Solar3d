import { SolarApiResponse } from '@solar3d/shared';
import sampleData from '../fixtures/google-solar-response.json';
import { fetchWithRetry } from '../utils/fetch';

export interface GoogleSolarClient {
  getBuildingInsights(lat: number, lng: number): Promise<SolarApiResponse>;
}

export class MockGoogleSolarClient implements GoogleSolarClient {
  async getBuildingInsights(_lat: number, _lng: number): Promise<SolarApiResponse> {
    return sampleData as unknown as SolarApiResponse;
  }
}

export class RealGoogleSolarClient implements GoogleSolarClient {
  constructor(private apiKey: string) {}

  async getBuildingInsights(lat: number, lng: number): Promise<SolarApiResponse> {
    const url =
      `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
      `?location.latitude=${lat}&location.longitude=${lng}` +
      `&requiredQuality=HIGH&key=${this.apiKey}`;
    const res = await fetchWithRetry(url, undefined, { label: 'google-solar' });
    if (!res.ok) {
      throw new Error(`Google Solar API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<SolarApiResponse>;
  }
}
