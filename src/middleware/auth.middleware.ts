/**
 * protect — gate for authenticated routes. Expects `Authorization: Bearer
 * <accessToken>`, verifies it, and attaches req.userId.
 */

import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError';
import { verifyToken } from '../services/token.service';

export function protect(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid token');
  }

  const token = header.slice('Bearer '.length).trim();
  const { userId } = verifyToken(token);
  req.userId = userId;
  next();
}
