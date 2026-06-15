/**
 * Express app assembly: security + parsing + logging middleware, the API
 * router under /api, and the not-found / error handlers last.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import apiRouter from './routes';
import { notFound, errorHandler } from './middleware/error.middleware';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigins.length ? env.clientOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!env.isProd) app.use(morgan('dev'));

  app.get('/', (_req, res) => {
    res.json({ name: 'Sprout API', docs: '/api/health' });
  });

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
