/**
 * /api/users — the signed-in profile (all routes require auth).
 */

import { Router } from 'express';

import * as user from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/me', asyncHandler(user.getProfile));
router.patch('/me', asyncHandler(user.updateProfile));

export default router;
