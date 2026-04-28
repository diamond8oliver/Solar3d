import { useEffect, useRef, useState } from 'react';
import type { AddressSuggestion } from '@solar3d/shared';
import { autocomplete, AutocompleteError } from '../maps';

interface State {
  query: string;
  suggestions: AddressSuggestion[];
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 200;

export function useAddressAutocomplete() {
  const [state, setState] = useState<State>({
    query: '', suggestions: [], loading: false, error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const setQuery = (q: string) => {
    setState((s) => ({ ...s, query: q, error: null }));
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.trim().length < 3) {
      setState((s) => ({ ...s, suggestions: [], loading: false }));
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      const ctl = new AbortController();
      abortRef.current = ctl;
      setState((s) => ({ ...s, loading: true }));
      try {
        const results = await autocomplete.search(q, ctl.signal);
        if (ctl.signal.aborted) return;
        setState((s) => ({ ...s, suggestions: results, loading: false }));
      } catch (err) {
        if (ctl.signal.aborted) return;
        const msg = err instanceof AutocompleteError ? err.message : 'Search failed';
        setState((s) => ({ ...s, suggestions: [], loading: false, error: msg }));
      }
    }, DEBOUNCE_MS);
  };

  const resolve = (s: AddressSuggestion) => autocomplete.resolve(s);

  const clear = () =>
    setState({ query: '', suggestions: [], loading: false, error: null });

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return { ...state, setQuery, resolve, clear };
}
