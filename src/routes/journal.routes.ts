/**
 * /api/journal — garden journal (harvests, notes, milestones). Photo serving is
 * public (so <Image> can load it); everything else requires auth.
 */

import { Router } from 'express';

import * as journal from '../controllers/journal.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { singleImage } from '../middleware/upload.middleware';
import { createJournalEntrySchema, updateJournalEntrySchema } from '../validators';

const router = Router();

// Public — journal photos load via <Image source={{ uri }}> without an auth header.
router.get('/photo/:fileId', asyncHandler(journal.getPhoto));

router.use(protect);

router.get('/', asyncHandler(journal.list));
router.post('/', validate(createJournalEntrySchema), asyncHandler(journal.create));
router.get('/:id', asyncHandler(journal.getOne));
router.patch('/:id', validate(updateJournalEntrySchema), asyncHandler(journal.update));
router.delete('/:id', asyncHandler(journal.remove));
router.post('/:id/photo', singleImage('photo'), asyncHandler(journal.uploadPhoto));

export default router;
