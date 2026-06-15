/**
 * /api/auth — register, login, Google, token refresh, logout, me, forgot.
 */

import { Router } from 'express';

import * as auth from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '../validators';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(auth.register));
router.post('/login', validate(loginSchema), asyncHandler(auth.login));
router.post('/google', validate(googleSchema), asyncHandler(auth.google));
router.post('/refresh', validate(refreshSchema), asyncHandler(auth.refresh));
router.post('/logout', validate(refreshSchema), asyncHandler(auth.logout));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(auth.forgotPassword));
router.get('/me', protect, asyncHandler(auth.me));

export default router;
