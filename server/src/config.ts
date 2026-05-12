import { config as loadEnv } from 'dotenv';
import * as path from 'path';

// Load root .env (workspace root is two levels up from server/src).
loadEnv({ path: path.resolve(__dirname, '../../.env') });
// Also try server-local .env as override (won't fail if absent).
loadEnv({ path: path.resolve(__dirname, '../.env'), override: true });

const googleSolarKey = process.env.GOOGLE_SOLAR_API_KEY || '';
const nrelKey = process.env.NREL_API_KEY || '';
const hasRealKey = (k: string) => k.length > 0 && k !== 'your_key_here';

// USE_MOCK_APIS:
//   "true"  → force mock for both (default if unset)
//   "false" → force real for both (will throw if keys missing)
//   "auto"  → use real per-API where a key is present, mock otherwise
const flag = (process.env.USE_MOCK_APIS ?? 'true').toLowerCase();
const auto = flag === 'auto';
const forceReal = flag === 'false';
const forceMock = !auto && !forceReal;

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  googleSolarApiKey: googleSolarKey,
  nrelApiKey: nrelKey,
  useMockSolar: forceMock || (auto && !hasRealKey(googleSolarKey)),
  useMockPvwatts: forceMock || (auto && !hasRealKey(nrelKey)),
};
