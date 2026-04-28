import { useState } from 'react';
import { Sun, Zap, MapPin, DollarSign, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onSubmit: (data: {
    address: string;
    lat: number;
    lng: number;
    monthlyBillUsd: number;
  }) => void;
  loading: boolean;
}

/**
 * Address entry form. For the MVP, we geocode from a hardcoded lookup
 * since we're using mock APIs anyway. A production version would use
 * Google Places Autocomplete to resolve lat/lng from the address.
 */
export default function AddressForm({ onSubmit, loading }: Props) {
  const [address, setAddress] = useState('');
  const [bill, setBill] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // MVP: use Palo Alto coords for any address (mock APIs return
    // the same fixture data regardless). Production would geocode.
    onSubmit({
      address: address || '123 Main St, Palo Alto, CA',
      lat: 37.4449,
      lng: -122.1391,
      monthlyBillUsd: parseFloat(bill) || 150,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Hero section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Sun className="h-4 w-4" />
          Instant 3D Solar Preview
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          See your home with solar
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get a free 3D visualization of solar panels on your roof with
          production estimates and savings — in seconds.
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border bg-card shadow-lg p-8 space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Home Address
            </Label>
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Palo Alto, CA 94301"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Enter your full street address including city, state, and zip code.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Monthly Electric Bill
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">$</span>
              <Input
                id="bill"
                type="number"
                value={bill}
                onChange={(e) => setBill(e.target.value)}
                placeholder="150"
                className="h-12 text-base pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used to estimate your bill offset. We'll never ask for your utility account.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg text-base transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating your preview...
              </>
            ) : (
              <>
                Generate Solar Preview
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            <span>Instant results</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sun className="h-4 w-4" />
            <span>Satellite data</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span>100% free</span>
          </div>
        </div>
      </div>
    </div>
  );
}
