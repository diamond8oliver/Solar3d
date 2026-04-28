import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, MapPin, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { AddressRecord, AddressSuggestion } from '@solar3d/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';

interface Props {
  onConfirm: (address: AddressRecord) => void;
}

/**
 * Hero + autocomplete + summary card.
 *
 * The address is uniquely identified by `placeId + lat/lng` (set by the
 * AutocompleteProvider on resolve). Two cities with "123 Main St" produce
 * different lat/lngs, so the camera always lands on the right house.
 */
export default function AddressSearch({ onConfirm }: Props) {
  const { query, suggestions, loading, error, setQuery, resolve, clear } =
    useAddressAutocomplete();
  const [picked, setPicked] = useState<AddressRecord | null>(null);
  const [resolving, setResolving] = useState(false);

  const handlePick = async (s: AddressSuggestion) => {
    setResolving(true);
    try {
      const record = await resolve(s);
      setPicked(record);
      clear();
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Sun className="h-4 w-4" />
          Interactive 3D Solar Preview
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          See your home in interactive 3D
        </h1>
        <p className="text-lg text-muted-foreground">
          Type your address. We'll fly you to your house, light it up, and
          drop solar panels on the roof.
        </p>
        <p className="text-xs text-muted-foreground mt-2">United States only.</p>
      </div>

      <div className="rounded-2xl border bg-card shadow-xl p-6 space-y-4">
        <div className="space-y-2 relative">
          <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Home Address
          </Label>
          <Input
            id="address"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
            placeholder="Start typing… e.g. 1600 Amphitheatre Pkwy"
            className="h-12 text-base"
            autoComplete="off"
          />

          <AnimatePresence>
            {(loading || suggestions.length > 0 || error) && !picked && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 z-10 bg-card border rounded-lg shadow-lg overflow-hidden"
              >
                {loading && (
                  <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching addresses…
                  </div>
                )}
                {error && (
                  <div className="px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </div>
                )}
                {!loading && !error && suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePick(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0"
                  >
                    <div className="text-sm font-medium">{s.label}</div>
                    {s.secondary && (
                      <div className="text-xs text-muted-foreground">{s.secondary}</div>
                    )}
                  </button>
                ))}
                {!loading && !error && suggestions.length === 0 && query.length >= 3 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No US addresses matched.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {picked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Confirm address
                </div>
                <div className="font-medium">{picked.fullAddress}</div>
                <div className="text-sm text-muted-foreground">
                  {[picked.addressComponents.city, picked.addressComponents.state, picked.addressComponents.postalCode]
                    .filter(Boolean).join(', ')}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {picked.location.lat.toFixed(5)}, {picked.location.lng.toFixed(5)}
                </div>
              </div>
              <button
                type="button"
                disabled={resolving}
                onClick={() => onConfirm(picked)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                View in 3D
                <ArrowRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
