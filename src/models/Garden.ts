/**
 * Garden model — a user's growing space (a yard, balcony, set of raised beds).
 * The environment fields (type, sun, size) let Sprout tailor care later; counts
 * and healthStatus are denormalized rollups updated as plants/tasks are added.
 * Soft-deleted via `archivedAt` so a garden can be restored later.
 */

import { Schema, model, Document, Types } from 'mongoose';

import { GARDEN_TYPES, SUN_EXPOSURES, SIZE_TYPES, DIMENSION_UNITS } from '../validators';

export interface IGardenDimensions {
  length?: number;
  width?: number;
  unit?: 'ft' | 'm';
}

export interface IGarden extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: string;
  locationLabel?: string;
  cityOrZip?: string;
  sunExposure: string;
  growingZone?: string;
  sizeType: string;
  dimensions?: IGardenDimensions;
  notes?: string;
  plantCount: number;
  taskCount: number;
  healthStatus: string;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const gardenSchema = new Schema<IGarden>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: [...GARDEN_TYPES], default: 'backyard' },
    locationLabel: { type: String, trim: true },
    cityOrZip: { type: String, trim: true },
    sunExposure: { type: String, enum: [...SUN_EXPOSURES], default: 'unsure' },
    growingZone: { type: String, trim: true },
    sizeType: { type: String, enum: [...SIZE_TYPES], default: 'medium' },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      unit: { type: String, enum: [...DIMENSION_UNITS] },
    },
    notes: { type: String, trim: true },
    plantCount: { type: Number, default: 0 },
    taskCount: { type: Number, default: 0 },
    healthStatus: { type: String, default: 'Getting started' },
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

export const Garden = model<IGarden>('Garden', gardenSchema);
