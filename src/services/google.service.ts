/**
 * google.service — verifies Google ID tokens sent by the mobile app
 * ("Continue with Google"). Groundwork: returns the verified profile so
 * auth.service can find-or-create the user.
 *
 * The web redirect flow (passport-style) can be added later using
 * GOOGLE_CLIENT_SECRET + GOOGLE_CALLBACK_URL; the ID-token path below is what
 * the React Native client uses.
 */

import { OAuth2Client } from 'google-auth-library';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.googleConfigured) {
    throw AppError.badRequest('Google sign-in is not configured on the server');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw AppError.unauthorized('Could not verify Google token');
  }

  if (!payload?.sub || !payload.email) {
    throw AppError.unauthorized('Google token missing required fields');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    avatar: payload.picture,
  };
}
