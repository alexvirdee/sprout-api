/**
 * API router — mounts each resource under /api.
 */

import { Router } from 'express';

import authRoutes from './auth.routes';
import gardenRoutes from './garden.routes';
import plantRoutes from './plant.routes';
import wateringRoutes from './watering.routes';
import taskRoutes from './task.routes';
import userRoutes from './user.routes';
import aiRoutes from './ai.routes';
import careRoutes from './care.routes';
import journalRoutes from './journal.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sprout-api', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/gardens', gardenRoutes);
router.use('/plants', plantRoutes);
router.use('/watering', wateringRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/care-tasks', careRoutes);
router.use('/journal', journalRoutes);

export default router;
