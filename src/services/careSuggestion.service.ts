/**
 * careSuggestion.service — the rules-based care suggestion engine (v1,
 * deterministic — not AI). Given a plant's name + type, returns conservative,
 * friendly care suggestions. Where care genuinely varies (e.g. hydrangeas), the
 * copy is careful and asks the user to confirm.
 */

import { CareSuggestion } from '../types/care.types';

const water = (name: string, days: number): CareSuggestion => ({
  key: 'water',
  taskType: 'watering',
  title: `Water ${name}`,
  detail: `Every ${days} days`,
  recurrence: 'every_x_days',
  recurrenceIntervalDays: days,
  instructions: `Check the top inch of soil — water ${name} when it feels dry. Adjust for heat and rain; the schedule is just a gentle nudge.`,
  priority: 'medium',
  firstDueInDays: days,
});

const fertilize = (name: string, days: number): CareSuggestion => ({
  key: 'fertilize',
  taskType: 'fertilizing',
  title: `Feed ${name}`,
  detail: `Every ${Math.round(days / 7)} weeks`,
  recurrence: 'every_x_days',
  recurrenceIntervalDays: days,
  instructions: `Use a balanced fertilizer during the growing season. Ease off in winter when growth slows.`,
  videoQuery: `how to fertilize ${name}`,
  priority: 'low',
  firstDueInDays: days,
});

const harvestCheck = (name: string): CareSuggestion => ({
  key: 'harvest',
  taskType: 'harvesting',
  title: `Check ${name} for harvest`,
  detail: 'Weekly',
  recurrence: 'weekly',
  instructions: `Take a quick look for anything ripe or ready. Regular harvesting often encourages more growth.`,
  priority: 'low',
  firstDueInDays: 7,
});

const generic = (name: string): CareSuggestion[] => [
  water(name, 3),
  {
    key: 'check',
    taskType: 'general',
    title: `Check on ${name}`,
    detail: 'Weekly',
    recurrence: 'weekly',
    instructions: `A quick weekly look — soil moisture, pests, and new growth. Note anything that needs attention.`,
    priority: 'low',
    firstDueInDays: 7,
  },
];

function categoryFor(name: string, type: string): string {
  const n = name.toLowerCase();
  if (/tomato/.test(n)) return 'tomato';
  if (/pepper|chil/.test(n)) return 'pepper';
  if (/hydrangea/.test(n)) return 'hydrangea';
  if (/basil|mint|cilantro|coriander|parsley|thyme|oregano|rosemary|sage|dill|chive/.test(n)) return 'herb';
  switch (type) {
    case 'herb':
      return 'herb';
    case 'vegetable':
      return 'vegetable';
    case 'fruit':
      return 'fruit';
    case 'flower':
      return 'flower';
    case 'houseplant':
      return 'houseplant';
    case 'succulent':
      return 'succulent';
    default:
      return 'generic';
  }
}

export function suggestCareForPlant(plant: { name: string; type: string }): CareSuggestion[] {
  const name = plant.name || 'this plant';
  const category = categoryFor(plant.name ?? '', plant.type ?? 'other');

  switch (category) {
    case 'herb':
      return [
        water(name, 2),
        {
          key: 'prune',
          taskType: 'pruning',
          title: `Pinch back ${name}`,
          detail: 'Every 2 weeks',
          recurrence: 'every_x_days',
          recurrenceIntervalDays: 14,
          instructions: `Pinch off the top set of leaves every couple of weeks to keep ${name} bushy and productive.`,
          videoQuery: `how to pinch ${name}`,
          priority: 'low',
          firstDueInDays: 14,
        },
        harvestCheck(name),
      ];
    case 'tomato':
      return [
        water(name, 2),
        fertilize(name, 21),
        {
          key: 'prune',
          taskType: 'pruning',
          title: `Prune ${name} suckers`,
          detail: 'Weekly',
          recurrence: 'weekly',
          instructions: `Pinch out the small "suckers" that grow between the main stem and branches. Weekly is plenty.`,
          videoQuery: 'how to prune tomato suckers',
          priority: 'low',
          firstDueInDays: 7,
        },
        harvestCheck(name),
      ];
    case 'pepper':
      return [water(name, 3), fertilize(name, 28), harvestCheck(name)];
    case 'hydrangea':
      return [
        water(name, 3),
        {
          key: 'prune',
          taskType: 'pruning',
          title: 'Hydrangea pruning check',
          detail: 'Once a year',
          recurrence: 'yearly',
          instructions:
            'Pruning timing depends on hydrangea variety. Some bloom on old wood and are pruned right after flowering; others bloom on new wood and can be pruned in late winter or early spring. Confirm your variety before heavy pruning.',
          videoQuery: 'how to prune hydrangea old wood vs new wood',
          priority: 'medium',
          firstDueInDays: 30,
        },
      ];
    case 'houseplant':
      return [
        water(name, 7),
        { ...fertilize(name, 30), detail: 'Monthly (growing season)' },
      ];
    case 'vegetable':
      return [water(name, 2), fertilize(name, 28), harvestCheck(name)];
    case 'fruit':
      return [water(name, 3), fertilize(name, 30), harvestCheck(name)];
    case 'flower':
      return [
        water(name, 3),
        {
          key: 'prune',
          taskType: 'pruning',
          title: `Deadhead ${name}`,
          detail: 'Weekly',
          recurrence: 'weekly',
          instructions: `Remove spent blooms each week to encourage more flowers (if your variety reblooms).`,
          priority: 'low',
          firstDueInDays: 7,
        },
      ];
    case 'succulent':
      return [
        {
          ...water(name, 14),
          detail: 'Every 2 weeks',
          instructions: `Succulents like to dry out fully — water sparingly, roughly every couple of weeks, and less in winter.`,
        },
      ];
    default:
      return generic(name);
  }
}
