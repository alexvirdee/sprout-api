/**
 * auth.controller — thin HTTP layer over auth.service. Validation happens in
 * route middleware; errors flow to the error handler via asyncHandler.
 */

import { Request, Response } from 'express';

import * as authService from '../services/auth.service';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const register = async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
};

export const google = async (req: Request, res: Response) => {
  const result = await authService.loginWithGoogle(req.body.idToken);
  res.json(result);
};

export const refresh = async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
};

export const logout = async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.json({ ok: true });
};

export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');
  res.json({ user: user.toJSON() });
};

export const forgotPassword = async (req: Request, res: Response) => {
  // Groundwork: always respond the same way (never reveal whether an email
  // exists). A real implementation would create a reset token + send an email.
  logger.info(`Password reset requested for ${req.body.email}`);
  res.json({ ok: true });
};
