/**
 * /api/ai — AI helpers (auth required). V1: plant identification from a photo.
 * Rate-limited to control vision-model cost.
 */

import { Router } from 'express';

import * as ai from '../controllers/ai.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { singleImage } from '../middleware/upload.middleware';
import { rateLimit } from '../middleware/rateLimit.middleware';

const router = Router();
router.use(protect);

router.post(
  '/plant-identify',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'You’ve reached the scan limit for now. Please try again later.' }),
  singleImage('image'),
  asyncHandler(ai.identify)
);

export default router;
