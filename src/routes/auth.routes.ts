/**
 * /api/auth — credentials sign-up / sign-in, current user, and Google
 * groundwork. Logout is client-side (the app deletes its stored token), so
 * there is no logout endpoint for the stateless JWT.
 */

import { Router } from 'express';

import * as auth from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { forgotPasswordSchema, googleSchema, loginSchema, signupSchema } from '../validators';

const router = Router();

router.post('/signup', validate(signupSchema), asyncHandler(auth.signup));
router.post('/login', validate(loginSchema), asyncHandler(auth.login));
router.post('/google', validate(googleSchema), asyncHandler(auth.google));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(auth.forgotPassword));
router.get('/me', protect, asyncHandler(auth.me));

export default router;
