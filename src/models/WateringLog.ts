/**
 * WateringLog — one watering event for a garden (or a specific plant within it).
 * Scoped to the user; powers history, streaks, and hydration status.
 */

import { Schema, model, Document, Types } from 'mongoose';

import { WATERING_TARGETS, WATERING_TYPES } from '../validators';

export interface IWateringLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gardenId: Types.ObjectId;
  plantId?: Types.ObjectId;
  wateringTarget: string;
  wateringType: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const wateringLogSchema = new Schema<IWateringLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gardenId: { type: Schema.Types.ObjectId, ref: 'Garden', required: true, index: true },
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', index: true, sparse: true },
    wateringTarget: { type: String, enum: [...WATERING_TARGETS], default: 'garden' },
    wateringType: { type: String, enum: [...WATERING_TYPES], default: 'normal' },
    notes: { type: String, trim: true },
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

export const WateringLog = model<IWateringLog>('WateringLog', wateringLogSchema);
