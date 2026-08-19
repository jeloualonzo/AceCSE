
import { describe, expect, it } from 'vitest';
import { hasContiguousChoiceIds, isValidQuestion } from '@/data/questionShape';
import type { Question } from '@/types';

function base(overrides: Partial<Question> = {}): Question {
  return {
    id: 'shape-q1',
    examLevel: 'Both',
    subject: 'Verbal Ability',
    topic: 'Vocabulary',
    difficulty: 'Easy',
    question: 'Which word means most nearly the same as CANDID?',
    choices: [
      { id: 'A', text: 'evasive' },
      { id: 'B', text: 'frank' },
      { id: 'C', text: 'guarded' },
      { id: 'D', text: 'formal' },
    ],
    correctOptionId: 'B',
    explanation: 'Teaching text.',
    tags: ['vocabulary'],
    ...overrides,
  };
}

describe('choice-set validation (4-/5-choice migration contract)', () => {
  it('accepts a legacy four-choice question (A–D)', () => {
    expect(isValidQuestion(base())).toBe(true);
  });

  it('accepts a new five-choice question (A–E)', () => {
    const q = base({
      choices: [
        { id: 'A', text: 'evasive' },
        { id: 'B', text: 'frank' },
        { id: 'C', text: 'guarded' },
        { id: 'D', text: 'formal' },
        { id: 'E', text: 'reluctant' },
      ],
      correctOptionId: 'E',
    });
    expect(isValidQuestion(q)).toBe(true);
  });

  it('accepts a canonical structured-only Spelling question without legacy explanation', () => {
    const q = {
      ...base({
        id: 'cler-0012',
        subject: 'Clerical Ability',
        topic: 'Spelling',
        choices: [
          { id: 'A' as const, text: 'accomodate' },
          { id: 'B' as const, text: 'acommodate' },
          { id: 'C' as const, text: 'acomodate' },
          { id: 'D' as const, text: 'accommodate' },
          { id: 'E' as const, text: 'accommadate' },
        ],
        correctOptionId: 'D',
        structuredExplanation: { blocks: [{ type: 'paragraph' as const, label: 'Correct Spelling', text: 'accommodate' }] },
      }),
    } as Record<string, unknown>;
    delete q.explanation;
    expect(isValidQuestion(q)).toBe(true);
  });

  it('rejects a structured-only question without explanation outside the canonical Spelling IDs', () => {
    const q = { ...base({ structuredExplanation: { blocks: [{ type: 'paragraph' as const, text: 'Not canonical' }] } }) } as Record<string, unknown>;
    delete q.explanation;
    expect(isValidQuestion(q)).toBe(false);
  });

  it('rejects fewer than four choices', () => {
    const q = base({ choices: base().choices.slice(0, 3) });
    expect(isValidQuestion(q)).toBe(false);
  });

  it('rejects more than five choices', () => {
    const six = [...base().choices,
      { id: 'E' as const, text: 'x' },
      { id: 'E' as const, text: 'y' }];
    expect(isValidQuestion(base({ choices: six }))).toBe(false);
  });

  it('rejects invalid option ids (F)', () => {
    const q = base();
    // @ts-expect-error deliberately invalid id
    q.choices[3] = { id: 'F', text: 'formal' };
    expect(isValidQuestion(q)).toBe(false);
  });

  it('rejects a missing middle option (A,B,D,E — no C)', () => {
    const q = base({
      choices: [
        { id: 'A', text: 'w' },
        { id: 'B', text: 'x' },
        { id: 'D', text: 'y' },
        { id: 'E', text: 'z' },
      ],
    });
    expect(isValidQuestion(q)).toBe(false);
    expect(hasContiguousChoiceIds(q.choices)).toBe(false);
  });

  it('rejects duplicate option ids (A,B,B,D)', () => {
    const q = base({
      choices: [
        { id: 'A', text: 'w' },
        { id: 'B', text: 'x' },
        { id: 'B', text: 'y' },
        { id: 'D', text: 'z' },
      ],
    });
    expect(isValidQuestion(q)).toBe(false);
  });

  it('rejects out-of-order option ids', () => {
    const q = base({
      choices: [
        { id: 'B', text: 'x' },
        { id: 'A', text: 'w' },
        { id: 'C', text: 'y' },
        { id: 'D', text: 'z' },
      ],
    });
    expect(isValidQuestion(q)).toBe(false);
  });

  it('rejects a correct answer that is not among the choices (E key on a 4-choice item)', () => {
    expect(isValidQuestion(base({ correctOptionId: 'E' }))).toBe(false);
  });
});
