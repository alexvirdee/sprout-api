/**
 * AI plant-identification types — the structured result returned to the client.
 * Enum-typed fields mirror the Plant model so the result can prefill plant
 * creation directly.
 */

import { PLANT_SUN_PREFS, PLANT_TYPES, PLANT_WATERING_PREFS } from '../validators';

export type PlantType = (typeof PLANT_TYPES)[number];
export type SunPref = (typeof PLANT_SUN_PREFS)[number];
export type WaterPref = (typeof PLANT_WATERING_PREFS)[number];
export type Difficulty = 'easy' | 'moderate' | 'hard' | 'unknown';

export interface PlantMatch {
  commonName: string;
  scientificName: string | null;
  confidence: number; // 0..1
}

export interface PlantCareSummary {
  sunPreference: SunPref;
  wateringPreference: WaterPref;
  difficulty: Difficulty;
  notes: string;
}

export interface PlantIdentification {
  isPlant: boolean;
  commonName: string | null;
  scientificName: string | null;
  confidence: number; // 0..1
  plantType: PlantType;
  possibleMatches: PlantMatch[];
  careSummary: PlantCareSummary;
  disclaimer: string;
}
