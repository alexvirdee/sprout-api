/**
 * aiPlant.service — plant identification via OpenAI's vision model. The image is
 * sent as a base64 data URL (low detail, for cost) and the model is asked to
 * return a single JSON object. The raw output is defensively coerced into our
 * enum-typed PlantIdentification so a slightly-off model response never crashes
 * the request. Provider/key errors are mapped to clean AppErrors (the raw
 * OpenAI error is never surfaced to clients).
 */

import OpenAI from 'openai';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { PLANT_SUN_PREFS, PLANT_TYPES, PLANT_WATERING_PREFS } from '../validators';
import { Difficulty, PlantCareSummary, PlantIdentification, PlantMatch, PlantType, SunPref, WaterPref } from '../types/ai.types';

const DISCLAIMER = 'AI plant identification can be imperfect. Please confirm before adding.';

const SYSTEM_PROMPT = `You are Sprout's friendly plant identification assistant. Given a photo, identify the plant as best you can and respond with a SINGLE JSON object only — no markdown, no prose.

Schema:
{
  "isPlant": boolean,            // false if the image is not a plant
  "commonName": string|null,
  "scientificName": string|null,
  "confidence": number,          // 0..1 overall confidence
  "plantType": one of [${PLANT_TYPES.join(', ')}],
  "possibleMatches": [ { "commonName": string, "scientificName": string|null, "confidence": number } ],
  "careSummary": {
    "sunPreference": one of [${PLANT_SUN_PREFS.join(', ')}],
    "wateringPreference": one of [${PLANT_WATERING_PREFS.join(', ')}],
    "difficulty": one of [easy, moderate, hard],
    "notes": "a short, friendly care note (1-2 sentences)"
  }
}

Rules:
- Be honest about uncertainty. When unsure, use a lower confidence and include 2-3 possibleMatches (most likely first).
- If the image is unclear or not a plant, set isPlant=false, confidence low, commonName null.
- Use ONLY the allowed enum values; when unsure use "other" / "not_sure".
- Do NOT give medical, edibility, or toxicity guarantees; keep notes general.
- Respond with JSON only.`;

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(503, 'Plant identification isn’t available right now.');
  }
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

/* ----------------------------- coercion ----------------------------- */

const includes = (arr: readonly string[], v: unknown): boolean => typeof v === 'string' && arr.includes(v);

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function clamp01(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
function coercePlantType(v: unknown): PlantType {
  return includes(PLANT_TYPES, v) ? (v as PlantType) : 'other';
}
function coerceSun(v: unknown): SunPref {
  return includes(PLANT_SUN_PREFS, v) ? (v as SunPref) : 'not_sure';
}
function coerceWater(v: unknown): WaterPref {
  return includes(PLANT_WATERING_PREFS, v) ? (v as WaterPref) : 'not_sure';
}
function coerceDifficulty(v: unknown): Difficulty {
  return v === 'easy' || v === 'moderate' || v === 'hard' ? v : 'unknown';
}

function coerce(raw: Record<string, unknown>): PlantIdentification {
  const care = (raw.careSummary ?? {}) as Record<string, unknown>;
  const matchesRaw = Array.isArray(raw.possibleMatches) ? raw.possibleMatches : [];
  const possibleMatches: PlantMatch[] = matchesRaw.slice(0, 3).map((m) => {
    const match = (m ?? {}) as Record<string, unknown>;
    return {
      commonName: asString(match.commonName) ?? 'Unknown',
      scientificName: asString(match.scientificName),
      confidence: clamp01(match.confidence),
    };
  });

  const careSummary: PlantCareSummary = {
    sunPreference: coerceSun(care.sunPreference),
    wateringPreference: coerceWater(care.wateringPreference),
    difficulty: coerceDifficulty(care.difficulty),
    notes: asString(care.notes) ?? '',
  };

  return {
    isPlant: raw.isPlant !== false,
    commonName: asString(raw.commonName),
    scientificName: asString(raw.scientificName),
    confidence: clamp01(raw.confidence),
    plantType: coercePlantType(raw.plantType),
    possibleMatches,
    careSummary,
    disclaimer: DISCLAIMER,
  };
}

/* ----------------------------- main ----------------------------- */

export async function identifyPlant(imageBase64: string, mimeType: string): Promise<PlantIdentification> {
  const ai = getClient();

  let content: string | null | undefined;
  try {
    const completion = await ai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify the plant in this image. Respond with JSON only.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' } },
          ],
        },
      ],
    });
    content = completion.choices[0]?.message?.content;
  } catch (err) {
    // Never leak the provider error to clients.
    // eslint-disable-next-line no-console
    console.error('[ai] provider error:', err instanceof Error ? err.message : err);
    throw new AppError(502, 'Sprout’s plant expert is taking a quick break. Please try again in a moment.');
  }

  if (!content) {
    throw new AppError(502, 'We couldn’t read that photo. Try again with a clearer, well-lit picture.');
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new AppError(502, 'We couldn’t read that photo. Try again with a clearer, well-lit picture.');
  }

  return coerce(raw);
}
