/**
 * task.controller — CRUD for care tasks, scoped by userId. Tasks reference a
 * plant (which must be in one of the user's gardens).
 */

import { Request, Response } from 'express';

import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { Task } from '../models/Task';
import { AppError } from '../utils/AppError';

async function assertOwnsPlant(userId: string | undefined, plantId: string) {
  const plant = await Plant.findById(plantId);
  if (!plant) throw AppError.notFound('Plant not found');
  const garden = await Garden.findOne({ _id: plant.gardenId, userId });
  if (!garden) throw AppError.forbidden('That plant is not in your garden');
  return plant;
}

export const list = async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { userId: req.userId };
  if (req.query.completed === 'true') filter.completed = true;
  if (req.query.completed === 'false') filter.completed = false;
  if (typeof req.query.plantId === 'string') filter.plantId = req.query.plantId;

  const tasks = await Task.find(filter).sort({ dueDate: 1 });
  res.json({ tasks });
};

export const create = async (req: Request, res: Response) => {
  await assertOwnsPlant(req.userId, req.body.plantId);
  const task = await Task.create({ ...req.body, userId: req.userId });
  res.status(201).json({ task });
};

export const update = async (req: Request, res: Response) => {
  const updates = { ...req.body };
  if (typeof updates.completed === 'boolean') {
    updates.completedAt = updates.completed ? new Date() : undefined;
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    updates,
    { new: true, runValidators: true }
  );
  if (!task) throw AppError.notFound('Task not found');
  res.json({ task });
};

export const remove = async (req: Request, res: Response) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!task) throw AppError.notFound('Task not found');
  res.json({ ok: true });
};
