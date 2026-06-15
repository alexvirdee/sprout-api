/**
 * Environment loading + validation. Fails fast with a clear message if a
 * required variable is missing, so misconfiguration is caught at boot.
 *
 * Auth uses a single signed JWT: JWT_SECRET (required) + JWT_EXPIRES_IN (7d).
 */

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Comma-separated list of allowed CORS origins (web/dev tools). Native apps
  // are not subject to CORS, so this mainly matters for the web build.
  CLIENT_ORIGIN: z.string().default('http://localhost:8081'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  // Database name. The connection string selects the cluster/environment; the
  // data always lives in this database (same across dev/prod).
  MONGODB_DB: z.string().default('sprout'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be set (use a long random string, 16+ chars)'),
  JWT_EXPIRES_IN: z.string().default('7d'),

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
  clientOrigins: data.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  isProd: data.NODE_ENV === 'production',
  googleConfigured: Boolean(data.GOOGLE_CLIENT_ID),
};
