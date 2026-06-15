/**
 * garden.controller — CRUD for the signed-in user's gardens. Every query is
 * scoped by userId so users only ever touch their own data.
 */

import { Request, Response } from 'express';

import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { AppError } from '../utils/AppError';

export const list = async (req: Request, res: Response) => {
  const gardens = await Garden.find({ userId: req.userId }).sort({ createdAt: -1 });
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
  const garden = await Garden.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!garden) throw AppError.notFound('Garden not found');
  // Tidy up the plants that lived in this garden.
  await Plant.deleteMany({ gardenId: garden._id });
  res.json({ ok: true });
};
