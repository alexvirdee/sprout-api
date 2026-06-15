/**
 * user.controller — the signed-in user's profile (read + light update).
 */

import { Request, Response } from 'express';

import { User } from '../models/User';
import { AppError } from '../utils/AppError';

export const getProfile = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');
  res.json({ user: user.toJSON() });
};

export const updateProfile = async (req: Request, res: Response) => {
  const allowed: Record<string, unknown> = {};
  if (typeof req.body.name === 'string') allowed.name = req.body.name.trim();
  if (typeof req.body.avatar === 'string') allowed.avatar = req.body.avatar;

  const user = await User.findByIdAndUpdate(req.userId, allowed, {
    new: true,
    runValidators: true,
  });
  if (!user) throw AppError.notFound('User not found');
  res.json({ user: user.toJSON() });
};
