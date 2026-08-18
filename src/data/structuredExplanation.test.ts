import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { getStructuredExplanation, isValidStructuredExplanation } from './structuredExplanation';

const FROZEN_PILOT_IDS = ['num-0019', 'num-0020', 'num-0021'] as const;
const BATCH2_IDS = ['num-0022', 'num-0023', 'num-0024'] as const;
const ALL_STRUCTURED_IDS = [...FROZEN_PILOT_IDS, ...BATCH2_IDS];
const ALL_SUBJECTS = [
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
  'Numerical Reasoning',
  'Verbal Ability',
] as const;

const EXPECTED_FROZEN_BLOCKS = {
  'num-0019': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — 24' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check the difference between consecutive terms.' },
    { type: 'pattern', expression: '4 + 5 = 9\n9 + 5 = 14\n14 + 5 = 19' },
    { type: 'paragraph', text: 'The same operation is repeated: +5.' },
    { type: 'solution', expression: '19 + 5 = 24' },
    { type: 'answer', text: '24', variant: 'final' },
    { type: 'rule', text: 'Arithmetic sequence: consecutive terms have a constant difference.' },
  ],
  'num-0020': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — 48' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check how each term changes to the next.' },
    { type: 'pattern', expression: '3 × 2 = 6\n6 × 2 = 12\n12 × 2 = 24' },
    { type: 'paragraph', text: 'The same operation is repeated: ×2.' },
    { type: 'solution', expression: '24 × 2 = 48' },
    { type: 'answer', text: '48', variant: 'final' },
    { type: 'rule', text: 'Geometric sequence: consecutive terms have a constant multiplication ratio.' },
  ],
  'num-0021': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — 27' },
    { type: 'paragraph', label: 'What to Notice', text: 'The terms do not increase by the same amount, so check the differences.' },
    { type: 'pattern', expression: '5 − 2 = 3\n9 − 5 = 4\n14 − 9 = 5\n20 − 14 = 6' },
    { type: 'paragraph', text: 'The differences increase by 1:' },
    { type: 'math', expression: '+3, +4, +5, +6, +7' },
    { type: 'solution', expression: '20 + 7 = 27' },
    { type: 'answer', text: '27', variant: 'final' },
    { type: 'rule', text: 'When consecutive differences increase regularly, continue the pattern in the differences.' },
  ],
} as const;

const EXPECTED_BATCH2_BLOCKS = {
  'num-0022': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — 13' },
    { type: 'paragraph', label: 'What to Notice', text: 'Each term is the sum of the two preceding terms.' },
    { type: 'pattern', expression: '1 + 1 = 2\n1 + 2 = 3\n2 + 3 = 5\n3 + 5 = 8\n5 + 8 = 13' },
    { type: 'solution', expression: '5 + 8 = 13' },
    { type: 'answer', text: '13', variant: 'final' },
    { type: 'rule', text: 'Fibonacci sequence: each term is the sum of the two preceding terms.' },
  ],
  'num-0023': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — 47' },
    { type: 'paragraph', label: 'What to Notice', text: 'The terms are multiplied by 2, then increased by 1.' },
    { type: 'pattern', expression: '2 × 2 + 1 = 5\n5 × 2 + 1 = 11\n11 × 2 + 1 = 23' },
    { type: 'paragraph', text: 'The same operation is repeated: ×2, then +1.' },
    { type: 'solution', expression: '23 × 2 + 1 = 47\n46 + 1 = 47' },
    { type: 'answer', text: '47', variant: 'final' },
    { type: 'rule', text: 'When simple addition or multiplication does not explain a series, check for a repeated combination of operations.' },
  ],
  'num-0024': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 36' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check the differences between consecutive terms.' },
    { type: 'pattern', expression: '4 − 1 = 3\n9 − 4 = 5\n16 − 9 = 7\n25 − 16 = 9' },
    { type: 'paragraph', text: 'The differences increase by 2:' },
    { type: 'math', expression: '+3, +5, +7, +9, +11' },
    { type: 'solution', expression: '25 + 11 = 36' },
    { type: 'answer', text: '36', variant: 'final' },
    { type: 'rule', text: 'The differences between consecutive perfect squares increase by consecutive odd numbers.' },
    {
      type: 'alternative_solution',
      title: 'Alternative Method',
      blocks: [
        { type: 'paragraph', text: 'Recognize the perfect squares.' },
        { type: 'math', expression: '1²\n2²\n3²\n4²\n5²' },
        { type: 'paragraph', text: 'The next term is:' },
        { type: 'math', expression: '6² = 36' },
        { type: 'answer', text: '36', variant: 'final' },
      ],
    },
  ],
} as const;

describe('Number Series structured explanation Batch 2', () => {
  it('contains exactly the approved semantic content for num-0022 through num-0024', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of BATCH2_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH2_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
    }

    expect(catalog.questions.get('num-0022')?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    expect(catalog.questions.get('num-0023')?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    expect(catalog.questions.get('num-0024')?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(true);

    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredIds).toEqual(ALL_STRUCTURED_IDS);
  });

  it('keeps the first three frozen pilot payloads unchanged', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of FROZEN_PILOT_IDS) {
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks).toEqual(EXPECTED_FROZEN_BLOCKS[id]);
    }
  });

  it('preserves stems, choices, answer keys, legacy fields, and task metadata for Batch 2', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0022': {
        question: 'What is the next term: 1, 1, 2, 3, 5, 8, ___?',
        choices: ['12', '14', '11', '13', '15'],
        correctOptionId: 'D',
        steps: ['Recognize the rule: each term = sum of the previous two terms.', 'Apply: the two terms before the blank are 5 and 8.', 'Compute: 5 + 8 = 13.'],
      },
      'num-0023': {
        question: 'Identify the next term: 2, 5, 11, 23, ___',
        choices: ['43', '45', '46', '48', '47'],
        correctOptionId: 'E',
        steps: ["Test the rule 'multiply by 2 then add 1': 2×2+1=5 ✓, 5×2+1=11 ✓, 11×2+1=23 ✓.", 'Apply to 23: 23×2 = 46, then 46+1 = 47.'],
      },
      'num-0024': {
        question: 'What number comes next: 1, 4, 9, 16, 25, ___?',
        choices: ['36', '30', '34', '35', '37'],
        correctOptionId: 'A',
        steps: ['Identify the terms as perfect squares: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25.', 'The next term in the pattern is 6² = 36.'],
      },
    } as const;

    for (const id of BATCH2_IDS) {
      const question = catalog.questions.get(id)!;
      expect(question.question).toBe(expected[id].question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expected[id].choices);
      expect(question.correctOptionId).toBe(expected[id].correctOptionId);
      expect(question.explanation.length).toBeGreaterThanOrEqual(100);
      expect(question.steps).toEqual(expected[id].steps);
      expect(question.distractorExplanations).toBeTruthy();
      expect(question.tip).toBeTruthy();
      expect(question.numberSeries).toBeTruthy();
      expect(question.taskInstance).toBeTruthy();
    }
  });

  it('keeps later Number Series questions on the legacy path', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const structuredIdSet = new Set<string>(ALL_STRUCTURED_IDS);
    const laterNumberSeries = [...catalog.questions.values()].filter(
      (question) => question.topic === 'Number Series' && !structuredIdSet.has(question.id)
    );

    expect(laterNumberSeries.length).toBeGreaterThan(0);
    expect(laterNumberSeries.every((question) => question.structuredExplanation === undefined)).toBe(true);
    expect(laterNumberSeries.every((question) => question.explanation.length >= 100)).toBe(true);
    expect(catalog.questions.get('num-0025')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('num-0026')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('num-0108')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('num-0137')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('num-0147')?.structuredExplanation).toBeUndefined();
  });

  it('does not add structured explanations to other subject families', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);

    expect(structuredIds).toEqual(ALL_STRUCTURED_IDS);
    expect([...catalog.questions.values()].filter((question) => question.subject !== 'Numerical Reasoning' && question.structuredExplanation).length).toBe(0);
  });

  it('rejects malformed or unsupported structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'pattern', expression: '' }] })).toBe(false);
    expect(isValidStructuredExplanation({ blocks: [{ type: 'alternative_solution', title: 'Alternative Method', blocks: [] }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Solution' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unsupported', text: 'bad' }] })).toBeUndefined();
  });
});
