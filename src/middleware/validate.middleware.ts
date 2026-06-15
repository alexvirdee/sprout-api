/**
 * validate — runs a Zod schema against part of the request and replaces it with
 * the parsed (typed, coerced) value. Validation failures become 400s.
 */

import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

import { AppError } from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw AppError.badRequest('Validation failed', result.error.flatten().fieldErrors);
    }
    // Reassign the validated data (query/params are read-only getters in newer
    // Express, so guard the assignment).
    if (source === 'body') req.body = result.data;
    next();
  };
}
