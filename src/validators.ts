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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateGardenSchema = createGardenSchema.partial();

/* ---- Plant ---- */
export const PLANT_TYPES = [
  'vegetable', 'herb', 'fruit', 'flower', 'houseplant', 'tree', 'shrub', 'succulent', 'other',
] as const;
export const PLANT_SOURCES = [
  'seed', 'seedling', 'transplant', 'cutting', 'store_bought', 'ai_scan', 'other', 'unknown',
] as const;
export const PLANT_SUN_PREFS = [
  'full_sun', 'partial_sun', 'partial_shade', 'full_shade', 'not_sure',
] as const;
export const PLANT_WATERING_PREFS = ['light', 'moderate', 'frequent', 'deep', 'not_sure'] as const;
export const PLANT_STATUSES = ['growing', 'needs_attention', 'harvested', 'dormant', 'archived'] as const;

export const createPlantSchema = z.object({
  gardenId: z.string().min(1),
  name: z.string().trim().min(1, 'Give your plant a name').max(80),
  variety: z.string().trim().max(80).optional(),
  type: z.enum(PLANT_TYPES).default('other'),
  plantedDate: z.coerce.date().optional(),
  source: z.enum(PLANT_SOURCES).default('unknown'),
  locationInGarden: z.string().trim().max(120).optional(),
  sunPreference: z.enum(PLANT_SUN_PREFS).default('not_sure'),
  wateringPreference: z.enum(PLANT_WATERING_PREFS).default('not_sure'),
  notes: z.string().trim().max(2000).optional(),
  // AI scan metadata (optional — set when a plant is added from a scan).
  scientificName: z.string().trim().max(160).optional(),
  imageUrl: z.string().trim().max(100_000).optional(),
  aiIdentified: z.boolean().optional(),
  identificationConfidence: z.number().min(0).max(1).optional(),
  aiIdentificationData: z.record(z.unknown()).optional(),
});

export const updatePlantSchema = createPlantSchema
  .partial()
  .omit({ gardenId: true })
  .extend({ status: z.enum(PLANT_STATUSES).optional() });

/* ---- Watering ---- */
export const WATERING_TARGETS = ['garden', 'plant'] as const;
export const WATERING_TYPES = ['light', 'normal', 'deep'] as const;

export const createWateringSchema = z.object({
  gardenId: z.string().min(1),
  plantId: z.string().optional(),
  wateringTarget: z.enum(WATERING_TARGETS).default('garden'),
  wateringType: z.enum(WATERING_TYPES).default('normal'),
  notes: z.string().trim().max(2000).optional(),
});

/* ---- Task ---- */
export const createTaskSchema = z.object({
  plantId: z.string().min(1),
  type: z.enum(['water', 'fertilize', 'harvest', 'prune', 'plant', 'other']).optional(),
  title: z.string().min(1),
  dueDate: z.coerce.date(),
});

/* ---- User / Profile ---- */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  displayName: z.string().trim().min(1, 'Display name is required').max(50).optional(),
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(280).optional(),
  location: z.string().trim().max(120).optional(),
  // A URL or local image URI; nullable so the client can remove the avatar.
  avatar: z.string().trim().max(100_000).nullable().optional(),
  email: z.string().trim().email('Enter a valid email').optional(),
});

export const notificationPreferencesSchema = z
  .object({
    pushEnabled: z.boolean(),
    wateringReminders: z.boolean(),
    careTips: z.boolean(),
    seasonalTips: z.boolean(),
    achievements: z.boolean(),
  })
  .partial();

export const updateThemeSchema = z.object({
  themePreference: z.enum(THEME_PREFERENCES),
});

export const updatePreferencesSchema = z.object({
  themePreference: z.enum(THEME_PREFERENCES).optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['water', 'fertilize', 'harvest', 'prune', 'plant', 'other']).optional(),
  dueDate: z.coerce.date().optional(),
  completed: z.boolean().optional(),
});
