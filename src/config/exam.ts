import type { ExamLevel, Subject } from '@/types';

/** CSC passing rate for the Career Service Examination. */
export const PASSING_PERCENTAGE = 80;

/** Subjects tested per exam level, in official section order. */
export const SUBJECTS_BY_LEVEL: Record<ExamLevel, Subject[]> = {
  Professional: [
    'Numerical Reasoning',
    'Analytical Reasoning',
    'Verbal Ability',
    'General Information',
  ],
  Subprofessional: [
    'Numerical Reasoning',
    'Clerical Ability',
    'Verbal Ability',
    'General Information',
  ],
};

export interface ExamBlueprint {
  totalItems: number;
  durationMinutes: number;
  /** Official item counts per subject; sums to totalItems. */
  distribution: Partial<Record<Subject, number>>;
}

/**
 * Full-length CSC-PPT blueprint per level. Scaled simulations derive their
 * subject mix proportionally from these distributions.
 */
export const EXAM_BLUEPRINT: Record<ExamLevel, ExamBlueprint> = {
  Professional: {
    totalItems: 170,
    durationMinutes: 190, // 3 hours 10 minutes
    distribution: {
      'Numerical Reasoning': 40,
      'Analytical Reasoning': 40,
      'Verbal Ability': 50,
      'General Information': 40,
    },
  },
  Subprofessional: {
    totalItems: 165,
    durationMinutes: 160, // 2 hours 40 minutes
    distribution: {
      'Numerical Reasoning': 40,
      'Clerical Ability': 35,
      'Verbal Ability': 50,
      'General Information': 40,
    },
  },
};

/**
 * Honest simulation sizes. A tier is only offered when the validated bank has
 * enough unique questions in every subject to fill it without repeats. The
 * full 170/165 simulation unlocks last, as the bank grows.
 */
export const SIMULATION_TIERS = [20, 50, 100] as const;

/** Question-count choices for subject practice drills. */
export const PRACTICE_SIZES = [10, 20, 30] as const;

/** Optional practice timer allots this many seconds per question. */
export const PRACTICE_SECONDS_PER_QUESTION = 60;

/**
 * Time allotment for a scaled simulation: proportional to the official
 * duration, rounded up to a whole minute.
 */
export function simulationDurationSeconds(level: ExamLevel, questionCount: number): number {
  const blueprint = EXAM_BLUEPRINT[level];
  const minutes = Math.ceil((blueprint.durationMinutes * questionCount) / blueprint.totalItems);
  return minutes * 60;
}
