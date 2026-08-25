
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

/**
 * A canonical structured-only Spelling record with every legacy explanation
 * field removed, so `structuredExplanation` is the only learner-facing aid.
 */
function structuredOnlySpelling(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const q = {
    ...base({
      id: 'cler-0012',
      subject: 'Clerical Ability',
      topic: 'Spelling',
      choices: [
        { id: 'A', text: 'accomodate' },
        { id: 'B', text: 'acommodate' },
        { id: 'C', text: 'acomodate' },
        { id: 'D', text: 'accommodate' },
        { id: 'E', text: 'accommadate' },
      ],
      correctOptionId: 'D',
      structuredExplanation: {
        blocks: [{ type: 'paragraph', label: 'Correct Spelling', text: 'accommodate' }],
      },
    }),
    ...overrides,
  } as Record<string, unknown>;
  delete q.explanation;
  delete q.steps;
  delete q.distractorExplanations;
  delete q.tip;
  return q;
}

function structuredOnlyFiling(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const q = {
    ...base({
      id: 'cler-0053',
      subject: 'Clerical Ability',
      topic: 'Filing & Alphabetizing',
      choices: [
        { id: 'A', text: 'Folder 3 (Abad, Bernardo S.)' },
        { id: 'B', text: 'Folder 1 (Abad, Fernando C.)' },
        { id: 'C', text: 'Folder 2 (Abad, Fernando M.)' },
        { id: 'D', text: 'Folder 4 (Abadilla, Teresa G.)' },
        { id: 'E', text: 'Folders 1 and 2' },
      ],
      correctOptionId: 'A',
      structuredExplanation: {
        blocks: [{ type: 'paragraph', label: 'Filing Order', text: '**1.** *Abad, Bernardo S.*' }],
      },
    }),
    ...overrides,
  } as Record<string, unknown>;
  delete q.explanation;
  delete q.steps;
  delete q.distractorExplanations;
  delete q.tip;
  return q;
}

function structuredOnlyClericalOperations(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const q = {
    ...base({
      id: 'cler-0020',
      subject: 'Clerical Ability',
      topic: 'Clerical Operations',
      choices: [
        { id: 'A', text: 'exact match' },
        { id: 'B', text: 'different code' },
        { id: 'C', text: 'different date' },
        { id: 'D', text: 'different number' },
        { id: 'E', text: 'different type' },
      ],
      correctOptionId: 'A',
      structuredExplanation: {
        blocks: [{ type: 'paragraph', label: 'Rule', text: 'Compare each displayed field using the rule stated in the question.' }],
      },
    }),
    ...overrides,
  } as Record<string, unknown>;
  delete q.explanation;
  delete q.steps;
  delete q.distractorExplanations;
  delete q.tip;
  return q;
}

function structuredOnlyGrammar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const q = {
    ...base({
      id: 'verb-0059',
      subject: 'Verbal Ability',
      topic: 'Grammar & Usage',
      choices: [
        { id: 'A', text: 'The panel of judges have announced their decision.' },
        { id: 'B', text: 'The panel of judges has announced their decision.' },
        { id: 'C', text: 'The panel of judges has announced its decision.' },
        { id: 'D', text: 'The panel of judges have announced its decision.' },
        { id: 'E', text: 'The panel of judges has announced their individual verdicts.' },
      ],
      correctOptionId: 'C',
      structuredExplanation: {
        blocks: [{ type: 'paragraph', label: 'Rule', text: 'A singular collective unit takes a singular verb and pronoun.' }],
      },
    }),
    ...overrides,
  } as Record<string, unknown>;
  delete q.explanation;
  delete q.steps;
  delete q.distractorExplanations;
  delete q.tip;
  return q;
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

/**
 * `isValidQuestion` is the sole admission gate into the catalog (the runtime
 * loader in questionBank.ts and the build-time manifest plugin both call it).
 * For approved canonical Spelling, Filing, and Grammar records there is no legacy
 * prose to fall back on, so the gate must apply the SAME bar the renderer applies
 * — otherwise a record the renderer rejects still reaches a learner with no explanation.
 */
describe('structured-only Spelling and Filing admission exceptions', () => {
  it('accepts a canonical structured-only Spelling question without legacy explanation', () => {
    expect(isValidQuestion(structuredOnlySpelling())).toBe(true);
  });

  it('rejects a structured-only question without explanation outside the canonical Spelling IDs', () => {
    const q = { ...base({ structuredExplanation: { blocks: [{ type: 'paragraph' as const, text: 'Not canonical' }] } }) } as Record<string, unknown>;
    delete q.explanation;
    expect(isValidQuestion(q)).toBe(false);
  });

  it('rejects a structured-only record whose blocks use an unsupported type', () => {
    expect(isValidQuestion(structuredOnlySpelling({
      structuredExplanation: { blocks: [{ type: 'unsupported', text: 'accommodate' }] },
    }))).toBe(false);
  });

  it('rejects a structured-only record with an empty blocks array', () => {
    expect(isValidQuestion(structuredOnlySpelling({
      structuredExplanation: { blocks: [] },
    }))).toBe(false);
  });

  it('rejects a structured-only record whose block is missing its required text', () => {
    expect(isValidQuestion(structuredOnlySpelling({
      structuredExplanation: { blocks: [{ type: 'paragraph', label: 'Correct Spelling', text: '   ' }] },
    }))).toBe(false);
  });

  it('rejects a structured-only record whose nested block is malformed', () => {
    expect(isValidQuestion(structuredOnlySpelling({
      structuredExplanation: {
        blocks: [
          { type: 'heading', text: 'Solution' },
          { type: 'alternative_solution', title: 'Memory Aid', blocks: [{ type: 'paragraph', text: '' }] },
        ],
      },
    }))).toBe(false);
  });

  it('rejects a structured-only record with a non-array blocks field', () => {
    expect(isValidQuestion(structuredOnlySpelling({
      structuredExplanation: { blocks: { type: 'paragraph', text: 'accommodate' } },
    }))).toBe(false);
  });

  it('rejects a structured-only record with no structuredExplanation at all', () => {
    const q = structuredOnlySpelling();
    delete q.structuredExplanation;
    expect(isValidQuestion(q)).toBe(false);
  });

  it('keeps the exception scoped to the approved id, subject, and topic', () => {
    expect(isValidQuestion(structuredOnlySpelling({ id: 'cler-not-canonical' }))).toBe(false);
    expect(isValidQuestion(structuredOnlySpelling({ subject: 'Verbal Ability' }))).toBe(false);
    expect(isValidQuestion(structuredOnlySpelling({ topic: 'Grammar' }))).toBe(false);
  });

  it('accepts all 12 approved Spelling ids on the structured-only path', () => {
    for (const id of [
      'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
      'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
    ]) {
      expect(isValidQuestion(structuredOnlySpelling({ id })), id).toBe(true);
    }
  });

  it('accepts all 24 approved Filing ids on the structured-only path', () => {
    for (const id of [
      'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
      'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
      'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
      'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
      'cler-0038', 'cler-0039',
    ]) {
      expect(isValidQuestion(structuredOnlyFiling({ id })), id).toBe(true);
    }
  });
});

describe('structured-only Clerical Operations admission exception', () => {
  const clericalOperationsIds = [
    'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
    'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
  ];

  it('accepts exactly the ten canonical Clerical Operations IDs without legacy explanation fields', () => {
    for (const id of clericalOperationsIds) {
      const question = structuredOnlyClericalOperations({ id });
      expect(isValidQuestion(question), id).toBe(true);
      expect(Object.hasOwn(question, 'explanation'), id).toBe(false);
      expect(Object.hasOwn(question, 'steps'), id).toBe(false);
      expect(Object.hasOwn(question, 'distractorExplanations'), id).toBe(false);
      expect(Object.hasOwn(question, 'tip'), id).toBe(false);
    }
  });

  it('rejects malformed Clerical Operations structured explanations', () => {
    expect(isValidQuestion(structuredOnlyClericalOperations({ structuredExplanation: { blocks: [] } }))).toBe(false);
    expect(isValidQuestion(structuredOnlyClericalOperations({ structuredExplanation: { blocks: [{ type: 'unsupported', text: 'bad' }] } }))).toBe(false);
    expect(isValidQuestion(structuredOnlyClericalOperations({ structuredExplanation: { blocks: [{ type: 'paragraph', text: '   ' }] } }))).toBe(false);
  });

  it('rejects a Clerical Operations structured-only record without structuredExplanation', () => {
    const question = structuredOnlyClericalOperations();
    delete question.structuredExplanation;
    expect(isValidQuestion(question)).toBe(false);
  });

  it('keeps the Clerical Operations exception scoped to approved ID, subject, and topic', () => {
    expect(isValidQuestion(structuredOnlyClericalOperations({ id: 'cler-0026' }))).toBe(false);
    expect(isValidQuestion(structuredOnlyClericalOperations({ subject: 'Verbal Ability' }))).toBe(false);
    expect(isValidQuestion(structuredOnlyClericalOperations({ topic: 'Office Procedures & Correspondence' }))).toBe(false);
  });
});

describe('structured-only Grammar admission exception', () => {
  const grammarIds = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'];

  it('accepts exactly the four canonical Grammar IDs without legacy explanation fields', () => {
    for (const id of grammarIds) {
      const question = structuredOnlyGrammar({ id });
      expect(isValidQuestion(question), id).toBe(true);
      expect(Object.hasOwn(question, 'explanation'), id).toBe(false);
      expect(Object.hasOwn(question, 'steps'), id).toBe(false);
      expect(Object.hasOwn(question, 'distractorExplanations'), id).toBe(false);
      expect(Object.hasOwn(question, 'tip'), id).toBe(false);
    }
  });

  it('rejects malformed Grammar structured explanations', () => {
    expect(isValidQuestion(structuredOnlyGrammar({ structuredExplanation: { blocks: [] } }))).toBe(false);
    expect(isValidQuestion(structuredOnlyGrammar({ structuredExplanation: { blocks: [{ type: 'unsupported', text: 'bad' }] } }))).toBe(false);
    expect(isValidQuestion(structuredOnlyGrammar({ structuredExplanation: { blocks: [{ type: 'paragraph', text: '   ' }] } }))).toBe(false);
    expect(isValidQuestion(structuredOnlyGrammar({ structuredExplanation: { blocks: [{ type: 'alternative_solution', title: 'Other Choices', blocks: [] }] } }))).toBe(false);
  });

  it('rejects a Grammar structured-only record without structuredExplanation', () => {
    const question = structuredOnlyGrammar();
    delete question.structuredExplanation;
    expect(isValidQuestion(question)).toBe(false);
  });

  it('keeps the Grammar exception scoped to the approved ID, subject, and topic', () => {
    expect(isValidQuestion(structuredOnlyGrammar({ id: 'verb-0063' }))).toBe(false);
    expect(isValidQuestion(structuredOnlyGrammar({ subject: 'Clerical Ability' }))).toBe(false);
    expect(isValidQuestion(structuredOnlyGrammar({ topic: 'Vocabulary' }))).toBe(false);
  });

  it('does not admit an unrelated structured-only Grammar-like record', () => {
    expect(isValidQuestion(structuredOnlyGrammar({ id: 'verb-unrelated' }))).toBe(false);
  });
});

describe('legacy structured explanation fallback', () => {
  it('leaves legacy questions that carry a malformed structuredExplanation admissible', () => {
    // Legacy prose is still present, so the renderer falls back to it safely.
    // This path must behave exactly as it did before the gate was tightened.
    expect(
      isValidQuestion(base({
        // @ts-expect-error deliberately malformed pilot payload on a legacy record
        structuredExplanation: { blocks: [{ type: 'unsupported', text: 'bad' }] },
      }))
    ).toBe(true);
  });

  it('still rejects an unrelated question that is missing its legacy explanation', () => {
    const q = { ...base() } as Record<string, unknown>;
    delete q.explanation;
    expect(isValidQuestion(q)).toBe(false);
  });
});
