export interface AddressComponents {
  streetNumber: string | null;
  route: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface AddressRecord {
  fullAddress: string;
  placeId: string;
  location: { lat: number; lng: number };
  addressComponents: AddressComponents;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  secondary: string | null;
  location: { lat: number; lng: number } | null;
  raw: unknown;
}
