import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { getStructuredExplanation, isValidStructuredExplanation } from './structuredExplanation';

const PILOT_IDS = ['num-0019', 'num-0020', 'num-0021'] as const;
const ALL_SUBJECTS = [
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
  'Numerical Reasoning',
  'Verbal Ability',
] as const;

const EXPECTED_BLOCKS = {
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

describe('Number Series structured explanation pilot V3', () => {
  it('contains exactly the approved semantic content for all three pilot questions', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of PILOT_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
    }

    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredIds).toEqual(PILOT_IDS);
  });

  it('preserves the pilot stems, choices, answer keys, and legacy explanation fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0019': {
        question: 'What is the next number in the series: 4, 9, 14, 19, ___?',
        choices: ['25', '24', '22', '26', '29'],
        correctOptionId: 'B',
        steps: [
          'Find the differences: 9–4=5, 14–9=5, 19–14=5. The common difference is 5.',
          'Add the common difference to the last term: 19 + 5 = 24.',
        ],
      },
      'num-0020': {
        question: 'What comes next: 3, 6, 12, 24, ___?',
        choices: ['44', '36', '40', '56', '48'],
        correctOptionId: 'E',
        steps: [
          'Find the ratio between consecutive terms: 6÷3=2, 12÷6=2, 24÷12=2. Common ratio = 2.',
          'Multiply the last term by the common ratio: 24 × 2 = 48.',
        ],
      },
      'num-0021': {
        question: 'Find the missing term: 2, 5, 9, 14, 20, ___',
        choices: ['28', '25', '27', '26', '29'],
        correctOptionId: 'C',
        steps: [
          'Compute differences: 5–2=3, 9–5=4, 14–9=5, 20–14=6.',
          'Observe that the differences increase by 1 each time: 3, 4, 5, 6, so next difference = 7.',
          'Add to last term: 20 + 7 = 27.',
        ],
      },
    } as const;

    for (const id of PILOT_IDS) {
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

  it('keeps every non-pilot Number Series record on the legacy path', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const pilotIdSet = new Set<string>(PILOT_IDS);
    const nonPilot = [...catalog.questions.values()].filter(
      (question) => question.topic === 'Number Series' && !pilotIdSet.has(question.id)
    );

    expect(nonPilot.length).toBeGreaterThan(0);
    expect(nonPilot.every((question) => question.structuredExplanation === undefined)).toBe(true);
    expect(nonPilot.every((question) => question.explanation.length >= 100)).toBe(true);
    expect(catalog.questions.get('num-0022')?.question).toBe('What is the next term: 1, 1, 2, 3, 5, 8, ___?');
    expect(catalog.questions.get('num-0022')?.correctOptionId).toBe('D');
  });

  it('does not add structured explanations to other subject families', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);

    expect(structuredIds).toEqual(PILOT_IDS);
    expect([...catalog.questions.values()].filter((question) => question.subject !== 'Numerical Reasoning' && question.structuredExplanation).length).toBe(0);
  });

  it('rejects malformed or unsupported structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'pattern', expression: '' }] })).toBe(false);
    expect(isValidStructuredExplanation({ blocks: [{ type: 'correct_answer', text: '' }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Solution' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unsupported', text: 'bad' }] })).toBeUndefined();
  });
});
