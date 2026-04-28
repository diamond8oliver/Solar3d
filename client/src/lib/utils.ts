import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKwh(kwh: number): string {
  return kwh >= 1000
    ? `${(kwh / 1000).toFixed(1)} MWh`
    : `${Math.round(kwh)} kWh`;
}

export function formatCurrency(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usd);
}

export function formatKw(kw: number): string {
  return `${kw.toFixed(1)} kW`;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getMonthLabel(index: number): string {
  return MONTH_LABELS[index] ?? '';
}
