import type { AddressRecord, AddressSuggestion, AddressComponents } from '@solar3d/shared';
import { AutocompleteError, type AutocompleteProvider } from './autocomplete';

const PHOTON_URL = 'https://photon.komoot.io/api/';

interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  osm_key?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
  name?: string;
  type?: string;
}

interface PhotonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function formatLabel(p: PhotonProperties): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  return street || p.name || 'Unknown';
}

function formatSecondary(p: PhotonProperties): string {
  return [p.city, p.state, p.postcode].filter(Boolean).join(', ');
}

function toFullAddress(p: PhotonProperties): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const cityLine = [p.city, p.state, p.postcode].filter(Boolean).join(', ');
  return [street, cityLine, p.country].filter(Boolean).join(', ');
}

function toComponents(p: PhotonProperties): AddressComponents {
  return {
    streetNumber: p.housenumber ?? null,
    route: p.street ?? null,
    city: p.city ?? null,
    state: p.state ?? null,
    postalCode: p.postcode ?? null,
    country: p.country ?? null,
  };
}

/**
 * Photon (komoot.io) — free, OSM-backed, no API key.
 * US-only enforced via `osm_tag=place:house` + post-filter on countrycode.
 */
export class PhotonProvider implements AutocompleteProvider {
  name = 'photon';

  async search(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
    if (query.trim().length < 3) return [];

    const url = new URL(PHOTON_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '8');
    url.searchParams.set('lang', 'en');
    // Photon does not officially support country filtering, so we post-filter.
    // We bias toward addresses (vs POIs) by requesting the address layer.
    url.searchParams.set('layer', 'house');

    let res: Response;
    try {
      res = await fetch(url.toString(), { signal });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return [];
      throw new AutocompleteError('Photon network error', err);
    }
    if (!res.ok) throw new AutocompleteError(`Photon HTTP ${res.status}`);

    const data = (await res.json()) as PhotonResponse;

    return data.features
      .filter((f) => f.properties.countrycode?.toLowerCase() === 'us')
      .map((f) => ({
        id: `${f.properties.osm_type}-${f.properties.osm_id}`,
        label: formatLabel(f.properties),
        secondary: formatSecondary(f.properties) || null,
        location: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
        raw: f,
      }));
  }

  async resolve(suggestion: AddressSuggestion): Promise<AddressRecord> {
    const f = suggestion.raw as PhotonFeature;
    if (!f?.geometry?.coordinates || !suggestion.location) {
      throw new AutocompleteError('Suggestion has no geometry');
    }
    return {
      fullAddress: toFullAddress(f.properties),
      placeId: suggestion.id,
      location: suggestion.location,
      addressComponents: toComponents(f.properties),
    };
  }
}
