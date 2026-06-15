/**
 * MongoDB connection via Mongoose. Call connectDatabase() at boot; the server
 * waits for the connection before listening.
 */

import mongoose from 'mongoose';

import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info(`MongoDB connected → db "${mongoose.connection.name}"`),
  );
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  // The URI selects the cluster/environment; the database name is pinned via
  // env.MONGODB_DB (default "sprout") so data lands in the same db across
  // dev/prod — never the implicit "test" fallback when the URI omits a path.
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
