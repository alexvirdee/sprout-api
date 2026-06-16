/**
 * ai.controller — accepts an authenticated multipart image and returns a
 * structured plant identification. The image is held in memory and not stored.
 */

import { Request, Response } from 'express';

import { AppError } from '../utils/AppError';
import { identifyPlant } from '../services/aiPlant.service';

export const identify = async (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.badRequest('Please attach a plant photo.');
  }

  // Lightweight usage log for cost visibility (no image bytes logged).
  // eslint-disable-next-line no-console
  console.log(`[ai] plant-identify user=${req.userId} size=${req.file.size}B type=${req.file.mimetype}`);

  const identification = await identifyPlant(req.file.buffer.toString('base64'), req.file.mimetype);
  res.json({ identification });
};
