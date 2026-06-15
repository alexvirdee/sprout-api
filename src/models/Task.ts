/**
 * Task model — a care action tied to a plant (water, fertilize, harvest, …).
 */

import { Schema, model, Document, Types } from 'mongoose';

export type TaskType = 'water' | 'fertilize' | 'harvest' | 'prune' | 'plant' | 'other';

export interface ITask extends Document {
  _id: Types.ObjectId;
  plantId: Types.ObjectId;
  userId: Types.ObjectId;
  type: TaskType;
  title: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['water', 'fertilize', 'harvest', 'prune', 'plant', 'other'],
      default: 'water',
    },
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
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

export const Task = model<ITask>('Task', taskSchema);
