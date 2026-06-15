/**
 * watering.controller — log waterings, fetch history, and compute daily stats /
 * streaks. Every query is scoped to the authenticated user; creating a log
 * updates the garden (and plant) rollups: lastWateredAt, wateringCount, streak.
 */

import { Request, Response } from 'express';

import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { WateringLog } from '../models/WateringLog';
import { AppError } from '../utils/AppError';

const DAY_MS = 86_400_000;
const dayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Consecutive days (ending today, or yesterday if not yet watered today) with ≥1 log. */
async function computeStreak(userId: string | undefined, gardenId?: string): Promise<number> {
  const filter: Record<string, unknown> = { userId };
  if (gardenId) filter.gardenId = gardenId;
  const logs = await WateringLog.find(filter).sort({ createdAt: -1 }).select('createdAt').limit(400);
  if (!logs.length) return 0;

  const days = new Set(logs.map((l) => dayStart(l.createdAt).getTime()));
  const today = dayStart(new Date()).getTime();
  let cursor = days.has(today) ? today : days.has(today - DAY_MS) ? today - DAY_MS : null;
  if (cursor == null) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

async function assertOwnsGarden(userId: string | undefined, gardenId: string) {
  const garden = await Garden.findOne({ _id: gardenId, userId });
  if (!garden) throw AppError.notFound('Garden not found');
  return garden;
}

export const list = async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { userId: req.userId };
  if (typeof req.query.gardenId === 'string') filter.gardenId = req.query.gardenId;
  if (typeof req.query.plantId === 'string') filter.plantId = req.query.plantId;
  const logs = await WateringLog.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ logs });
};

export const recent = async (req: Request, res: Response) => {
  const logs = await WateringLog.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(30);
  res.json({ logs });
};

export const stats = async (req: Request, res: Response) => {
  const userId = req.userId;
  const today = dayStart(new Date());

  const todayLogs = await WateringLog.find({ userId, createdAt: { $gte: today } }).select('gardenId plantId');
  const gardensWateredToday = new Set(todayLogs.map((l) => l.gardenId.toString())).size;
  const plantsWateredToday = new Set(
    todayLogs.filter((l) => l.plantId).map((l) => l.plantId!.toString())
  ).size;

  const gardens = await Garden.find({ userId, archivedAt: null }).select('lastWateredAt');
  const now = Date.now();
  const gardensNeedingAttention = gardens.filter(
    (g) => !g.lastWateredAt || now - new Date(g.lastWateredAt).getTime() >= 5 * DAY_MS
  ).length;

  const weekStart = dayStart(new Date(now - 6 * DAY_MS));
  const weekSessions = await WateringLog.countDocuments({ userId, createdAt: { $gte: weekStart } });

  res.json({
    gardensWateredToday,
    plantsWateredToday,
    gardensNeedingAttention,
    totalGardens: gardens.length,
    currentStreak: await computeStreak(userId),
    weekSessions,
  });
};

export const create = async (req: Request, res: Response) => {
  const { gardenId, plantId, wateringTarget, wateringType, notes } = req.body as {
    gardenId: string;
    plantId?: string;
    wateringTarget: string;
    wateringType: string;
    notes?: string;
  };

  await assertOwnsGarden(req.userId, gardenId);

  let plant = null;
  if (wateringTarget === 'plant') {
    if (!plantId) throw AppError.badRequest('plantId is required when watering a plant');
    plant = await Plant.findOne({ _id: plantId, userId: req.userId, gardenId });
    if (!plant) throw AppError.notFound('Plant not found');
  }

  const log = await WateringLog.create({
    userId: req.userId,
    gardenId,
    plantId: plant ? plantId : undefined,
    wateringTarget,
    wateringType,
    notes,
  });

  const now = new Date();
  const garden = await Garden.findById(gardenId);
  if (garden) {
    garden.lastWateredAt = now;
    garden.wateringCount = (garden.wateringCount ?? 0) + 1;
    garden.wateringStreak = await computeStreak(req.userId, gardenId);
    await garden.save();
  }
  if (plant) {
    plant.lastWateredAt = now;
    plant.wateringCount = (plant.wateringCount ?? 0) + 1;
    await plant.save();
  }

  res.status(201).json({ log });
};

export const getOne = async (req: Request, res: Response) => {
  const log = await WateringLog.findOne({ _id: req.params.id, userId: req.userId });
  if (!log) throw AppError.notFound('Watering log not found');
  res.json({ log });
};

export const remove = async (req: Request, res: Response) => {
  const log = await WateringLog.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!log) throw AppError.notFound('Watering log not found');
  res.json({ ok: true });
};
