/**
 * plant.controller — CRUD for plants, scoped to the authenticated user. Create
 * verifies the parent garden belongs to the user; create/archive keep the
 * garden's denormalized `plantCount` in sync. Delete is a soft archive.
 */

import { Request, Response } from 'express';

import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { AppError } from '../utils/AppError';

async function assertOwnsGarden(userId: string | undefined, gardenId: string) {
  const garden = await Garden.findOne({ _id: gardenId, userId });
  if (!garden) throw AppError.notFound('Garden not found');
  return garden;
}

export const list = async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { userId: req.userId, archivedAt: null };
  if (typeof req.query.gardenId === 'string') filter.gardenId = req.query.gardenId;

  const plants = await Plant.find(filter).sort({ createdAt: -1 });
  res.json({ plants });
};

export const create = async (req: Request, res: Response) => {
  await assertOwnsGarden(req.userId, req.body.gardenId);
  const plant = await Plant.create({ ...req.body, userId: req.userId });
  await Garden.updateOne({ _id: plant.gardenId }, { $inc: { plantCount: 1 } });
  res.status(201).json({ plant });
};

export const getOne = async (req: Request, res: Response) => {
  const plant = await Plant.findOne({ _id: req.params.id, userId: req.userId });
  if (!plant) throw AppError.notFound('Plant not found');
  res.json({ plant });
};

export const update = async (req: Request, res: Response) => {
  const plant = await Plant.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!plant) throw AppError.notFound('Plant not found');
  res.json({ plant });
};

export const remove = async (req: Request, res: Response) => {
  // Soft archive — keep the plant recoverable.
  const plant = await Plant.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, archivedAt: null },
    { archivedAt: new Date(), status: 'archived' },
    { new: true }
  );
  if (!plant) throw AppError.notFound('Plant not found');
  await Garden.updateOne({ _id: plant.gardenId, plantCount: { $gt: 0 } }, { $inc: { plantCount: -1 } });
  res.json({ plant, archived: true });
};
