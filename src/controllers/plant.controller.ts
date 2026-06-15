/**
 * plant.controller — CRUD for plants. Ownership is enforced by checking the
 * parent garden belongs to the user before any read/write.
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';

import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { AppError } from '../utils/AppError';

async function assertOwnsGarden(userId: string | undefined, gardenId: string) {
  const garden = await Garden.findOne({ _id: gardenId, userId });
  if (!garden) throw AppError.notFound('Garden not found');
  return garden;
}

export const list = async (req: Request, res: Response) => {
  const gardens = await Garden.find({ userId: req.userId }).select('_id');
  const gardenIds = gardens.map((g) => g._id);

  const filter: Record<string, unknown> = { gardenId: { $in: gardenIds } };
  if (typeof req.query.gardenId === 'string') {
    filter.gardenId = new Types.ObjectId(req.query.gardenId);
  }

  const plants = await Plant.find(filter).sort({ createdAt: -1 });
  res.json({ plants });
};

export const create = async (req: Request, res: Response) => {
  await assertOwnsGarden(req.userId, req.body.gardenId);
  const plant = await Plant.create(req.body);
  res.status(201).json({ plant });
};

export const getOne = async (req: Request, res: Response) => {
  const plant = await Plant.findById(req.params.id);
  if (!plant) throw AppError.notFound('Plant not found');
  await assertOwnsGarden(req.userId, plant.gardenId.toString());
  res.json({ plant });
};

export const update = async (req: Request, res: Response) => {
  const plant = await Plant.findById(req.params.id);
  if (!plant) throw AppError.notFound('Plant not found');
  await assertOwnsGarden(req.userId, plant.gardenId.toString());

  Object.assign(plant, req.body);
  await plant.save();
  res.json({ plant });
};

export const remove = async (req: Request, res: Response) => {
  const plant = await Plant.findById(req.params.id);
  if (!plant) throw AppError.notFound('Plant not found');
  await assertOwnsGarden(req.userId, plant.gardenId.toString());
  await plant.deleteOne();
  res.json({ ok: true });
};
