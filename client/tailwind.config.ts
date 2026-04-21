import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        solar: {
          panel: '#1e3a5f',
          roof: '#6b7280',
          accent: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
