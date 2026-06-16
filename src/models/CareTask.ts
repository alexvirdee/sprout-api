/**
 * CareTask model — a scheduled gardening action (water, prune, fertilize, …)
 * tied to a user's garden, optionally a specific plant. Tasks may recur; a
 * `status` (pending / completed / skipped) is derived in toJSON. Created by the
 * rules engine ("system"), the user, or AI.
 */

import { Schema, model, Document, Types } from 'mongoose';

import { CARE_TASK_TYPES, CARE_RECURRENCES, CARE_PRIORITIES, CARE_SOURCES } from '../validators';

export type CareTaskType = (typeof CARE_TASK_TYPES)[number];
export type CareRecurrence = (typeof CARE_RECURRENCES)[number];
export type CarePriority = (typeof CARE_PRIORITIES)[number];
export type CareSource = (typeof CARE_SOURCES)[number];

export interface ICareTask extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gardenId: Types.ObjectId;
  plantId?: Types.ObjectId | null;
  title: string;
  description?: string;
  taskType: CareTaskType;
  dueDate: Date;
  completedAt?: Date | null;
  skippedAt?: Date | null;
  recurrence: CareRecurrence;
  recurrenceIntervalDays?: number | null;
  instructions?: string;
  videoUrl?: string;
  priority: CarePriority;
  source: CareSource;
  createdAt: Date;
  updatedAt: Date;
}

const careTaskSchema = new Schema<ICareTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gardenId: { type: Schema.Types.ObjectId, ref: 'Garden', required: true, index: true },
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', index: true, default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    taskType: { type: String, enum: [...CARE_TASK_TYPES], default: 'general' },
    dueDate: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    recurrence: { type: String, enum: [...CARE_RECURRENCES], default: 'none' },
    recurrenceIntervalDays: { type: Number, default: null },
    instructions: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    priority: { type: String, enum: [...CARE_PRIORITIES], default: 'medium' },
    source: { type: String, enum: [...CARE_SOURCES], default: 'user' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        // Derived status for the client.
        ret.status = ret.completedAt ? 'completed' : ret.skippedAt ? 'skipped' : 'pending';
        return ret;
      },
    },
  }
);

export const CareTask = model<ICareTask>('CareTask', careTaskSchema);
