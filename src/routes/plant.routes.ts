/**
 * /api/plants — CRUD (all routes require auth).
 */

import { Router } from 'express';

import * as plant from '../controllers/plant.controller';
import * as care from '../controllers/care.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPlantSchema, updatePlantSchema, enableCareSuggestionsSchema } from '../validators';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(plant.list));
router.post('/', validate(createPlantSchema), asyncHandler(plant.create));
router.get('/:id', asyncHandler(plant.getOne));
router.patch('/:id', validate(updatePlantSchema), asyncHandler(plant.update));
router.delete('/:id', asyncHandler(plant.remove));

// Rules-based care suggestions for a plant + enabling them as tasks.
router.get('/:plantId/care-suggestions', asyncHandler(care.getSuggestions));
// AI-refined suggestions (tunes the rules for variety/season; falls back to rules).
router.post('/:plantId/ai-care-suggestions', asyncHandler(care.getAiSuggestions));
router.post(
  '/:plantId/enable-care-suggestions',
  validate(enableCareSuggestionsSchema),
  asyncHandler(care.enableSuggestions)
);

export default router;
