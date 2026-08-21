/**
 * Shared structural knowledge about the question bank, used in TWO runtimes:
 *
 *  - the browser (defensive validation when a lazy question chunk loads), and
 *  - Node at build time (the manifest Vite plugin in `scripts/`).
 *
 * Keep this file dependency-free and framework-free.
 */

import type { Question, Subject } from '@/types';

export const OPTION_IDS = ['A', 'B', 'C', 'D', 'E'] as const;
const OPTION_ID_SET: ReadonlySet<string> = new Set(OPTION_IDS);

/** Migration contract: legacy content has 4 choices, new content 5. */
export const MIN_CHOICES = 4;
export const MAX_CHOICES = 5;

const CANONICAL_STRUCTURED_SPELLING_IDS = new Set([
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
]);

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
    (typeof question.explanation === 'string' || (
      CANONICAL_STRUCTURED_SPELLING_IDS.has(question.id as string) &&
      question.subject === 'Clerical Ability' &&
      question.topic === 'Spelling' &&
      typeof question.structuredExplanation === 'object' &&
      question.structuredExplanation !== null &&
      Array.isArray((question.structuredExplanation as { blocks?: unknown }).blocks)
    )) &&

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
