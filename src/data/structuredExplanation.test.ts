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
    { type: 'answer', text: 'Correct Answer: B — 24', variant: 'correct' },
    { type: 'paragraph', label: 'Why', text: 'Each term increases by 5.' },
    { type: 'pattern', expression: '4 → 9 → 14 → 19 → 24' },
    { type: 'solution', expression: '19 + 5 = 24' },
    { type: 'answer', text: '24', variant: 'final' },
    { type: 'rule', text: 'In an arithmetic sequence, the difference between consecutive terms is constant.' },
  ],
  'num-0020': [
    { type: 'heading', text: 'Solution' },
    { type: 'answer', text: 'Correct Answer: E — 48', variant: 'correct' },
    { type: 'paragraph', label: 'Why', text: 'Each term is doubled.' },
    { type: 'pattern', expression: '3 → 6 → 12 → 24 → 48' },
    { type: 'solution', expression: '24 × 2 = 48' },
    { type: 'answer', text: '48', variant: 'final' },
    { type: 'rule', text: 'A geometric sequence has a constant multiplication ratio.' },
  ],
  'num-0021': [
    { type: 'heading', text: 'Solution' },
    { type: 'answer', text: 'Correct Answer: C — 27', variant: 'correct' },
    { type: 'paragraph', label: 'Why', text: 'The differences increase by 1.' },
    { type: 'pattern', expression: '+3, +4, +5, +6, +7' },
    { type: 'solution', expression: '20 + 7 = 27' },
    { type: 'answer', text: '27', variant: 'final' },
    { type: 'rule', text: 'When consecutive differences increase regularly, continue the pattern of the differences.' },
  ],
} as const;

describe('Number Series structured explanation pilot V2', () => {
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

  it('rejects malformed structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'pattern', expression: '' }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Solution' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unknown', text: 'bad' }] })).toBeUndefined();
  });
});
