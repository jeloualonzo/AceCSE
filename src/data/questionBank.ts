import type { Question } from '@/types';

/**
 * The validated local question bank.
 *
 * Content lives in modular datasets under /content/questions/<subject>/*.json
 * and is discovered automatically via glob import — adding a new dataset file
 * requires no code change. Everything is validated at build time
 * (`npm run validate:questions`) and defensively here at load time; invalid
 * items are dropped (never silently mangled) with a console warning in dev.
 */

const modules = import.meta.glob<unknown[]>('../../content/questions/**/*.json', {
  eager: true,
  import: 'default',
});

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

function loadBank(sources: [string, unknown[]][]): Question[] {
  const seen = new Set<string>();
  const bank: Question[] = [];
  for (const [, source] of sources) {
    if (!Array.isArray(source)) continue;
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

export const QUESTION_BANK: readonly Question[] = loadBank(
  Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))
);

/** Fast id → question lookup. */
export const QUESTION_INDEX: ReadonlyMap<string, Question> = new Map(
  QUESTION_BANK.map((q) => [q.id, q])
);
