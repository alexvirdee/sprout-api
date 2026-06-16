/**
 * careTask.service — small helpers for care tasks: advancing a recurring task's
 * due date, and building a (search-based) how-to video URL.
 */

import { CareRecurrence } from '../models/CareTask';

/** The next due date after `from` for a given recurrence. 'none' returns `from`. */
export function nextDueDate(from: Date, recurrence: CareRecurrence, intervalDays?: number | null): Date {
  const d = new Date(from.getTime());
  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'every_x_days':
      d.setDate(d.getDate() + (intervalDays && intervalDays > 0 ? intervalDays : 1));
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      break; // 'none'
  }
  return d;
}

/** A YouTube *search* link (no scraping) for "how to" care videos. */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
