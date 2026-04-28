import type { AutocompleteProvider } from './autocomplete';
import { PhotonProvider } from './photon';
import { MockProvider } from './mock';

export type { AutocompleteProvider } from './autocomplete';
export { AutocompleteError } from './autocomplete';

/**
 * Provider selection happens at module load. The chosen provider is a singleton
 * for the app lifetime — there's no reason to swap mid-session.
 *
 * Add a Google provider here later by implementing the same interface and
 * branching on `VITE_AUTOCOMPLETE_PROVIDER === 'google'`.
 */
export function createAutocompleteProvider(): AutocompleteProvider {
  const choice = (import.meta.env.VITE_AUTOCOMPLETE_PROVIDER ?? 'photon').toLowerCase();
  switch (choice) {
    case 'mock':
      return new MockProvider();
    case 'photon':
    default:
      return new PhotonProvider();
  }
}

export const autocomplete = createAutocompleteProvider();
