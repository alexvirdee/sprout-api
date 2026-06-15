/**
 * User model. Credentials (email + password) auth, with Google groundwork. The
 * password hash is `select: false` so it never leaks unless explicitly asked
 * for. toJSON maps _id → id, strips sensitive fields, and always exposes
 * `avatar` (null when unset) so the client contract is stable.
 */

import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type AuthProvider = 'credentials' | 'google';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface NotificationPreferences {
  pushEnabled: boolean;
  wateringReminders: boolean;
  careTips: boolean;
  seasonalTips: boolean;
  achievements: boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: string | null;
  avatarFileId?: Types.ObjectId | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  location?: string | null;
  themePreference: ThemePreference;
  notificationPreferences: NotificationPreferences;
  achievements: UnlockedAchievement[];
  authProvider: AuthProvider;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    avatar: { type: String, default: null },
    avatarFileId: { type: Schema.Types.ObjectId, default: null },
    displayName: { type: String, trim: true, default: null },
    firstName: { type: String, trim: true, default: null },
    lastName: { type: String, trim: true, default: null },
    bio: { type: String, trim: true, default: null },
    location: { type: String, trim: true, default: null },
    themePreference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notificationPreferences: {
      pushEnabled: { type: Boolean, default: true },
      wateringReminders: { type: Boolean, default: true },
      careTips: { type: Boolean, default: true },
      seasonalTips: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
    },
    achievements: {
      type: [
        new Schema(
          { id: { type: String, required: true }, unlockedAt: { type: Date, default: Date.now } },
          { _id: false }
        ),
      ],
      default: [],
    },
    authProvider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
    googleId: { type: String, index: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.passwordHash;
        delete ret.avatarFileId;
        // Stable contract: avatar is always present (null when unset).
        ret.avatar = ret.avatar ?? null;
        return ret;
      },
    },
  }
);

userSchema.methods.comparePassword = function comparePassword(
  this: IUser,
  candidate: string
): Promise<boolean> {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser>('User', userSchema);
