import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Load root .env (workspace root is two levels up from server/src).
loadEnv({ path: path.resolve(__dirname, '../../.env') });
// Also try server-local .env as override (won't fail if absent).
loadEnv({ path: path.resolve(__dirname, '../.env'), override: true });

// Treat the literal placeholder string as missing — preserves the prior
// `hasRealKey` semantics from the dotenv-only implementation.
const PLACEHOLDER = 'your_key_here';
const hasRealKey = (k: string | undefined): k is string =>
  typeof k === 'string' && k.length > 0 && k !== PLACEHOLDER;

const EnvSchema = z.object({
  PORT: z.string().optional().default('3001'),
  GOOGLE_SOLAR_API_KEY: z.string().optional(),
  NREL_API_KEY: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),
  USE_MOCK_APIS: z
    .enum(['true', 'false', 'auto'])
    .optional()
    .default('true'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Format and log the issues, then exit cleanly. Avoids dumping a stack trace
  // through ts-node-dev / test runners.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

const flag = env.USE_MOCK_APIS;
const auto = flag === 'auto';
const forceReal = flag === 'false';
const forceMock = !auto && !forceReal;

const googleSolarKey = env.GOOGLE_SOLAR_API_KEY ?? '';
const nrelKey = env.NREL_API_KEY ?? '';
const apifyToken = env.APIFY_TOKEN ?? '';

export const config = {
  port: parseInt(env.PORT, 10),
  googleSolarApiKey: googleSolarKey,
  nrelApiKey: nrelKey,
  apifyToken,
  useMockSolar: forceMock || (auto && !hasRealKey(googleSolarKey)),
  useMockPvwatts: forceMock || (auto && !hasRealKey(nrelKey)),
  apifyEnabled: hasRealKey(apifyToken),
};
