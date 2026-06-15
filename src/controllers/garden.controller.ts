/**
 * garden.controller — CRUD for the signed-in user's gardens. Every query is
 * scoped by userId so users only ever touch their own data. Delete is a soft
 * archive (sets archivedAt) so gardens — and their future plants/tasks — can be
 * restored once archive management lands.
 */

import { Request, Response } from 'express';

import { Garden } from '../models/Garden';
import { AppError } from '../utils/AppError';

export const list = async (req: Request, res: Response) => {
  const gardens = await Garden.find({ userId: req.userId, archivedAt: null }).sort({ updatedAt: -1 });
  res.json({ gardens });
};

export const create = async (req: Request, res: Response) => {
  const garden = await Garden.create({ ...req.body, userId: req.userId });
  res.status(201).json({ garden });
};

export const getOne = async (req: Request, res: Response) => {
  const garden = await Garden.findOne({ _id: req.params.id, userId: req.userId });
  if (!garden) throw AppError.notFound('Garden not found');
  res.json({ garden });
};

export const update = async (req: Request, res: Response) => {
  const garden = await Garden.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!garden) throw AppError.notFound('Garden not found');
  res.json({ garden });
};

export const remove = async (req: Request, res: Response) => {
  // Soft archive — keep the garden (and its data) recoverable.
  const garden = await Garden.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, archivedAt: null },
    { archivedAt: new Date() },
    { new: true }
  );
  if (!garden) throw AppError.notFound('Garden not found');
  res.json({ garden, archived: true });
};
