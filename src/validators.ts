/**
 * Request validation schemas (Zod). Used by the validate() middleware in routes.
 */

import { z } from 'zod';

/* ---- Auth ---- */
export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const googleSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/* ---- Garden ---- */
export const GARDEN_TYPES = [
  'backyard', 'raised_beds', 'balcony', 'indoor', 'community', 'greenhouse', 'other',
] as const;
export const SUN_EXPOSURES = [
  'full_sun', 'partial_sun', 'partial_shade', 'full_shade', 'unsure',
] as const;
export const SIZE_TYPES = ['small', 'medium', 'large', 'custom'] as const;
export const DIMENSION_UNITS = ['ft', 'm'] as const;

const dimensionsSchema = z
  .object({
    length: z.number().positive().max(100_000).optional(),
    width: z.number().positive().max(100_000).optional(),
    unit: z.enum(DIMENSION_UNITS).optional(),
  })
  .optional();

export const createGardenSchema = z.object({
  name: z.string().trim().min(2, 'Give your garden a name').max(80),
  type: z.enum(GARDEN_TYPES).default('backyard'),
  locationLabel: z.string().trim().max(120).optional(),
  cityOrZip: z.string().trim().max(120).optional(),
  sunExposure: z.enum(SUN_EXPOSURES).default('unsure'),
  growingZone: z.string().trim().max(20).optional(),
  sizeType: z.enum(SIZE_TYPES).default('medium'),
  dimensions: dimensionsSchema,
  notes: z.string().trim().max(2000).optional(),
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
