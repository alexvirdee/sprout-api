/**
 * auth.service — credentials sign-up / sign-in (and Google groundwork). Returns
 * a single JWT plus the public user JSON (passwordHash is never included).
 */

import bcrypt from 'bcryptjs';

import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { signToken } from './token.service';
import { verifyGoogleIdToken } from './google.service';

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: Record<string, unknown>;
}

function sessionFor(user: IUser): AuthResult {
  return { token: signToken(user.id), user: user.toJSON() as Record<string, unknown> };
}

export async function signup(params: {
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
    authProvider: 'credentials',
  });

  return sessionFor(user);
}

export async function login(params: { email: string; password: string }): Promise<AuthResult> {
  const email = params.email.toLowerCase().trim();
  // Generic error for both "no user" and "wrong password" — never reveal which.
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash) throw AppError.unauthorized('Invalid email or password');

  const ok = await user.comparePassword(params.password);
  if (!ok) throw AppError.unauthorized('Invalid email or password');

  return sessionFor(user);
}

/** Google groundwork — not wired to the UI yet, kept compiling for later. */
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
    user.googleId = profile.googleId;
    if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
    await user.save();
  }

  return sessionFor(user);
}
