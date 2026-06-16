/**
 * rateLimit — a tiny in-memory, per-user fixed-window limiter. Good enough for
 * V1 cost control on the AI endpoint.
 *
 * NOTE: in-memory means it resets on restart and isn't shared across instances.
 * TODO: swap for a shared store (Redis) when running more than one instance.
 */

import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError';

interface Options {
  windowMs: number;
  max: number;
  message?: string;
}

export function rateLimit({ windowMs, max, message }: Options) {
  const hits = new Map<string, number[]>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.userId ?? req.ip ?? 'anonymous';
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      throw new AppError(429, message ?? 'You’ve reached the limit for now. Please try again later.');
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
