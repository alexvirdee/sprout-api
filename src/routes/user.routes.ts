/**
 * /api/users — the signed-in account center: profile read/update, preferences
 * (theme + notifications), stats, achievements, and avatar upload/serve.
 * Avatar serving is public (so <Image> can load it); everything else requires auth.
 */

import { Router } from 'express';
import multer from 'multer';

import * as user from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  updateMeSchema,
  updatePreferencesSchema,
  updateThemeSchema,
  notificationPreferencesSchema,
} from '../validators';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const router = Router();

// Public — avatar images load via <Image source={{ uri }}> without an auth header.
router.get('/avatar/:fileId', asyncHandler(user.getAvatar));

router.use(protect);

router.get('/me', asyncHandler(user.getProfile));
router.patch('/me', validate(updateMeSchema), asyncHandler(user.updateProfile));

router.patch('/preferences', validate(updatePreferencesSchema), asyncHandler(user.updatePreferences));
router.patch('/theme', validate(updateThemeSchema), asyncHandler(user.updateTheme));
router.patch('/notifications', validate(notificationPreferencesSchema), asyncHandler(user.updateNotifications));

router.get('/stats', asyncHandler(user.getStats));
router.get('/achievements', asyncHandler(user.getAchievements));

router.post('/avatar', avatarUpload.single('avatar'), asyncHandler(user.uploadAvatar));
router.delete('/avatar', asyncHandler(user.removeAvatar));

export default router;
