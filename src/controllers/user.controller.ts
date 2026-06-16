/**
 * user.controller — the signed-in user's account center: profile read/update,
 * preferences (theme + notifications), gardening stats, and achievements.
 * Everything is scoped to req.userId (set by `protect`).
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { User, NotificationPreferences, ThemePreference } from '../models/User';
import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { WateringLog } from '../models/WateringLog';
import { JournalEntry } from '../models/JournalEntry';
import { Task } from '../models/Task';
import { AppError } from '../utils/AppError';
import { streakStats } from '../utils/streak';
import { ACHIEVEMENT_DEFS, AchievementMetrics } from '../utils/achievements';

export const getProfile = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');
  res.json({ user: user.toJSON() });
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');

  if (typeof body.email === 'string' && body.email.toLowerCase() !== user.email) {
    const taken = await User.findOne({ email: body.email.toLowerCase(), _id: { $ne: user._id } });
    if (taken) throw AppError.badRequest('That email is already in use');
    user.email = body.email.toLowerCase();
  }

  if (typeof body.displayName === 'string') user.displayName = body.displayName;
  if (typeof body.firstName === 'string') user.firstName = body.firstName;
  if (typeof body.lastName === 'string') user.lastName = body.lastName;
  if (typeof body.bio === 'string') user.bio = body.bio;
  if (typeof body.location === 'string') user.location = body.location;
  if (body.avatar === null || typeof body.avatar === 'string') user.avatar = body.avatar as string | null;

  // Keep canonical `name` in sync (it's required + used for auth / the header):
  // prefer an explicit name, else derive from first + last.
  if (typeof body.name === 'string' && body.name.trim()) {
    user.name = body.name.trim();
  } else if (typeof body.firstName === 'string' || typeof body.lastName === 'string') {
    const derived = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (derived) user.name = derived;
  }

  await user.save();
  res.json({ user: user.toJSON() });
};

export const updateTheme = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.userId,
    { themePreference: req.body.themePreference as ThemePreference },
    { new: true, runValidators: true }
  );
  if (!user) throw AppError.notFound('User not found');
  res.json({ user: user.toJSON() });
};

function mergeNotifications(
  current: NotificationPreferences,
  incoming: Partial<NotificationPreferences>
): NotificationPreferences {
  return {
    pushEnabled: incoming.pushEnabled ?? current.pushEnabled,
    wateringReminders: incoming.wateringReminders ?? current.wateringReminders,
    careTips: incoming.careTips ?? current.careTips,
    seasonalTips: incoming.seasonalTips ?? current.seasonalTips,
    achievements: incoming.achievements ?? current.achievements,
  };
}

export const updateNotifications = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');
  user.notificationPreferences = mergeNotifications(user.notificationPreferences, req.body);
  await user.save();
  res.json({ user: user.toJSON() });
};

export const updatePreferences = async (req: Request, res: Response) => {
  const body = req.body as {
    themePreference?: ThemePreference;
    notificationPreferences?: Partial<NotificationPreferences>;
  };
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');

  if (body.themePreference) user.themePreference = body.themePreference;
  if (body.notificationPreferences) {
    user.notificationPreferences = mergeNotifications(user.notificationPreferences, body.notificationPreferences);
  }
  await user.save();
  res.json({ user: user.toJSON() });
};

/** All the counts + streaks the profile derives from real activity. */
async function gatherMetrics(userId: string | undefined) {
  const [
    gardensActive,
    gardensTotal,
    plantsActive,
    plantsTotal,
    wateringSessions,
    harvests,
    harvestLogs,
    tasksCompleted,
    logs,
  ] = await Promise.all([
    Garden.countDocuments({ userId, archivedAt: null }),
    Garden.countDocuments({ userId }),
    Plant.countDocuments({ userId, archivedAt: null }),
    Plant.countDocuments({ userId }),
    WateringLog.countDocuments({ userId }),
    Plant.countDocuments({ userId, status: 'harvested' }),
    JournalEntry.countDocuments({ userId, type: 'harvest' }),
    Task.countDocuments({ userId, completed: true }),
    WateringLog.find({ userId }).select('createdAt').lean(),
  ]);

  const { current, longest } = streakStats(logs.map((l) => l.createdAt as Date));

  return {
    gardensActive,
    gardensTotal,
    plantsActive,
    plantsTotal,
    wateringSessions,
    harvests,
    harvestLogs,
    tasksCompleted,
    currentStreak: current,
    longestStreak: longest,
  };
}

export const getStats = async (req: Request, res: Response) => {
  const m = await gatherMetrics(req.userId);
  const user = await User.findById(req.userId).select('createdAt');
  res.json({
    stats: {
      gardens: m.gardensActive,
      plants: m.plantsActive,
      wateringSessions: m.wateringSessions,
      harvests: m.harvests,
      harvestLogs: m.harvestLogs,
      tasksCompleted: m.tasksCompleted,
      currentStreak: m.currentStreak,
      longestStreak: m.longestStreak,
      memberSince: user?.createdAt ?? null,
    },
  });
};

export const getAchievements = async (req: Request, res: Response) => {
  const m = await gatherMetrics(req.userId);
  const metrics: AchievementMetrics = {
    gardensTotal: m.gardensTotal,
    plantsTotal: m.plantsTotal,
    wateringSessions: m.wateringSessions,
    longestStreak: m.longestStreak,
    harvests: m.harvests,
    harvestLogs: m.harvestLogs,
  };

  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');

  const unlockedAtById = new Map(user.achievements.map((a) => [a.id, a.unlockedAt]));
  const now = new Date();
  let changed = false;

  const achievements = ACHIEVEMENT_DEFS.map((def) => {
    const unlocked = def.isUnlocked(metrics);
    let unlockedAt = unlockedAtById.get(def.id) ?? null;
    if (unlocked && !unlockedAt) {
      unlockedAt = now;
      user.achievements.push({ id: def.id, unlockedAt: now });
      changed = true;
    }
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      tone: def.tone,
      unlocked,
      unlockedAt: unlocked ? unlockedAt : null,
    };
  });

  if (changed) await user.save();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  res.json({ achievements, unlockedCount, total: achievements.length });
};

/* ---- Avatar (GridFS) ---- */

function avatarBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Storage is not ready');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'avatars' });
}

/** Absolute URL the client can render directly. PUBLIC_BASE_URL wins in prod;
 *  otherwise we mirror the host the request came in on (works for dev + LAN). */
function buildAvatarUrl(req: Request, fileId: string): string {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/api/users/avatar/${fileId}`;
}

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('Please choose an image to upload');

  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');

  const bucket = avatarBucket();
  const uploadStream = bucket.openUploadStream(`${user._id}-${Date.now()}`, {
    contentType: req.file.mimetype,
  });
  uploadStream.end(req.file.buffer);
  await new Promise<void>((resolve, reject) => {
    uploadStream.on('finish', () => resolve());
    uploadStream.on('error', reject);
  });

  const newId = uploadStream.id as mongoose.Types.ObjectId;
  const oldId = user.avatarFileId;
  user.avatarFileId = newId;
  user.avatar = buildAvatarUrl(req, newId.toString());
  await user.save();

  // Clean up the previous image so GridFS doesn't accumulate orphans.
  if (oldId) {
    try {
      await bucket.delete(oldId);
    } catch {
      /* already gone */
    }
  }

  res.json({ user: user.toJSON() });
};

export const removeAvatar = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.notFound('User not found');

  const oldId = user.avatarFileId;
  user.avatar = null;
  user.avatarFileId = null;
  await user.save();

  if (oldId) {
    try {
      await avatarBucket().delete(oldId);
    } catch {
      /* already gone */
    }
  }

  res.json({ user: user.toJSON() });
};

/** Public: streams avatar bytes so <Image source={{ uri }}> loads without auth. */
export const getAvatar = async (req: Request, res: Response) => {
  let fileId: mongoose.Types.ObjectId;
  try {
    fileId = new mongoose.Types.ObjectId(req.params.fileId);
  } catch {
    throw AppError.notFound('Avatar not found');
  }

  const bucket = avatarBucket();
  const files = await bucket.find({ _id: fileId }).limit(1).toArray();
  if (!files.length) throw AppError.notFound('Avatar not found');

  res.setHeader('Content-Type', files[0].contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  bucket
    .openDownloadStream(fileId)
    .on('error', () => {
      if (!res.headersSent) res.status(404).end();
    })
    .pipe(res);
};
