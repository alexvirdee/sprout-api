/**
 * careAi.service unit tests — the AI care *refinement* layer. The OpenAI SDK and
 * env are mocked so no real call is made. These focus on the safety guarantees:
 * the AI may only tune the baseline, every field is coerced into safe
 * enums/ranges, and any failure quietly falls back to the rules (aiUsed:false).
 */

const mockCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({ chat: { completions: { create: mockCreate } } })),
}));
jest.mock('../config/env', () => ({
  env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-4o-mini' },
}));

import { refineCareSuggestions } from '../services/careAi.service';
import { suggestCareForPlant } from '../services/careSuggestion.service';

const reply = (obj: unknown) => ({ choices: [{ message: { content: JSON.stringify(obj) } }] });
const baseline = suggestCareForPlant({ name: 'Basil', type: 'herb' }); // water(2) + prune(14) + harvest
const plant = { name: 'Basil', type: 'herb' };

beforeEach(() => mockCreate.mockReset());

describe('refineCareSuggestions', () => {
  it('tunes a suggestion and keeps the exact baseline key set + order', async () => {
    mockCreate.mockResolvedValue(
      reply({
        suggestions: [
          {
            key: 'water',
            taskType: 'watering',
            title: 'Water Basil',
            detail: 'Every 4 days',
            recurrence: 'every_x_days',
            recurrenceIntervalDays: 4,
            instructions: 'Tweaked for summer.',
            priority: 'high',
            firstDueInDays: 4,
          },
        ],
      })
    );
    const { suggestions, aiUsed } = await refineCareSuggestions({ plant, baseline });
    expect(aiUsed).toBe(true);
    expect(suggestions.map((s) => s.key)).toEqual(baseline.map((s) => s.key));
    const water = suggestions.find((s) => s.key === 'water')!;
    expect(water.recurrenceIntervalDays).toBe(4);
    expect(water.priority).toBe('high');
    expect(water.instructions).toBe('Tweaked for summer.');
  });

  it('clamps out-of-range numbers to safe bounds', async () => {
    mockCreate.mockResolvedValue(
      reply({
        suggestions: [
          {
            key: 'water',
            taskType: 'watering',
            title: 'w',
            detail: 'd',
            recurrence: 'every_x_days',
            recurrenceIntervalDays: 9999,
            instructions: 'i',
            priority: 'medium',
            firstDueInDays: -10,
          },
        ],
      })
    );
    const { suggestions } = await refineCareSuggestions({ plant, baseline });
    const water = suggestions.find((s) => s.key === 'water')!;
    expect(water.recurrenceIntervalDays).toBe(365);
    expect(water.firstDueInDays).toBe(0);
  });

  it('falls back to baseline values for invalid enums', async () => {
    const baseWater = baseline.find((s) => s.key === 'water')!;
    mockCreate.mockResolvedValue(
      reply({
        suggestions: [
          {
            key: 'water',
            taskType: 'rocket_launch',
            title: 'w',
            detail: 'd',
            recurrence: 'banana',
            instructions: 'i',
            priority: 'extreme',
            firstDueInDays: 3,
          },
        ],
      })
    );
    const { suggestions } = await refineCareSuggestions({ plant, baseline });
    const water = suggestions.find((s) => s.key === 'water')!;
    expect(water.recurrence).toBe(baseWater.recurrence);
    expect(water.priority).toBe(baseWater.priority);
    expect(water.taskType).toBe(baseWater.taskType);
  });

  it('cannot add or drop suggestions (unknown keys ignored, missing kept)', async () => {
    mockCreate.mockResolvedValue(
      reply({
        suggestions: [
          {
            key: 'fly_to_the_moon',
            taskType: 'general',
            title: 'x',
            detail: 'y',
            recurrence: 'daily',
            instructions: 'z',
            priority: 'low',
            firstDueInDays: 1,
          },
        ],
      })
    );
    const { suggestions, aiUsed } = await refineCareSuggestions({ plant, baseline });
    expect(aiUsed).toBe(true);
    expect(suggestions.map((s) => s.key)).toEqual(baseline.map((s) => s.key));
    // Nothing matched → every suggestion equals its baseline.
    expect(suggestions).toEqual(baseline);
  });

  it('keeps the baseline videoQuery (never trusts an AI-supplied query)', async () => {
    const basePrune = baseline.find((s) => s.key === 'prune')!;
    mockCreate.mockResolvedValue(
      reply({
        suggestions: [
          {
            key: 'prune',
            taskType: 'pruning',
            title: 'Pinch',
            detail: 'Every 2 weeks',
            recurrence: 'every_x_days',
            recurrenceIntervalDays: 14,
            instructions: 'i',
            videoQuery: 'evil injected query',
            priority: 'low',
            firstDueInDays: 14,
          },
        ],
      })
    );
    const { suggestions } = await refineCareSuggestions({ plant, baseline });
    const prune = suggestions.find((s) => s.key === 'prune')!;
    expect(prune.videoQuery).toBe(basePrune.videoQuery);
  });

  it('falls back (aiUsed:false) on malformed JSON', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json {' } }] });
    const { suggestions, aiUsed } = await refineCareSuggestions({ plant, baseline });
    expect(aiUsed).toBe(false);
    expect(suggestions).toEqual(baseline);
  });

  it('falls back (aiUsed:false) on a provider error', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));
    const { aiUsed } = await refineCareSuggestions({ plant, baseline });
    expect(aiUsed).toBe(false);
  });

  it('falls back (aiUsed:false) on an empty suggestions array', async () => {
    mockCreate.mockResolvedValue(reply({ suggestions: [] }));
    const { aiUsed } = await refineCareSuggestions({ plant, baseline });
    expect(aiUsed).toBe(false);
  });

  it('does not call the model when there is no baseline to tune', async () => {
    const { suggestions, aiUsed } = await refineCareSuggestions({ plant, baseline: [] });
    expect(aiUsed).toBe(false);
    expect(suggestions).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
