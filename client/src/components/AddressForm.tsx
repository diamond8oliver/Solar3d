import { useState } from 'react';

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
 * Address entry form. For the MVP, accepts lat/lng directly alongside
 * the address string. A future version would use Google Places Autocomplete
 * to geocode automatically.
 */
export default function AddressForm({ onSubmit, loading }: Props) {
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('37.4449');
  const [lng, setLng] = useState('-122.1391');
  const [bill, setBill] = useState('150');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      address: address || `${lat}, ${lng}`,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      monthlyBillUsd: parseFloat(bill) || 150,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-md mx-auto"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        See your home with solar
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, Palo Alto, CA"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Monthly electric bill ($)
        </label>
        <input
          type="number"
          value={bill}
          onChange={(e) => setBill(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md py-2.5 text-sm transition-colors"
      >
        {loading ? 'Generating preview...' : 'Generate Solar Preview'}
      </button>
    </form>
  );
}
