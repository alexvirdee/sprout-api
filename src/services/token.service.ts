/**
 * token.service — JWT access tokens + rotating, revocable refresh tokens.
 *
 * Access token: short-lived JWT (signed with JWT_ACCESS_SECRET).
 * Refresh token: longer-lived JWT (JWT_REFRESH_SECRET) whose SHA-256 hash is
 * persisted in RefreshToken. On refresh we verify the JWT *and* confirm the
 * stored hash is present and not revoked, then rotate (revoke old, issue new).
 */

import crypto from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { RefreshToken } from '../models/RefreshToken';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccessPayload {
  sub: string;
}

const hash = (raw: string): string => crypto.createHash('sha256').update(raw).digest('hex');

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    return decoded;
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
}

async function signRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);

  const decoded = jwt.decode(token) as { exp: number };
  await RefreshToken.create({
    userId,
    tokenHash: hash(token),
    expiresAt: new Date(decoded.exp * 1000),
  });

  return token;
}

export async function issueTokens(userId: string): Promise<TokenPair> {
  const accessToken = signAccessToken(userId);
  const refreshToken = await signRefreshToken(userId);
  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(rawRefresh: string): Promise<TokenPair & { userId: string }> {
  let payload: { sub: string };
  try {
    payload = jwt.verify(rawRefresh, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hash(rawRefresh) });
  if (!stored || stored.revokedAt) {
    throw AppError.unauthorized('Refresh token is no longer valid');
  }

  // Rotate: revoke the used token, issue a fresh pair.
  stored.revokedAt = new Date();
  await stored.save();

  const tokens = await issueTokens(payload.sub);
  return { ...tokens, userId: payload.sub };
}

export async function revokeRefreshToken(rawRefresh: string): Promise<void> {
  await RefreshToken.updateOne(
    { tokenHash: hash(rawRefresh) },
    { $set: { revokedAt: new Date() } }
  );
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}
