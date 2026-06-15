/**
 * streakStats — from a set of activity timestamps, compute the current streak
 * (consecutive days ending today or yesterday) and the longest streak ever.
 * Day-based, timezone-naive (uses server-local midnights). Pure + testable.
 */

const DAY_MS = 86_400_000;
const dayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export interface StreakStats {
  current: number;
  longest: number;
}

export function streakStats(dates: Date[]): StreakStats {
  if (!dates.length) return { current: 0, longest: 0 };

  const days = Array.from(new Set(dates.map(dayStart))).sort((a, b) => a - b);

  // Longest run of consecutive calendar days.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] - days[i - 1] === DAY_MS) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current run, counting back from today (or yesterday if not yet active today).
  const set = new Set(days);
  const today = dayStart(new Date());
  let cursor = set.has(today) ? today : set.has(today - DAY_MS) ? today - DAY_MS : null;
  let current = 0;
  while (cursor != null && set.has(cursor)) {
    current += 1;
    cursor -= DAY_MS;
  }

  return { current, longest };
}
