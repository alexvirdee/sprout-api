/**
 * /api/care-tasks — scheduled care reminders (all routes require auth).
 */

import { Router } from 'express';

import * as care from '../controllers/care.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCareTaskSchema, updateCareTaskSchema, rescheduleCareTaskSchema } from '../validators';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(care.list));
router.post('/', validate(createCareTaskSchema), asyncHandler(care.create));
router.get('/:id', asyncHandler(care.getOne));
router.patch('/:id', validate(updateCareTaskSchema), asyncHandler(care.update));
router.post('/:id/complete', asyncHandler(care.complete));
router.post('/:id/skip', asyncHandler(care.skip));
router.post('/:id/reschedule', validate(rescheduleCareTaskSchema), asyncHandler(care.reschedule));
router.delete('/:id', asyncHandler(care.remove));

export default router;
