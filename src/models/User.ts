/**
 * User model. Credentials (email + password) auth, with Google groundwork. The
 * password hash is `select: false` so it never leaks unless explicitly asked
 * for. toJSON maps _id → id, strips sensitive fields, and always exposes
 * `avatar` (null when unset) so the client contract is stable.
 */

import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type AuthProvider = 'credentials' | 'google';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: string | null;
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
