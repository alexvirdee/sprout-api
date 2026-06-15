/**
 * /api/watering — log waterings + history + stats (all routes require auth).
 * /recent and /stats are declared before /:id so they aren't shadowed.
 */

import { Router } from 'express';

import * as watering from '../controllers/watering.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createWateringSchema } from '../validators';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(watering.list));
router.get('/recent', asyncHandler(watering.recent));
router.get('/stats', asyncHandler(watering.stats));
router.post('/', validate(createWateringSchema), asyncHandler(watering.create));
router.get('/:id', asyncHandler(watering.getOne));
router.delete('/:id', asyncHandler(watering.remove));

export default router;
