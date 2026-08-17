import type { ExamLevel, Subject } from '@/types';

/** CSC passing rate for the Career Service Examination. */
export const PASSING_PERCENTAGE = 80;

/** Subjects tested per exam level. Practice uses this order; simulation may reorder blocks. */
/** Initial and subsequent Practice batch size; intentionally not learner-visible. */
export const PROGRESSIVE_PRACTICE_BATCH_SIZE = 10;

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

// ---------------------------------------------------------------------------
// EXAM FRAMEWORK — the FIXED simulation contract per level.
//
// These values are the stable frame every generated simulation honors:
// total presented items, the 20-item EDQ block, the scored test-proper
// total, the time limit, and the passing threshold. Everything else
// (subject order, per-subject allocation, group/question selection) is
// VARIABLE and governed by SIMULATION_ALLOCATION_POLICY below.
// ---------------------------------------------------------------------------

export interface ExamFramework {
  /** Items the examinee sees in a full simulation: EDQ + scored. */
  presentedItems: number;
  /** Administrative Examinee Descriptive Questionnaire items (never scored). */
  edqItems: number;
  /** Scored test-proper items. */
  scoredItems: number;
  /** Full-exam time limit (covers EDQ + test proper, as on exam day). */
  durationMinutes: number;
  /** Passing threshold, applied to the scored test proper only. */
  passingPercentage: number;
  subjects: Subject[];
}

export const EXAM_FRAMEWORK: Record<ExamLevel, ExamFramework> = {
  Professional: {
    presentedItems: 170,
    edqItems: 20,
    scoredItems: 150,
    durationMinutes: 190, // 3 hours 10 minutes
    passingPercentage: PASSING_PERCENTAGE,
    subjects: SUBJECTS_BY_LEVEL.Professional,
  },
  Subprofessional: {
    presentedItems: 165,
    edqItems: 20,
    scoredItems: 145,
    durationMinutes: 160, // 2 hours 40 minutes
    passingPercentage: PASSING_PERCENTAGE,
    subjects: SUBJECTS_BY_LEVEL.Subprofessional,
  },
};

// ---------------------------------------------------------------------------
// SIMULATION ALLOCATION POLICY — the VARIABLE half.
//
// HONESTY NOTE: the ranges and weights below are AceCSE *training-policy*
// decisions, NOT official CSC statistics. The CSC does not publish fixed
// per-subject allocations, and real booklets vary. The product goal is to
// expose examinees to varied but plausible distributions so they prepare
// for the range of situations they may encounter — never to claim "the CSC
// always has exactly X questions in this subject." Do not surface these
// numbers to users as official figures. Adjusting them later requires no
// architectural change.
// ---------------------------------------------------------------------------

export interface SubjectAllocationRule {
  subject: Subject;
  /** Inclusive bounds a generated allocation must respect (at full scale). */
  minItems: number;
  maxItems: number;
  /** Relative likelihood of receiving each item above the minimums. */
  weight: number;
}

export interface SimulationAllocationPolicy {
  /** Must equal the framework's scoredItems. */
  totalScoredItems: number;
  rules: SubjectAllocationRule[];
  randomizeSubjectOrder: boolean;
}

export const SIMULATION_ALLOCATION_POLICY: Record<ExamLevel, SimulationAllocationPolicy> = {
  Professional: {
    totalScoredItems: EXAM_FRAMEWORK.Professional.scoredItems,
    randomizeSubjectOrder: true,
    rules: [
      { subject: 'Numerical Reasoning', minItems: 30, maxItems: 50, weight: 3 },
      { subject: 'Analytical Reasoning', minItems: 30, maxItems: 50, weight: 3 },
      { subject: 'Verbal Ability', minItems: 35, maxItems: 55, weight: 3 },
      { subject: 'General Information', minItems: 20, maxItems: 40, weight: 2 },
    ],
  },
  Subprofessional: {
    totalScoredItems: EXAM_FRAMEWORK.Subprofessional.scoredItems,
    randomizeSubjectOrder: true,
    rules: [
      { subject: 'Numerical Reasoning', minItems: 30, maxItems: 50, weight: 3 },
      { subject: 'Clerical Ability', minItems: 25, maxItems: 40, weight: 2 },
      { subject: 'Verbal Ability', minItems: 35, maxItems: 55, weight: 3 },
      { subject: 'General Information', minItems: 20, maxItems: 40, weight: 2 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Legacy blueprint — kept as an internal reference distribution only.
//
// Historically this drove simulation composition. It no longer does: the
// framework + allocation policy above own simulation structure now. It
// remains because (a) removing it would erase documented context, and
// (b) it still describes one plausible full-exam composition. Nothing
// user-facing may present these counts as official subject allocations.
// ---------------------------------------------------------------------------

export interface ExamBlueprint {
  totalItems: number;
  durationMinutes: number;
  /** One plausible composition; NOT an official fixed allocation. */
  distribution: Partial<Record<Subject, number>>;
}

export const EXAM_BLUEPRINT: Record<ExamLevel, ExamBlueprint> = {
  Professional: {
    totalItems: 170,
    durationMinutes: 190,
    distribution: {
      'Numerical Reasoning': 40,
      'Analytical Reasoning': 40,
      'Verbal Ability': 50,
      'General Information': 40,
    },
  },
  Subprofessional: {
    totalItems: 165,
    durationMinutes: 160,
    distribution: {
      'Numerical Reasoning': 40,
      'Clerical Ability': 35,
      'Verbal Ability': 50,
      'General Information': 40,
    },
  },
};

/**
 * Scored-question sizes for scaled simulations. Every simulation (any size)
 * additionally presents the 20-item EDQ block first. A tier is only offered
 * when the bank can honestly fill a policy-conforming allocation with unique
 * questions; the full 150/145 test proper unlocks last.
 */
export const SIMULATION_TIERS = [20, 50, 100] as const;


/**
 * Time allotment for a simulation with `scoredCount` scored items.
 * The full test proper gets the framework's exact fixed duration (which,
 * as on exam day, also covers the EDQ); scaled tiers get a proportional
 * share, rounded up to a whole minute.
 */
export function simulationDurationSeconds(level: ExamLevel, scoredCount: number): number {
  const framework = EXAM_FRAMEWORK[level];
  if (scoredCount >= framework.scoredItems) return framework.durationMinutes * 60;
  const minutes = Math.ceil((framework.durationMinutes * scoredCount) / framework.scoredItems);
  return minutes * 60;
}
