/**
 * Environment loading + validation. Fails fast with a clear message if a
 * required variable is missing, so misconfiguration is caught at boot.
 */

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGINS: z.string().default('http://localhost:8081'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  // Database name. The connection string selects the cluster/environment
  // (e.g. a "sprout-dev" or "sprout-prod" Atlas deployment); the data always
  // lives in this database, identical across environments.
  MONGODB_DB: z.string().default('sprout'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be set (16+ chars)'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be set (16+ chars)'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  clientOrigins: data.CLIENT_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  isProd: data.NODE_ENV === 'production',
  googleConfigured: Boolean(data.GOOGLE_CLIENT_ID),
};
