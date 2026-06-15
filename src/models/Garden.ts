/**
 * Garden model — a user's growing space (a yard, balcony, set of raised beds).
 */

import { Schema, model, Document, Types } from 'mongoose';

export interface IGarden extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  location?: string;
  size?: string;
  createdAt: Date;
  updatedAt: Date;
}

const gardenSchema = new Schema<IGarden>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    size: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

export const Garden = model<IGarden>('Garden', gardenSchema);
