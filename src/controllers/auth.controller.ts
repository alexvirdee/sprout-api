/**
 * auth.controller — thin HTTP layer over auth.service. Validation happens in
 * route middleware; errors flow to the error handler via asyncHandler.
 *
 *   POST /api/auth/signup  → 201 { token, user }
 *   POST /api/auth/login   → 200 { token, user }
 *   GET  /api/auth/me      → 200 { user }
 */

import { Request, Response } from 'express';

import * as authService from '../services/auth.service';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const signup = async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
};

/** Google groundwork — route kept for later; UI is not wired to it yet. */
export const google = async (req: Request, res: Response) => {
  const result = await authService.loginWithGoogle(req.body.idToken);
  res.json(result);
};

export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.unauthorized('Invalid or expired token');
  res.json({ user: user.toJSON() });
};

export const forgotPassword = async (req: Request, res: Response) => {
  // Always respond the same way (never reveal whether an email exists).
  logger.info(`Password reset requested for ${req.body.email}`);
  res.json({ ok: true });
};
