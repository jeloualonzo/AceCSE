// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { loadContentCatalog, QUESTION_MANIFEST } from '@/data/questionBank';
import { getCanonicalPool, getSharedTaskDefinition } from '@/data/taxonomy';
import { getVisiblePracticeItemSets } from '@/data/practiceCatalog';
import { buildNumberSeriesPracticeSession, buildSimulationSession } from '@/lib/examEngine';
import { NumberSeriesInstanceRenderer } from '@/components/exam/NumberSeriesInstanceRenderer';
import { QuestionRenderer } from '@/components/exam/booklet/QuestionRenderer';

afterEach(() => cleanup());

const numberSeriesIds = ['num-0019', 'num-0020', 'num-0021', 'num-0022', 'num-0023', 'num-0024', 'num-0025', 'num-0026', 'num-0108', 'num-0137', 'num-0147'];
const expectedSequences: Record<string, Array<string | null>> = {
  'num-0019': ['4', '9', '14', '19', null],
  'num-0020': ['3', '6', '12', '24', null],
  'num-0021': ['2', '5', '9', '14', '20', null],
  'num-0022': ['1', '1', '2', '3', '5', '8', null],
  'num-0023': ['2', '5', '11', '23', null],
  'num-0024': ['1', '4', '9', '16', '25', null],
  'num-0025': ['3', '7', '4', '10', '5', '13', '6', null],
  'num-0026': ['1', '3', '7', '13', '21', null],
  'num-0108': ['5', '6', '10', '19', '35', '60', null],
  'num-0137': ['2/4', '1/2', '2/6', '1/3', '2/8', '1/4', '2/10', null],
  'num-0147': ['13', '−21', '34', '−55', '89', null],
};

const makeQuestion = (sequence: Array<string | null>): Question => ({
  id: 'number-series-test',
  examLevel: 'Professional',
  subject: 'Numerical Reasoning',
  topic: 'Number Series',
  questionType: 'number_sequence',
  questionFormat: 'number_sequence',
  taskFormat: 'number_sequence',
  difficulty: 'Medium',
  question: 'What is the next number in the series: 4, 9, 14, ___?',
  numberSeries: { sequence, missingPosition: sequence.indexOf(null) + 1 },
  taskInstance: {
    kind: 'number_series',
    payload: {
      taskDefinitionId: 'number_series_default',
      instanceFormat: 'compact',
      sequence,
      missingPosition: sequence.indexOf(null) + 1,
      itemPrompt: 'Choose the missing term.',
      answerStructure: 'sequence_missing_term',
    },
  },
  choices: [
    { id: 'A', text: '19' },
    { id: 'B', text: '24' },
    { id: 'C', text: '29' },
    { id: 'D', text: '34' },
    { id: 'E', text: '39' },
  ],
  correctOptionId: 'B',
  explanation: 'The terms increase by 5.',
  tags: ['number-series'],
});

describe('Number Series task architecture', () => {
  it('defines concise shared directions and explicit sequence semantics', () => {
    const definition = getSharedTaskDefinition('number_series_default');
    expect(definition?.title).toBe('Number Series');
    expect(definition?.taskFormat).toBe('number_sequence');
    expect(definition?.directions).toMatch(/pattern.*series.*term/i);
    expect(definition?.answerStructure).toBe('sequence_missing_term');
    expect(definition?.sequenceRepresentation).toBe('ordered_terms_with_null_marker');
    expect(definition?.missingPositionBase).toBe(1);
    expect(JSON.stringify(definition)).not.toMatch(/AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|authored task|training rules/i);
  });

  it('preserves all 11 existing items, authored sequences, choices, and answer keys', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const questions = catalog.getQuestionsForSubject('Numerical Reasoning').filter((question) => question.topic === 'Number Series');
    expect(questions).toHaveLength(11);
    expect(new Set(questions.map((question) => question.id))).toEqual(new Set(numberSeriesIds));
    for (const question of questions) {
      const structure = question.numberSeries;
      const payload = question.taskInstance?.payload;
      expect(structure?.sequence).toEqual(expectedSequences[question.id]);
      expect(structure?.missingPosition).toBe(structure?.sequence.length);
      expect(payload?.sequence).toEqual(expectedSequences[question.id]);
      expect(payload?.missingPosition).toBe(structure?.missingPosition);
      expect(question.taskInstance?.kind).toBe('number_series');
      expect(payload?.instanceFormat).toBe('compact');
      expect(question.choices).toHaveLength(5);
      expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(5);
      expect(question.choices.some((choice) => choice.id === question.correctOptionId)).toBe(true);
    }
    expect(questions.find((question) => question.id === 'num-0137')?.numberSeries?.sequence).toContain('2/10');
    expect(questions.find((question) => question.id === 'num-0147')?.numberSeries?.sequence).toContain('−21');
  });

  it('builds one canonical Number Series practice block for both exam levels', async () => {
    for (const level of ['Professional', 'Subprofessional'] as const) {
      const session = await buildNumberSeriesPracticeSession(level);
      expect(session.questionIds).toHaveLength(11);
      expect(new Set(session.questionIds)).toEqual(new Set(numberSeriesIds));
      expect(session.config.taskFormat).toBe('number_sequence');
      expect(session.items).toEqual([
        expect.objectContaining({ kind: 'pool', poolId: 'numerical-number-sequence', taskFormat: 'number_sequence', questionIds: session.questionIds }),
      ]);
    }
  });

  it('renders first, middle, and final missing positions from structured data', () => {
    for (const [sequence, missingPosition] of [
      [[null, '2', '4'], 1],
      [['12', null, '48', '96'], 2],
      [['12', '24', '48', null], 4],
    ] as const) {
      const question = makeQuestion([...sequence]);
      const { container } = render(<NumberSeriesInstanceRenderer question={question} />);
      expect(container.querySelector(`[data-sequence-position="${missingPosition}"]`)).toHaveTextContent('?');
      expect(container.querySelectorAll('[data-sequence-position]')).toHaveLength(sequence.length);
      cleanup();
    }
  });

  it('preserves exact string notation and does not repeat the long authored stem', () => {
    const question = makeQuestion(['2/4', '1/2', '−21', null]);
    const { container } = render(
      <QuestionRenderer question={question} questionNumber={1} selectedOptionId={null} onSelectOption={() => undefined} />
    );
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText('−21')).toBeInTheDocument();
    expect(screen.getByText('Choose the missing term.')).toBeInTheDocument();
    expect(screen.queryByText('What is the next number in the series: 4, 9, 14, ___?')).not.toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(container.querySelector('[data-sequence-position="4"]')).toHaveTextContent('?');
  });

  it('keeps numeric pool blocks contiguous and excludes letter-series and historical groups in seeded simulations', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning', 'Analytical Reasoning', 'Verbal Ability', 'General Information', 'Clerical Ability']);
    let seenNumberSeriesBlock = false;
    for (const level of ['Professional', 'Subprofessional'] as const) {
      for (const seed of ['number-series-runtime-01', 'number-series-runtime-02', 'number-series-runtime-03', 'number-series-runtime-04', 'number-series-runtime-05']) {
        const session = await buildSimulationSession(level, level === 'Professional' ? 150 : 145, { seed, catalog });
        const blocks = (session.items ?? []).filter((item) => item.kind === 'pool' && item.poolId === 'numerical-number-sequence');
        expect(blocks.length).toBeLessThanOrEqual(1);
        for (const block of blocks) {
          if (block.kind !== 'pool') continue;
          seenNumberSeriesBlock = true;
          expect(block.taskFormat).toBe('number_sequence');
          expect(block.questionIds.every((id) => catalog.getClassification(id)?.topic === 'Number Series')).toBe(true);
          expect(block.questionIds).not.toContain('ana-0038');
          expect(block.questionIds).not.toContain('ana-0040');
          const positions = block.questionIds.map((id) => session.questionIds.indexOf(id)).sort((a, b) => a - b);
          expect(positions.every((position, index) => position === positions[0] + index)).toBe(true);
        }
        expect((session.items ?? []).filter((item) => item.kind === 'group' && item.groupId.startsWith('grp-num-series-'))).toHaveLength(0);
        expect(new Set(session.questionIds).size).toBe(session.questionIds.length);
      }
    }
    expect(seenNumberSeriesBlock).toBe(true);
  });

  it('hides historical Number Series groups while keeping canonical practice and fixed context visible', () => {
    const visible = getVisiblePracticeItemSets(
      QUESTION_MANIFEST.groups,
      'Subprofessional',
      SUBJECTS_BY_LEVEL.Subprofessional
    );
    const visibleIds = new Set(visible.map((group) => group.id));
    expect(visibleIds.has('grp-num-series-01')).toBe(false);
    expect(visibleIds.has('grp-num-series-02')).toBe(false);
    expect(getCanonicalPool('numerical-number-sequence')?.entries).toHaveLength(11);
    expect(visibleIds.has('grp-rc-public-trust')).toBe(true);
  });
});
