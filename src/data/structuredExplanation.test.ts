import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { getStructuredExplanation, isValidStructuredExplanation } from './structuredExplanation';

const PILOT_IDS = ['num-0019', 'num-0020', 'num-0021'];

describe('Number Series structured explanation pilot', () => {
  it('loads exactly the approved three pilot explanations with their required content', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const questions = new Map([...catalog.questions].filter(([id]) => id.startsWith('num-')));
    const pilot = PILOT_IDS.map((id) => questions.get(id));

    expect(pilot.every(Boolean)).toBe(true);
    expect(pilot.map((question) => question!.structuredExplanation?.blocks[0])).toEqual([
      { type: 'heading', text: 'Solution' },
      { type: 'heading', text: 'Solution' },
      { type: 'heading', text: 'Solution' },
    ]);
    expect(pilot[0]!.structuredExplanation?.blocks).toHaveLength(4);
    expect(pilot[1]!.structuredExplanation?.blocks).toHaveLength(4);
    expect(pilot[2]!.structuredExplanation?.blocks).toHaveLength(5);
    expect(pilot[0]!.structuredExplanation?.blocks[1]).toEqual(expect.objectContaining({
      type: 'step',
      title: 'Find the common difference.',
    }));
    expect(pilot[1]!.structuredExplanation?.blocks[1]).toEqual(expect.objectContaining({
      type: 'step',
      title: 'Find the common ratio.',
    }));
    expect(pilot[2]!.structuredExplanation?.blocks[3]).toEqual(expect.objectContaining({
      type: 'step',
      title: 'Find the missing term.',
    }));
    expect((pilot[0]!.structuredExplanation?.blocks.at(-1) as { text: string }).text).toBe('24');
    expect((pilot[1]!.structuredExplanation?.blocks.at(-1) as { text: string }).text).toBe('48');
    expect((pilot[2]!.structuredExplanation?.blocks.at(-1) as { text: string }).text).toBe('27');

    const structuredIds = [...questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredIds).toEqual(PILOT_IDS);
  });

  it('keeps num-0022 onward on the legacy explanation path', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const nonPilot = [...catalog.questions.values()].filter(
      (question) => question.topic === 'Number Series' && !PILOT_IDS.includes(question.id)
    );

    expect(nonPilot.length).toBeGreaterThan(0);
    expect(nonPilot.every((question) => question.structuredExplanation === undefined)).toBe(true);
    expect(nonPilot.every((question) => question.explanation.length >= 100)).toBe(true);
    expect(catalog.questions.get('num-0022')?.question).toBe('What is the next term: 1, 1, 2, 3, 5, 8, ___?');
  });

  it('rejects malformed structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'math', expression: '' }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Solution' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unknown', text: 'bad' }] })).toBeUndefined();
  });
});
