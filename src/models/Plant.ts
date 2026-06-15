/**
 * Plant model — a single plant within a garden, with growth status and notes.
 */

import { Schema, model, Document, Types } from 'mongoose';

export type PlantStatus = 'thriving' | 'water' | 'harvest' | 'resting';

export interface IPlant extends Document {
  _id: Types.ObjectId;
  gardenId: Types.ObjectId;
  name: string;
  variety?: string;
  emoji?: string;
  plantedDate: Date;
  status: PlantStatus;
  progress: number;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const plantSchema = new Schema<IPlant>(
  {
    gardenId: { type: Schema.Types.ObjectId, ref: 'Garden', required: true, index: true },
    name: { type: String, required: true, trim: true },
    variety: { type: String, trim: true },
    emoji: { type: String, default: '🌱' },
    plantedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['thriving', 'water', 'harvest', 'resting'],
      default: 'thriving',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    location: { type: String, trim: true },
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

export const Plant = model<IPlant>('Plant', plantSchema);
