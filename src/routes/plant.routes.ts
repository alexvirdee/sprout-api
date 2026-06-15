/**
 * /api/plants — CRUD (all routes require auth).
 */

import { Router } from 'express';

import * as plant from '../controllers/plant.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPlantSchema, updatePlantSchema } from '../validators';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(plant.list));
router.post('/', validate(createPlantSchema), asyncHandler(plant.create));
router.get('/:id', asyncHandler(plant.getOne));
router.patch('/:id', validate(updatePlantSchema), asyncHandler(plant.update));
router.delete('/:id', asyncHandler(plant.remove));

export default router;
