/**
 * careAi.service — optionally *refines* the rules-based care suggestions using
 * OpenAI, tailoring intervals/timing/wording to the specific variety, the
 * plant's scientific name, and the current season/hemisphere.
 *
 * Design rule: the deterministic rules engine is the trustworthy fallback. If
 * there is no API key, the provider errors, or the response is unusable, we
 * quietly return the baseline rules suggestions with `aiUsed: false` — this
 * endpoint NEVER fails just because AI is unavailable (unlike plant-identify,
 * which 503s). The AI may only *tune* existing suggestions: it cannot add or
 * remove them, and every field is coerced back into safe enums/ranges, so a
 * wild model response can never produce an unsafe task.
 */

import OpenAI from 'openai';

import { env } from '../config/env';
import { CareSuggestion } from '../types/care.types';
import { CARE_PRIORITIES, CARE_RECURRENCES, CARE_TASK_TYPES } from '../validators';

export interface RefineCareInput {
  plant: { name: string; type: string; variety?: string; scientificName?: string };
  baseline: CareSuggestion[];
  hemisphere?: 'northern' | 'southern';
  /** 1-12, the current calendar month (for seasonality). */
  month?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SYSTEM_PROMPT = `You are Sprout's friendly, careful plant-care assistant. You are given a plant and a set of BASELINE care suggestions. Your job is to gently TUNE those suggestions for this specific plant, variety, and season — not to invent new ones.

Respond with a SINGLE JSON object only (no markdown, no prose):
{ "suggestions": [ { "key": string, "title": string, "detail": string, "recurrence": one of [${CARE_RECURRENCES.join(', ')}], "recurrenceIntervalDays": number|null, "instructions": string, "priority": one of [${CARE_PRIORITIES.join(', ')}], "firstDueInDays": number } ] }

Rules:
- Keep the SAME set of keys as the baseline. Do not add or drop suggestions. Echo each baseline "key" exactly.
- You MAY adjust recurrenceIntervalDays, firstDueInDays, detail, instructions, priority, and title to suit the variety / scientific name / season.
- "detail" is a short human label (e.g. "Every 4 days"). "instructions" is 1-3 friendly, conservative sentences.
- Be conservative and honest. If unsure, leave the baseline values roughly as-is. Never promise edibility, toxicity, or medical outcomes.
- recurrenceIntervalDays only matters when recurrence is "every_x_days"; otherwise it may be null.
- Respond with JSON only.`;

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

/* ----------------------------- coercion ----------------------------- */

const includes = (arr: readonly string[], v: unknown): boolean =>
  typeof v === 'string' && arr.includes(v);

function asString(v: unknown, fallback: string, max: number): string {
  const s = typeof v === 'string' && v.trim() ? v.trim() : fallback;
  return s.slice(0, max);
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Merge one AI suggestion onto its baseline, coercing every field to safety. */
function coerceAgainstBaseline(raw: Record<string, unknown>, base: CareSuggestion): CareSuggestion {
  const recurrence = includes(CARE_RECURRENCES, raw.recurrence)
    ? (raw.recurrence as CareSuggestion['recurrence'])
    : base.recurrence;
  const taskType = includes(CARE_TASK_TYPES, raw.taskType)
    ? (raw.taskType as CareSuggestion['taskType'])
    : base.taskType;
  const priority = includes(CARE_PRIORITIES, raw.priority)
    ? (raw.priority as CareSuggestion['priority'])
    : base.priority;
  const intervalDays =
    recurrence === 'every_x_days'
      ? clampInt(raw.recurrenceIntervalDays, 1, 365, base.recurrenceIntervalDays ?? 7)
      : base.recurrenceIntervalDays;

  return {
    key: base.key,
    taskType,
    title: asString(raw.title, base.title, 120),
    detail: asString(raw.detail, base.detail, 200),
    recurrence,
    recurrenceIntervalDays: intervalDays,
    instructions: asString(raw.instructions, base.instructions, 2000),
    // Keep the baseline's safe, hand-written search term — never trust an AI URL/query.
    videoQuery: base.videoQuery,
    priority,
    firstDueInDays: clampInt(raw.firstDueInDays, 0, 365, base.firstDueInDays),
  };
}

/* ----------------------------- prompt ----------------------------- */

function buildUserPrompt(input: RefineCareInput): string {
  const { plant, baseline, hemisphere, month } = input;
  const parts: string[] = [];
  parts.push(`Plant: ${plant.name || 'Unknown'}`);
  if (plant.variety) parts.push(`Variety: ${plant.variety}`);
  if (plant.scientificName) parts.push(`Scientific name: ${plant.scientificName}`);
  parts.push(`Category: ${plant.type || 'other'}`);
  if (month && month >= 1 && month <= 12) {
    const where = hemisphere ? ` in the ${hemisphere} hemisphere` : '';
    parts.push(`It is currently ${MONTHS[month - 1]}${where}. Consider the season.`);
  }
  const tunable = baseline.map((s) => ({
    key: s.key,
    taskType: s.taskType,
    title: s.title,
    detail: s.detail,
    recurrence: s.recurrence,
    recurrenceIntervalDays: s.recurrenceIntervalDays ?? null,
    instructions: s.instructions,
    priority: s.priority,
    firstDueInDays: s.firstDueInDays,
  }));
  parts.push(`Baseline suggestions to tune:\n${JSON.stringify(tunable)}`);
  return parts.join('\n');
}

/* ----------------------------- main ----------------------------- */

export async function refineCareSuggestions(
  input: RefineCareInput
): Promise<{ suggestions: CareSuggestion[]; aiUsed: boolean }> {
  const ai = getClient();
  if (!ai || input.baseline.length === 0) {
    return { suggestions: input.baseline, aiUsed: false };
  }

  let content: string | null | undefined;
  try {
    const completion = await ai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.3,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    });
    content = completion.choices[0]?.message?.content;
  } catch (err) {
    // Never surface the provider error — just fall back to the rules.
    // eslint-disable-next-line no-console
    console.error('[careAi] provider error:', err instanceof Error ? err.message : err);
    return { suggestions: input.baseline, aiUsed: false };
  }

  if (!content) return { suggestions: input.baseline, aiUsed: false };

  let parsed: { suggestions?: unknown };
  try {
    parsed = JSON.parse(content) as { suggestions?: unknown };
  } catch {
    return { suggestions: input.baseline, aiUsed: false };
  }

  const arr = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  if (arr.length === 0) return { suggestions: input.baseline, aiUsed: false };

  const byKey = new Map<string, Record<string, unknown>>();
  for (const item of arr) {
    if (item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string') {
      byKey.set((item as { key: string }).key, item as Record<string, unknown>);
    }
  }

  // Tune in place, preserving the baseline's set + order. Unmatched keys stay as rules.
  const suggestions = input.baseline.map((b) =>
    byKey.has(b.key) ? coerceAgainstBaseline(byKey.get(b.key) as Record<string, unknown>, b) : b
  );

  return { suggestions, aiUsed: true };
}
