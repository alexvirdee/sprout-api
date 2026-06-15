/**
 * asyncHandler — wrap async route handlers so thrown/rejected errors flow to
 * the Express error middleware without try/catch in every controller.
 */

import { NextFunction, Request, Response } from 'express';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
