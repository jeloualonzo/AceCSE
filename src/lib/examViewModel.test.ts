import { describe, expect, it } from 'vitest';
import {
  LEGACY_SECTION_ID,
  bookletQuestionOrder,
  buildBooklet,
  computeAnswerCounts,
  isLegacyBooklet,
  questionNumberMap,
  sectionTitle,
} from './examViewModel';
import type { ExamSession, SessionItem } from '@/types';

function session(overrides: Partial<ExamSession>): ExamSession {
  return {
    id: 's-test',
    config: {
      mode: 'simulation',
      examLevel: 'Professional',
      questionCount: overrides.questionIds?.length ?? 0,
      timed: true,
      durationSeconds: 3600,
    },
    questionIds: [],
    startedAt: Date.now(),
    deadlineAt: null,
    answers: {},
    ...overrides,
  };
}

describe('buildBooklet — structured sessions', () => {
  it('groups items into sections by first-appearance order', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
      { kind: 'question', questionId: 'N2', sectionId: 'Numerical Reasoning' },
      { kind: 'group', groupId: 'g1', sectionId: 'Verbal Ability', questionIds: ['V1', 'V2', 'V3'] },
      { kind: 'question', questionId: 'V4', sectionId: 'Verbal Ability' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['N1', 'N2', 'V1', 'V2', 'V3', 'V4'] }));

    expect(sections.map((s) => s.sectionId)).toEqual(['Numerical Reasoning', 'Verbal Ability']);
    expect(sections[0].nodes).toEqual([
      { kind: 'question', questionId: 'N1' },
      { kind: 'question', questionId: 'N2' },
    ]);
    expect(sections[1].nodes).toEqual([
      { kind: 'group', groupId: 'g1', questionIds: ['V1', 'V2', 'V3'] },
      { kind: 'question', questionId: 'V4' },
    ]);
    expect(isLegacyBooklet(sections)).toBe(false);
  });

  it('folds re-appearances of the same sectionId into its existing bucket rather than duplicating', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'A1', sectionId: 'General Information' },
      { kind: 'question', questionId: 'B1', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'A2', sectionId: 'General Information' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['A1', 'B1', 'A2'] }));
    expect(sections.map((s) => s.sectionId)).toEqual(['General Information', 'Verbal Ability']);
    expect(sections[0].nodes.map((n) => (n.kind === 'question' ? n.questionId : ''))).toEqual(['A1', 'A2']);
  });

  it('keeps administrative nodes in their section without giving them question ids', () => {
    const items: SessionItem[] = [
      { kind: 'administrative', id: 'personal-info', sectionId: 'Personal Information' },
      { kind: 'question', questionId: 'Q1', sectionId: 'Numerical Reasoning' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['Q1'] }));
    expect(sections[0].nodes).toEqual([{ kind: 'administrative', id: 'personal-info' }]);
    expect(bookletQuestionOrder(sections)).toEqual(['Q1']);
  });
});

describe('buildBooklet — legacy/flat fallback', () => {
  it('falls back to one unsectioned run when items is absent (old saved sessions, practice)', () => {
    const s = session({ questionIds: ['Q1', 'Q2', 'Q3'] });
    const sections = buildBooklet(s);
    expect(sections).toHaveLength(1);
    expect(sections[0].sectionId).toBe(LEGACY_SECTION_ID);
    expect(sections[0].nodes).toEqual([
      { kind: 'question', questionId: 'Q1' },
      { kind: 'question', questionId: 'Q2' },
      { kind: 'question', questionId: 'Q3' },
    ]);
    expect(isLegacyBooklet(sections)).toBe(true);
    expect(sectionTitle(sections[0].sectionId)).toBe('Questions');
  });

  it('falls back the same way when items is an empty array', () => {
    const s = session({ items: [], questionIds: ['Q1'] });
    expect(isLegacyBooklet(buildBooklet(s))).toBe(true);
  });
});

describe('bookletQuestionOrder / questionNumberMap', () => {
  it('expands group question ids in place and numbers them in reading order', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'A', sectionId: 'S1' },
      { kind: 'group', groupId: 'g', sectionId: 'S1', questionIds: ['B', 'C', 'D'] },
      { kind: 'question', questionId: 'E', sectionId: 'S1' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['A', 'B', 'C', 'D', 'E'] }));
    const order = bookletQuestionOrder(sections);
    expect(order).toEqual(['A', 'B', 'C', 'D', 'E']);

    const numbers = questionNumberMap(sections);
    expect(numbers.get('A')).toBe(1);
    expect(numbers.get('D')).toBe(4);
    expect(numbers.get('E')).toBe(5);
  });
});

describe('computeAnswerCounts', () => {
  it('counts only scored questionIds, ignoring stray answer keys', () => {
    const s = session({
      questionIds: ['Q1', 'Q2', 'Q3'],
      answers: { Q1: 'A', Q3: 'B', 'not-a-real-question': 'C' },
    });
    expect(computeAnswerCounts(s)).toEqual({ total: 3, answered: 2, unanswered: 1 });
  });

  it('handles a fully unanswered session', () => {
    const s = session({ questionIds: ['Q1', 'Q2'] });
    expect(computeAnswerCounts(s)).toEqual({ total: 2, answered: 0, unanswered: 2 });
  });

  it('handles a fully answered session', () => {
    const s = session({ questionIds: ['Q1', 'Q2'], answers: { Q1: 'A', Q2: 'B' } });
    expect(computeAnswerCounts(s)).toEqual({ total: 2, answered: 2, unanswered: 0 });
  });
});
