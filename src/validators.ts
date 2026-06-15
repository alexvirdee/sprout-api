/**
 * Request validation schemas (Zod). Used by the validate() middleware in routes.
 */

import { z } from 'zod';

/* ---- Auth ---- */
export const registerSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const googleSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/* ---- Garden ---- */
export const createGardenSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  size: z.string().optional(),
});

export const updateGardenSchema = createGardenSchema.partial();

/* ---- Plant ---- */
export const createPlantSchema = z.object({
  gardenId: z.string().min(1),
  name: z.string().min(1),
  variety: z.string().optional(),
  emoji: z.string().optional(),
  plantedDate: z.coerce.date().optional(),
  status: z.enum(['thriving', 'water', 'harvest', 'resting']).optional(),
  progress: z.number().min(0).max(100).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePlantSchema = createPlantSchema.partial().omit({ gardenId: true });

/* ---- Task ---- */
export const createTaskSchema = z.object({
  plantId: z.string().min(1),
  type: z.enum(['water', 'fertilize', 'harvest', 'prune', 'plant', 'other']).optional(),
  title: z.string().min(1),
  dueDate: z.coerce.date(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['water', 'fertilize', 'harvest', 'prune', 'plant', 'other']).optional(),
  dueDate: z.coerce.date().optional(),
  completed: z.boolean().optional(),
});
