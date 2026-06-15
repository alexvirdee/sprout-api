/**
 * Server entry point. Connects to MongoDB, then starts listening. Guards
 * against unhandled rejections and supports graceful shutdown.
 */

import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';

async function start(): Promise<void> {
  try {
    await connectDatabase();

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`Sprout API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = async (signal: string) => {
      logger.warn(`${signal} received — shutting down`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

void start();
