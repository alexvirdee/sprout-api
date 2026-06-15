/**
 * protect — gate for authenticated routes. Expects `Authorization: Bearer
 * <accessToken>`, verifies it, and attaches req.userId.
 */

import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../services/token.service';

export function protect(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing access token');
  }

  const token = header.slice('Bearer '.length).trim();
  const { sub } = verifyAccessToken(token);
  req.userId = sub;
  next();
}
