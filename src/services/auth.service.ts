/**
 * auth.service — registration, login, Google sign-in, token refresh, logout.
 * Returns plain user JSON (via toJSON transform) + a token pair.
 */

import bcrypt from 'bcryptjs';

import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { issueTokens, rotateRefreshToken, revokeRefreshToken, TokenPair } from './token.service';
import { verifyGoogleIdToken } from './google.service';

const SALT_ROUNDS = 10;

export interface AuthResult {
  user: ReturnType<IUser['toJSON']>;
  tokens: TokenPair;
}

async function withTokens(user: IUser): Promise<AuthResult> {
  const tokens = await issueTokens(user.id);
  return { user: user.toJSON(), tokens };
}

export async function register(params: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = params.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
  const user = await User.create({
    name: params.name.trim(),
    email,
    passwordHash,
    authProvider: 'local',
  });

  return withTokens(user);
}

export async function login(params: { email: string; password: string }): Promise<AuthResult> {
  const email = params.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Incorrect email or password');
  }

  const ok = await user.comparePassword(params.password);
  if (!ok) throw AppError.unauthorized('Incorrect email or password');

  return withTokens(user);
}

export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const profile = await verifyGoogleIdToken(idToken);

  let user = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email }],
  });

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      googleId: profile.googleId,
      authProvider: 'google',
    });
  } else if (!user.googleId) {
    // Link Google to an existing local account.
    user.googleId = profile.googleId;
    if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
    await user.save();
  }

  return withTokens(user);
}

export async function refresh(rawRefresh: string): Promise<AuthResult> {
  const { userId, ...tokens } = await rotateRefreshToken(rawRefresh);
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized('Account no longer exists');
  return { user: user.toJSON(), tokens };
}

export async function logout(rawRefresh: string): Promise<void> {
  await revokeRefreshToken(rawRefresh);
}
