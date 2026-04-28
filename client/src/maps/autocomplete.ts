import type { AddressRecord, AddressSuggestion } from '@solar3d/shared';

/**
 * Provider-agnostic autocomplete contract. Photon, Google, or Mock all implement
 * this so the React layer never knows which one is wired up.
 *
 * search(query) → cheap suggestion list for dropdown rendering.
 * resolve(suggestion) → full AddressRecord with placeId + lat/lng + parsed components.
 */
export interface AutocompleteProvider {
  name: string;
  search(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]>;
  resolve(suggestion: AddressSuggestion): Promise<AddressRecord>;
}

export class AutocompleteError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AutocompleteError';
  }
}
