/**
 * JournalEntry model — a moment in a garden's life: a harvest, a note, or a
 * milestone. Optionally tied to a specific plant and/or the care task that
 * prompted it (e.g. completing a "harvest" task). Harvests can carry a quantity
 * + unit + a 1-5 rating, and any entry may have one photo stored in GridFS.
 *
 * `photoUrl` is built per-request in the controller (so it always matches the
 * current host) rather than stored, mirroring how avatars are served.
 */

import { Schema, model, Document, Types } from 'mongoose';

import { JOURNAL_ENTRY_TYPES, JOURNAL_UNITS } from '../validators';

export type JournalEntryType = (typeof JOURNAL_ENTRY_TYPES)[number];
export type JournalUnit = (typeof JOURNAL_UNITS)[number];

export interface IJournalEntry extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gardenId: Types.ObjectId;
  plantId?: Types.ObjectId | null;
  careTaskId?: Types.ObjectId | null;
  type: JournalEntryType;
  title?: string;
  note?: string;
  quantity?: number | null;
  unit?: JournalUnit | null;
  rating?: number | null;
  photoFileId?: Types.ObjectId | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gardenId: { type: Schema.Types.ObjectId, ref: 'Garden', required: true, index: true },
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', index: true, default: null },
    careTaskId: { type: Schema.Types.ObjectId, ref: 'CareTask', default: null },
    type: { type: String, enum: [...JOURNAL_ENTRY_TYPES], default: 'note', index: true },
    title: { type: String, trim: true },
    note: { type: String, trim: true },
    quantity: { type: Number, default: null },
    unit: { type: String, enum: [...JOURNAL_UNITS, null], default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    photoFileId: { type: Schema.Types.ObjectId, default: null },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        // Expose whether a photo exists; the absolute URL is added by the controller.
        ret.photoFileId = ret.photoFileId ? String(ret.photoFileId) : null;
        return ret;
      },
    },
  }
);

// Timelines are read newest-first, scoped to a user (and often a garden/plant).
journalEntrySchema.index({ userId: 1, occurredAt: -1 });

export const JournalEntry = model<IJournalEntry>('JournalEntry', journalEntrySchema);
