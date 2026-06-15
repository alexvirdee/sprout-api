/**
 * notFound + errorHandler — the last middleware in the chain. Normalizes
 * AppError, Mongoose validation/duplicate-key errors, and unknown errors into
 * a consistent JSON shape: { message, status, details? }.
 */

import { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  let status = 500;
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof MongooseError.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    status = 409;
    message = 'A record with that value already exists';
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (status >= 500) logger.error('Unhandled error', err);

  res.status(status).json({
    message,
    status,
    ...(details ? { details } : {}),
    ...(!env.isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
}
