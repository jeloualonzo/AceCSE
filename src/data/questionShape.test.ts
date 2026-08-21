
import { describe, expect, it } from 'vitest';
import {
  DIR_BY_SUBJECT,
  SUBJECT_BY_DIR,
  hasContiguousChoiceIds,
  isValidQuestion,
} from '@/data/questionShape';
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

describe('question-directory manifest mappings', () => {
  it('keeps every canonical subject directory mapped for Vite manifest generation', () => {
    expect(SUBJECT_BY_DIR).toEqual({
      numerical: 'Numerical Reasoning',
      analytical: 'Analytical Reasoning',
      verbal: 'Verbal Ability',
      clerical: 'Clerical Ability',
      'general-information': 'General Information',
    });
    expect(DIR_BY_SUBJECT).toEqual({
      'Numerical Reasoning': 'numerical',
      'Analytical Reasoning': 'analytical',
      'Verbal Ability': 'verbal',
      'Clerical Ability': 'clerical',
      'General Information': 'general-information',
    });
  });
});

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

  it('accepts every canonical structured-only Spelling ID without legacy explanation', () => {
    const canonicalIds = [
      'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
      'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
    ];
    for (const id of canonicalIds) {
      const q = {
        ...base({
          id,
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
      expect(isValidQuestion(q), id).toBe(true);
    }
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
