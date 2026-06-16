/**
 * Achievement definitions — V1, encouraging not gamified. Each unlocks purely
 * from real activity metrics. Add new achievements by appending here; the
 * controller persists an `unlockedAt` the first time each becomes true.
 */

export interface AchievementMetrics {
  gardensTotal: number;
  plantsTotal: number;
  wateringSessions: number;
  longestStreak: number;
  harvests: number;
  /** Harvest entries recorded in the journal (actual harvest events). */
  harvestLogs: number;
}

export type AchievementTone = 'green' | 'gold' | 'terra' | 'sage';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: AchievementTone;
  isUnlocked: (m: AchievementMetrics) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_sprout',
    title: 'First Sprout',
    description: 'Add your very first plant',
    icon: '🌱',
    tone: 'green',
    isUnlocked: (m) => m.plantsTotal >= 1,
  },
  {
    id: 'garden_builder',
    title: 'Garden Builder',
    description: 'Create your first garden',
    icon: '🪴',
    tone: 'sage',
    isUnlocked: (m) => m.gardensTotal >= 1,
  },
  {
    id: 'watering_week',
    title: 'Watering Week',
    description: 'Reach a 7-day watering streak',
    icon: '🔥',
    tone: 'gold',
    isUnlocked: (m) => m.longestStreak >= 7,
  },
  {
    id: 'plant_parent',
    title: 'Plant Parent',
    description: 'Grow a collection of 5 plants',
    icon: '🌿',
    tone: 'green',
    isUnlocked: (m) => m.plantsTotal >= 5,
  },
  {
    id: 'growing_collection',
    title: 'Growing Collection',
    description: 'Tend a flourishing 10 plants',
    icon: '🌻',
    tone: 'sage',
    isUnlocked: (m) => m.plantsTotal >= 10,
  },
  {
    id: 'first_harvest',
    title: 'First Harvest',
    description: 'Record your first harvest',
    icon: '🍅',
    tone: 'terra',
    isUnlocked: (m) => m.harvestLogs >= 1 || m.harvests >= 1,
  },
  {
    id: 'bountiful_harvest',
    title: 'Bountiful Harvest',
    description: 'Log 10 harvests from your garden',
    icon: '🧺',
    tone: 'gold',
    isUnlocked: (m) => m.harvestLogs >= 10,
  },
  {
    id: 'consistent_care',
    title: 'Consistent Care',
    description: 'Log 30 waterings',
    icon: '💧',
    tone: 'gold',
    isUnlocked: (m) => m.wateringSessions >= 30,
  },
];
