/**
 * Plant model — a single plant within a user's garden. Care preferences (type,
 * sun, watering) and status power tracking; soft-deleted via `archivedAt`.
 */

import { Schema, model, Document, Types } from 'mongoose';

import {
  PLANT_TYPES,
  PLANT_SOURCES,
  PLANT_SUN_PREFS,
  PLANT_WATERING_PREFS,
  PLANT_STATUSES,
} from '../validators';

export interface IPlant extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gardenId: Types.ObjectId;
  name: string;
  variety?: string;
  type: string;
  plantedDate?: Date | null;
  source: string;
  locationInGarden?: string;
  sunPreference: string;
  wateringPreference: string;
  notes?: string;
  status: string;
  lastWateredAt?: Date | null;
  wateringCount: number;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const plantSchema = new Schema<IPlant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gardenId: { type: Schema.Types.ObjectId, ref: 'Garden', required: true, index: true },
    name: { type: String, required: true, trim: true },
    variety: { type: String, trim: true },
    type: { type: String, enum: [...PLANT_TYPES], default: 'other' },
    plantedDate: { type: Date, default: null },
    source: { type: String, enum: [...PLANT_SOURCES], default: 'unknown' },
    locationInGarden: { type: String, trim: true },
    sunPreference: { type: String, enum: [...PLANT_SUN_PREFS], default: 'not_sure' },
    wateringPreference: { type: String, enum: [...PLANT_WATERING_PREFS], default: 'not_sure' },
    notes: { type: String, trim: true },
    status: { type: String, enum: [...PLANT_STATUSES], default: 'growing' },
    lastWateredAt: { type: Date, default: null },
    wateringCount: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
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

export const Plant = model<IPlant>('Plant', plantSchema);
