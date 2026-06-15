/**
 * token.service — a single signed JWT per session.
 *
 * The token carries `userId` and expires after JWT_EXPIRES_IN (default 7d).
 * Signed/verified with JWT_SECRET (required, validated at boot in config/env).
 */

import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface TokenPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId?: string; sub?: string };
    const userId = decoded.userId ?? decoded.sub;
    if (!userId) throw new Error('Token missing userId');
    return { userId };
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
}
