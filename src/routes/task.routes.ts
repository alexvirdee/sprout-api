/**
 * /api/tasks — CRUD (all routes require auth).
 */

import { Router } from 'express';

import * as task from '../controllers/task.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(task.list));
router.post('/', validate(createTaskSchema), asyncHandler(task.create));
router.patch('/:id', validate(updateTaskSchema), asyncHandler(task.update));
router.delete('/:id', asyncHandler(task.remove));

export default router;
