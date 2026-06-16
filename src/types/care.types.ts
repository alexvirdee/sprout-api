/**
 * Care suggestion shape returned by the rules engine. Enum-typed so a suggestion
 * maps cleanly onto a CareTask.
 */

import { CarePriority, CareRecurrence, CareTaskType } from '../models/CareTask';

export interface CareSuggestion {
  key: string;
  taskType: CareTaskType;
  title: string;
  detail: string;
  recurrence: CareRecurrence;
  recurrenceIntervalDays?: number;
  instructions: string;
  videoQuery?: string;
  priority: CarePriority;
  firstDueInDays: number;
}
