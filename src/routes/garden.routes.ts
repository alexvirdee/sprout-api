/**
 * /api/gardens — CRUD (all routes require auth).
 */

import { Router } from 'express';

import * as garden from '../controllers/garden.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createGardenSchema, updateGardenSchema } from '../validators';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(garden.list));
router.post('/', validate(createGardenSchema), asyncHandler(garden.create));
router.get('/:id', asyncHandler(garden.getOne));
router.patch('/:id', validate(updateGardenSchema), asyncHandler(garden.update));
router.delete('/:id', asyncHandler(garden.remove));

export default router;
