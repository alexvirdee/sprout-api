/**
 * care.controller — CareTask CRUD + complete/skip/reschedule, plus plant care
 * suggestions (rules-based) and enabling them as tasks. Everything is scoped to
 * req.userId, and garden/plant ownership is verified.
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';

import { CareTask, ICareTask } from '../models/CareTask';
import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { AppError } from '../utils/AppError';
import { suggestCareForPlant } from '../services/careSuggestion.service';
import { nextDueDate, youtubeSearchUrl } from '../services/careTask.service';

const DAY_MS = 86_400_000;

async function assertOwnsGarden(userId: string | undefined, gardenId: string) {
  const garden = await Garden.findOne({ _id: gardenId, userId });
  if (!garden) throw AppError.notFound('Garden not found');
  return garden;
}

async function assertOwnsPlant(userId: string | undefined, plantId: string) {
  const plant = await Plant.findOne({ _id: plantId, userId });
  if (!plant) throw AppError.notFound('Plant not found');
  return plant;
}

export const list = async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { userId: req.userId };
  if (typeof req.query.gardenId === 'string') filter.gardenId = req.query.gardenId;
  if (typeof req.query.plantId === 'string') filter.plantId = req.query.plantId;
  if (typeof req.query.dueBefore === 'string') {
    const d = new Date(req.query.dueBefore);
    if (!Number.isNaN(d.getTime())) filter.dueDate = { $lte: d };
  }

  const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
  if (status === 'completed') filter.completedAt = { $ne: null };
  else if (status === 'skipped') filter.skippedAt = { $ne: null };
  else if (status !== 'all') {
    // default: pending
    filter.completedAt = null;
    filter.skippedAt = null;
  }

  const tasks = await CareTask.find(filter).sort({ dueDate: 1 }).limit(200);
  res.json({ tasks });
};

export const create = async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  await assertOwnsGarden(req.userId, body.gardenId as string);
  if (typeof body.plantId === 'string') await assertOwnsPlant(req.userId, body.plantId);

  const task = await CareTask.create({ ...body, userId: req.userId, source: 'user' });
  res.status(201).json({ task });
};

export const getOne = async (req: Request, res: Response) => {
  const task = await CareTask.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw AppError.notFound('Care task not found');
  res.json({ task });
};

export const update = async (req: Request, res: Response) => {
  const task = await CareTask.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!task) throw AppError.notFound('Care task not found');
  res.json({ task });
};

/** Clone a recurring task into its next occurrence (pending). */
async function spawnNextOccurrence(task: ICareTask) {
  if (task.recurrence === 'none') return null;
  return CareTask.create({
    userId: task.userId,
    gardenId: task.gardenId,
    plantId: task.plantId ?? undefined,
    title: task.title,
    description: task.description,
    taskType: task.taskType,
    dueDate: nextDueDate(new Date(), task.recurrence, task.recurrenceIntervalDays),
    recurrence: task.recurrence,
    recurrenceIntervalDays: task.recurrenceIntervalDays,
    instructions: task.instructions,
    videoUrl: task.videoUrl,
    priority: task.priority,
    source: task.source,
  });
}

export const complete = async (req: Request, res: Response) => {
  const task = await CareTask.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw AppError.notFound('Care task not found');
  task.completedAt = new Date();
  task.skippedAt = null;
  await task.save();
  const next = await spawnNextOccurrence(task);
  res.json({ task: task.toJSON(), next: next ? next.toJSON() : null });
};

export const skip = async (req: Request, res: Response) => {
  const task = await CareTask.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw AppError.notFound('Care task not found');
  task.skippedAt = new Date();
  task.completedAt = null;
  await task.save();
  const next = await spawnNextOccurrence(task);
  res.json({ task: task.toJSON(), next: next ? next.toJSON() : null });
};

export const reschedule = async (req: Request, res: Response) => {
  const task = await CareTask.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw AppError.notFound('Care task not found');
  task.dueDate = req.body.dueDate as Date;
  task.completedAt = null;
  task.skippedAt = null;
  await task.save();
  res.json({ task: task.toJSON() });
};

export const remove = async (req: Request, res: Response) => {
  const task = await CareTask.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!task) throw AppError.notFound('Care task not found');
  res.json({ ok: true });
};

/* ---- Suggestions (mounted under /plants/:plantId) ---- */

export const getSuggestions = async (req: Request, res: Response) => {
  const plant = await assertOwnsPlant(req.userId, req.params.plantId);
  res.json({ suggestions: suggestCareForPlant({ name: plant.name, type: plant.type }) });
};

export const enableSuggestions = async (req: Request, res: Response) => {
  const plant = await assertOwnsPlant(req.userId, req.params.plantId);
  const keys = req.body.keys as string[];
  const selected = suggestCareForPlant({ name: plant.name, type: plant.type }).filter((s) => keys.includes(s.key));

  if (selected.length === 0) {
    res.status(201).json({ tasks: [] });
    return;
  }

  const now = Date.now();
  const docs = selected.map((s) => ({
    userId: req.userId as unknown as Types.ObjectId,
    gardenId: plant.gardenId,
    plantId: plant._id,
    title: s.title,
    description: s.detail,
    taskType: s.taskType,
    dueDate: new Date(now + s.firstDueInDays * DAY_MS),
    recurrence: s.recurrence,
    recurrenceIntervalDays: s.recurrenceIntervalDays ?? null,
    instructions: s.instructions,
    videoUrl: s.videoQuery ? youtubeSearchUrl(s.videoQuery) : undefined,
    priority: s.priority,
    source: 'system' as const,
  }));

  const tasks = await CareTask.insertMany(docs);
  res.status(201).json({ tasks: tasks.map((t) => t.toJSON()) });
};
