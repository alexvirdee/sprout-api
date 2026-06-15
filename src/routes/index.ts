/**
 * API router — mounts each resource under /api.
 */

import { Router } from 'express';

import authRoutes from './auth.routes';
import gardenRoutes from './garden.routes';
import plantRoutes from './plant.routes';
import taskRoutes from './task.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sprout-api', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/gardens', gardenRoutes);
router.use('/plants', plantRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);

export default router;
