import type { AddressRecord, AddressSuggestion } from '@solar3d/shared';
import type { AutocompleteProvider } from './autocomplete';

const FIXTURES: Array<{
  label: string;
  secondary: string;
  full: string;
  location: { lat: number; lng: number };
  components: AddressRecord['addressComponents'];
}> = [
  {
    label: '1600 Amphitheatre Pkwy',
    secondary: 'Mountain View, CA, 94043',
    full: '1600 Amphitheatre Parkway, Mountain View, CA, 94043, USA',
    location: { lat: 37.4223, lng: -122.0848 },
    components: {
      streetNumber: '1600', route: 'Amphitheatre Parkway',
      city: 'Mountain View', state: 'CA', postalCode: '94043', country: 'USA',
    },
  },
  {
    label: '1 Apple Park Way',
    secondary: 'Cupertino, CA, 95014',
    full: '1 Apple Park Way, Cupertino, CA, 95014, USA',
    location: { lat: 37.3349, lng: -122.0090 },
    components: {
      streetNumber: '1', route: 'Apple Park Way',
      city: 'Cupertino', state: 'CA', postalCode: '95014', country: 'USA',
    },
  },
  {
    label: '350 Fifth Ave',
    secondary: 'New York, NY, 10118',
    full: '350 Fifth Avenue, New York, NY, 10118, USA',
    location: { lat: 40.7484, lng: -73.9857 },
    components: {
      streetNumber: '350', route: 'Fifth Avenue',
      city: 'New York', state: 'NY', postalCode: '10118', country: 'USA',
    },
  },
];

/**
 * Offline-friendly provider for local dev when Photon is unreachable
 * or when running tests. Returns curated US fixtures filtered by query.
 */
export class MockProvider implements AutocompleteProvider {
  name = 'mock';

  async search(query: string): Promise<AddressSuggestion[]> {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return FIXTURES
      .filter((f) =>
        f.label.toLowerCase().includes(q) ||
        f.secondary.toLowerCase().includes(q) ||
        f.full.toLowerCase().includes(q)
      )
      .map((f, i) => ({
        id: `mock-${i}`,
        label: f.label,
        secondary: f.secondary,
        location: f.location,
        raw: f,
      }));
  }

  async resolve(suggestion: AddressSuggestion): Promise<AddressRecord> {
    const f = suggestion.raw as (typeof FIXTURES)[number];
    return {
      fullAddress: f.full,
      placeId: suggestion.id,
      location: suggestion.location ?? f.location,
      addressComponents: f.components,
    };
  }
}
