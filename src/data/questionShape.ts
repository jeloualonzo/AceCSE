/**
 * Shared structural knowledge about the question bank, used in TWO runtimes:
 *
 *  - the browser (defensive validation when a lazy question chunk loads),
 *  - Node at build time (the manifest Vite plugin in `scripts/`).
 *
 * Keep this file dependency-free and framework-free — sibling pure modules in
 * this layer (e.g. `./structuredExplanation`) are the only allowed imports.
 */

import type { Question, Subject } from '@/types';
// Relative, not `@/data/...`: this module is also bundled into vite.config.ts
// through the manifest plugin, where bare specifiers are externalized. The
// `@/types` import above survives only because `import type` is erased.
import { isValidStructuredExplanation } from './structuredExplanation';

export const OPTION_IDS = ['A', 'B', 'C', 'D', 'E'] as const;
const OPTION_ID_SET: ReadonlySet<string> = new Set(OPTION_IDS);

/** Migration contract: legacy content has 4 choices, new content 5. */
export const MIN_CHOICES = 4;
export const MAX_CHOICES = 5;

const CANONICAL_STRUCTURED_SPELLING_IDS = new Set([
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
]);
const CANONICAL_STRUCTURED_FILING_IDS = new Set([
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
]);
const CANONICAL_STRUCTURED_GRAMMAR_IDS = new Set([
  'verb-0059', 'verb-0060', 'verb-0061', 'verb-0062',
]);
const CANONICAL_STRUCTURED_CLERICAL_OPERATIONS_IDS = new Set([
  'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
  'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
  'cler-0051', 'cler-0057', 'seed-cler-003',
]);
const CANONICAL_STRUCTURED_NUMBER_SERIES_IDS = new Set([
  'num-0019', 'num-0020', 'num-0021', 'num-0022', 'num-0023', 'num-0024',
  'num-0025', 'num-0026', 'num-0108', 'num-0137', 'num-0147',
]);
const CANONICAL_STRUCTURED_AGE_PROBLEMS_IDS = new Set([
  'num-0030', 'num-0031', 'num-0142',
]);

/**
 * Narrow migration exceptions: approved canonical Spelling, Filing, Grammar,
 * Clerical Operations, Number Series, and Age Problems records whose legacy
 * `explanation`/`steps`/`distractorExplanations`/`tip` were
 * removed, so their `structuredExplanation` IS the learner-facing explanation.
 *
 * Because there is no legacy prose to fall back on, the structured payload must
 * clear the SAME bar the renderer applies (`isValidStructuredExplanation`) —
 * a shallow `Array.isArray(blocks)` check would admit a record that the
 * renderer later rejects, leaving the learner with no explanation at all.
 */
function hasApprovedStructuredOnlyExplanation(question: Record<string, unknown>): boolean {
  const isCanonicalSpelling =
    CANONICAL_STRUCTURED_SPELLING_IDS.has(question.id as string) && question.topic === 'Spelling';
  const isCanonicalFiling =
    CANONICAL_STRUCTURED_FILING_IDS.has(question.id as string) && question.topic === 'Filing & Alphabetizing';
  const isCanonicalGrammar =
    CANONICAL_STRUCTURED_GRAMMAR_IDS.has(question.id as string) && question.topic === 'Grammar & Usage';
  const isCanonicalClericalOperations =
    CANONICAL_STRUCTURED_CLERICAL_OPERATIONS_IDS.has(question.id as string) && question.topic === 'Clerical Operations';
  const isCanonicalNumberSeries =
    CANONICAL_STRUCTURED_NUMBER_SERIES_IDS.has(question.id as string) && question.topic === 'Number Series';
  const isCanonicalAgeProblems =
    CANONICAL_STRUCTURED_AGE_PROBLEMS_IDS.has(question.id as string) && question.topic === 'Age Problems';
  const isClericalCanonical = isCanonicalSpelling || isCanonicalFiling || isCanonicalClericalOperations;
  const isNumericalCanonical = isCanonicalNumberSeries || isCanonicalAgeProblems;
  const hasCanonicalSubject = isClericalCanonical
    ? question.subject === 'Clerical Ability'
    : isCanonicalGrammar
      ? question.subject === 'Verbal Ability'
      : isNumericalCanonical && question.subject === 'Numerical Reasoning';
  return (
    (isClericalCanonical || isCanonicalGrammar || isNumericalCanonical) &&
    hasCanonicalSubject &&
    isValidStructuredExplanation(question.structuredExplanation)
  );
}

/**
 * Choice ids must be a contiguous prefix of A–E in order (A,B,C,D or
 * A,B,C,D,E) — no gaps, no reordering, no missing middle options.
 */
export function hasContiguousChoiceIds(choices: readonly { id?: string }[]): boolean {
  return choices.every((choice, index) => choice?.id === OPTION_IDS[index]);
}

export const EXAM_LEVELS = ['Professional', 'Subprofessional', 'Both'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

/**
 * Directory convention for the content tree: every dataset file lives under
 * `content/questions/<dir>/`, and every question inside it must carry the
 * subject that directory maps to. The validator enforces this; the runtime
 * loader relies on it to fetch only the subjects a session needs.
 */
export const SUBJECT_BY_DIR: Readonly<Record<string, Subject>> = {
  numerical: 'Numerical Reasoning',
  analytical: 'Analytical Reasoning',
  verbal: 'Verbal Ability',
  clerical: 'Clerical Ability',
  'general-information': 'General Information',
};

export const DIR_BY_SUBJECT: Readonly<Record<Subject, string>> = {
  'Numerical Reasoning': 'numerical',
  'Analytical Reasoning': 'analytical',
  'Verbal Ability': 'verbal',
  'Clerical Ability': 'clerical',
  'General Information': 'general-information',
};

/** Structural check mirrored by `scripts/validate-questions.mjs`. */
export function isValidQuestion(q: unknown): q is Question {
  if (typeof q !== 'object' || q === null) return false;
  const question = q as Record<string, unknown>;
  const choices = question.choices;
  return (
    typeof question.id === 'string' &&
    question.id.length > 0 &&
    typeof question.question === 'string' &&
    question.question.length > 0 &&
    (typeof question.explanation === 'string' ||
      hasApprovedStructuredOnlyExplanation(question)) &&

    typeof question.subject === 'string' &&
    typeof question.topic === 'string' &&
    (EXAM_LEVELS as readonly string[]).includes(question.examLevel as string) &&
    (DIFFICULTIES as readonly string[]).includes(question.difficulty as string) &&
    Array.isArray(choices) &&
    choices.length >= MIN_CHOICES &&
    choices.length <= MAX_CHOICES &&
    hasContiguousChoiceIds(choices as { id?: string }[]) &&
    choices.every(
      (c) =>
        typeof c === 'object' &&
        c !== null &&
        OPTION_ID_SET.has((c as { id?: string }).id ?? '') &&
        typeof (c as { text?: string }).text === 'string'
    ) &&
    // the keyed answer must exist among THIS question's choices
    (choices as { id?: string }[]).some((c) => c.id === question.correctOptionId) &&
    OPTION_ID_SET.has(question.correctOptionId as string) &&
    Array.isArray(question.tags)
  );
}

// ---------------------------------------------------------------------------
// Build-time manifest (provided by `virtual:question-manifest`)
// ---------------------------------------------------------------------------

/** Per-subject supply, split by the examLevel field on each question. */
export interface SubjectSupply {
  professional: number;
  subprofessional: number;
  both: number;
}

export interface GroupMeta {
  id: string;
  title: string;
  subject: Subject;
  examLevel: string;
  topic?: string;
  questionType?: string;
  selectionPolicy?: 'atomic' | 'splittable';
  orderPolicy?: 'fixed' | 'shuffle-questions';
  tags?: string[];
  size: number;
}

export interface QuestionManifest {
  /** Keyed by canonical Subject name. Absent subject ⇒ zero supply. */
  subjects: Partial<Record<Subject, SubjectSupply>>;
  totalQuestions: number;
  /** Explicit item-set metadata for sync listings (Practice's Item Sets). */
  groups: GroupMeta[];
}

/** Unique-question supply a given exam level can draw on. */
export function supplyForLevel(
  supply: SubjectSupply | undefined,
  level: 'Professional' | 'Subprofessional'
): number {
  if (!supply) return 0;
  return supply.both + (level === 'Professional' ? supply.professional : supply.subprofessional);
}
