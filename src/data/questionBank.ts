import type { Question } from '@/types';
import analytical from '../../content/questions/analytical.json';
import clerical from '../../content/questions/clerical.json';
import clericalSupplement from '../../content/questions/clerical-supplement.json';
import general from '../../content/questions/general.json';
import numerical from '../../content/questions/numerical.json';
import seed from '../../content/questions/seed.json';
import verbal from '../../content/questions/verbal.json';

/**
 * The validated local question bank.
 *
 * Content lives in /content/questions/*.json and is validated both at build
 * time (`npm run validate:questions`) and defensively here at load time.
 * Invalid items are dropped (never silently mangled) with a console warning
 * in development.
 *
 * As authored subject files land in /content/questions they are imported and
 * concatenated below.
 */

const OPTION_IDS = new Set(['A', 'B', 'C', 'D']);

function isValidQuestion(q: unknown): q is Question {
  if (typeof q !== 'object' || q === null) return false;
  const question = q as Record<string, unknown>;
  const choices = question.choices;
  return (
    typeof question.id === 'string' &&
    question.id.length > 0 &&
    typeof question.question === 'string' &&
    question.question.length > 0 &&
    typeof question.explanation === 'string' &&
    typeof question.subject === 'string' &&
    typeof question.topic === 'string' &&
    ['Professional', 'Subprofessional', 'Both'].includes(question.examLevel as string) &&
    ['Easy', 'Medium', 'Hard'].includes(question.difficulty as string) &&
    Array.isArray(choices) &&
    choices.length === 4 &&
    choices.every(
      (c) =>
        typeof c === 'object' &&
        c !== null &&
        OPTION_IDS.has((c as { id?: string }).id ?? '') &&
        typeof (c as { text?: string }).text === 'string'
    ) &&
    OPTION_IDS.has(question.correctOptionId as string) &&
    Array.isArray(question.tags)
  );
}

function loadBank(sources: unknown[][]): Question[] {
  const seen = new Set<string>();
  const bank: Question[] = [];
  for (const source of sources) {
    for (const raw of source) {
      if (!isValidQuestion(raw)) {
        if (import.meta.env.DEV) {
          console.warn('[questionBank] Dropped invalid question:', raw);
        }
        continue;
      }
      if (seen.has(raw.id)) {
        if (import.meta.env.DEV) {
          console.warn(`[questionBank] Dropped duplicate id: ${raw.id}`);
        }
        continue;
      }
      seen.add(raw.id);
      bank.push(raw);
    }
  }
  return bank;
}

export const QUESTION_BANK: readonly Question[] = loadBank([
  numerical as unknown[],
  analytical as unknown[],
  verbal as unknown[],
  clerical as unknown[],
  clericalSupplement as unknown[],
  general as unknown[],
  seed as unknown[],
]);

/** Fast id → question lookup. */
export const QUESTION_INDEX: ReadonlyMap<string, Question> = new Map(
  QUESTION_BANK.map((q) => [q.id, q])
);
