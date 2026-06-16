/**
 * journal.controller — the garden journal: harvests, notes, and milestones.
 * CRUD is scoped to req.userId with garden/plant ownership checks. Each entry
 * may carry one photo stored in GridFS (bucket "journal"), served publicly so
 * <Image source={{ uri }}> can load it without an auth header — same approach
 * as avatars.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { JournalEntry, IJournalEntry } from '../models/JournalEntry';
import { Garden } from '../models/Garden';
import { Plant } from '../models/Plant';
import { AppError } from '../utils/AppError';
import { JOURNAL_ENTRY_TYPES } from '../validators';

async function assertOwnsGarden(userId: string | undefined, gardenId: string) {
  const garden = await Garden.findOne({ _id: gardenId, userId });
  if (!garden) throw AppError.notFound('Garden not found');
  return garden;
}

async function assertOwnsPlant(userId: string | undefined, plantId: string) {
  const plant = await Plant.findOne({ _id: plantId, userId });
  if (!plant) throw AppError.notFound('Plant not found');
  return plant;
}

/* ---- photo storage (GridFS) ---- */

function journalBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Storage is not ready');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'journal' });
}

function buildPhotoUrl(req: Request, fileId: string): string {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/api/journal/photo/${fileId}`;
}

/** toJSON + an absolute photoUrl matching the current host. */
function serialize(req: Request, doc: IJournalEntry) {
  const json = doc.toJSON() as Record<string, unknown>;
  json.photoUrl = doc.photoFileId ? buildPhotoUrl(req, String(doc.photoFileId)) : null;
  return json;
}

/* ---- CRUD ---- */

export const list = async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { userId: req.userId };
  if (typeof req.query.gardenId === 'string') filter.gardenId = req.query.gardenId;
  if (typeof req.query.plantId === 'string') filter.plantId = req.query.plantId;
  if (typeof req.query.type === 'string' && (JOURNAL_ENTRY_TYPES as readonly string[]).includes(req.query.type)) {
    filter.type = req.query.type;
  }

  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const entries = await JournalEntry.find(filter).sort({ occurredAt: -1 }).limit(limit);
  res.json({ entries: entries.map((e) => serialize(req, e)) });
};

export const create = async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  await assertOwnsGarden(req.userId, body.gardenId as string);
  if (typeof body.plantId === 'string') await assertOwnsPlant(req.userId, body.plantId);

  const entry = await JournalEntry.create({ ...body, userId: req.userId });
  res.status(201).json({ entry: serialize(req, entry) });
};

export const getOne = async (req: Request, res: Response) => {
  const entry = await JournalEntry.findOne({ _id: req.params.id, userId: req.userId });
  if (!entry) throw AppError.notFound('Journal entry not found');
  res.json({ entry: serialize(req, entry) });
};

export const update = async (req: Request, res: Response) => {
  const entry = await JournalEntry.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!entry) throw AppError.notFound('Journal entry not found');
  res.json({ entry: serialize(req, entry) });
};

export const remove = async (req: Request, res: Response) => {
  const entry = await JournalEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!entry) throw AppError.notFound('Journal entry not found');
  // Clean up the photo so GridFS doesn't accumulate orphans.
  if (entry.photoFileId) {
    try {
      await journalBucket().delete(entry.photoFileId);
    } catch {
      /* already gone */
    }
  }
  res.json({ ok: true });
};

/* ---- photo ---- */

export const uploadPhoto = async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('Please choose an image to upload');

  const entry = await JournalEntry.findOne({ _id: req.params.id, userId: req.userId });
  if (!entry) throw AppError.notFound('Journal entry not found');

  const bucket = journalBucket();
  const uploadStream = bucket.openUploadStream(`${entry._id}-${Date.now()}`, {
    contentType: req.file.mimetype,
  });
  uploadStream.end(req.file.buffer);
  await new Promise<void>((resolve, reject) => {
    uploadStream.on('finish', () => resolve());
    uploadStream.on('error', reject);
  });

  const oldId = entry.photoFileId;
  entry.photoFileId = uploadStream.id as mongoose.Types.ObjectId;
  await entry.save();

  if (oldId) {
    try {
      await bucket.delete(oldId);
    } catch {
      /* already gone */
    }
  }

  res.json({ entry: serialize(req, entry) });
};

/** Public: streams journal photo bytes (no auth, so <Image> can load it). */
export const getPhoto = async (req: Request, res: Response) => {
  let fileId: mongoose.Types.ObjectId;
  try {
    fileId = new mongoose.Types.ObjectId(req.params.fileId);
  } catch {
    throw AppError.notFound('Photo not found');
  }

  const bucket = journalBucket();
  const files = await bucket.find({ _id: fileId }).limit(1).toArray();
  if (!files.length) throw AppError.notFound('Photo not found');

  res.setHeader('Content-Type', files[0].contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  bucket
    .openDownloadStream(fileId)
    .on('error', () => {
      if (!res.headersSent) res.status(404).end();
    })
    .pipe(res);
};
