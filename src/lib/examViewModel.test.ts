import { describe, expect, it } from 'vitest';
import {
  LEGACY_SECTION_ID,
  bookletQuestionOrder,
  buildBooklet,
  computeAnswerCounts,
  computeSectionAnswerCounts,
  isLegacyBooklet,
  navigatorBlocks,
  questionNumberMap,
  sessionNumberMap,
  sectionItemOrder,
  sectionQuestionOrder,
  sectionTitle,
  subjectNumberMap,
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

describe('sessionNumberMap — session-based booklet numbering', () => {
  const edqItems: SessionItem[] = Array.from({ length: 20 }, (_, i) => ({
    kind: 'administrative' as const,
    id: `edq-${String(i + 1).padStart(2, '0')}`,
    sectionId: 'EDQ',
  }));

  it('numbers EDQ 1–20, first scored question 21, and never resets between subjects', () => {
    const items: SessionItem[] = [
      ...edqItems,
      { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
      { kind: 'question', questionId: 'N2', sectionId: 'Numerical Reasoning' },
      { kind: 'group', groupId: 'g1', sectionId: 'Verbal Ability', questionIds: ['V1', 'V2', 'V3'] },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['N1', 'N2', 'V1', 'V2', 'V3'] }));
    const numbers = sessionNumberMap(sections);

    expect(numbers.get('edq-01')).toBe(1);
    expect(numbers.get('edq-20')).toBe(20);
    expect(numbers.get('N1')).toBe(21); // first scored item is 21
    expect(numbers.get('N2')).toBe(22);
    // Verbal continues where Numerical ended — NO reset to 1.
    expect(numbers.get('V1')).toBe(23);
    expect(numbers.get('V3')).toBe(25);
  });

  it('a subject ending at n hands n+1 to the next subject (no EDQ variant)', () => {
    const items: SessionItem[] = [
      { kind: 'group', groupId: 'g1', sectionId: 'A', questionIds: ['A1', 'A2'] },
      { kind: 'question', questionId: 'B1', sectionId: 'B' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['A1', 'A2', 'B1'] }));
    const numbers = sessionNumberMap(sections);
    expect(numbers.get('A2')).toBe(2);
    expect(numbers.get('B1')).toBe(3);
  });

  it('sectionItemOrder includes administrative ids; sectionQuestionOrder never does', () => {
    const items: SessionItem[] = [
      ...edqItems.slice(0, 2),
      { kind: 'question', questionId: 'Q1', sectionId: 'EDQ' /* pathological but tolerated */ },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['Q1'] }));
    expect(sectionItemOrder(sections[0])).toEqual(['edq-01', 'edq-02', 'Q1']);
    expect(sectionQuestionOrder(sections[0])).toEqual(['Q1']);
  });

  it('navigatorBlocks marks administrative runs and keeps them out of question blocks', () => {
    const items: SessionItem[] = [
      ...edqItems.slice(0, 3),
      { kind: 'question', questionId: 'Q1', sectionId: 'EDQ' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['Q1'] }));
    const blocks = navigatorBlocks(sections[0]);
    expect(blocks).toEqual([
      { ids: ['edq-01', 'edq-02', 'edq-03'], administrative: true },
      { ids: ['Q1'] },
    ]);
  });
});

describe('subjectNumberMap — subject-local booklet numbering (Practice)', () => {
  it('restarts at 1 in every section and never continues across a boundary', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'V2', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'V3', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
      { kind: 'group', groupId: 'g1', sectionId: 'Numerical Reasoning', questionIds: ['N2', 'N3'] },
      { kind: 'question', questionId: 'C1', sectionId: 'Clerical Ability' },
    ];
    const sections = buildBooklet(
      session({ items, questionIds: ['V1', 'V2', 'V3', 'N1', 'N2', 'N3', 'C1'] })
    );
    const numbers = subjectNumberMap(sections);

    expect([numbers.get('V1'), numbers.get('V2'), numbers.get('V3')]).toEqual([1, 2, 3]);
    // Numerical starts over at 1 — session-wide it would have been 4–6.
    expect([numbers.get('N1'), numbers.get('N2'), numbers.get('N3')]).toEqual([1, 2, 3]);
    expect(numbers.get('C1')).toBe(1);
    expect(numbers.size).toBe(7);
  });

  it('numbers administrative items within their own section, like sectionItemOrder', () => {
    const items: SessionItem[] = [
      { kind: 'administrative', id: 'edq-01', sectionId: 'EDQ' },
      { kind: 'administrative', id: 'edq-02', sectionId: 'EDQ' },
      { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['V1'] }));
    const numbers = subjectNumberMap(sections);

    expect([numbers.get('edq-01'), numbers.get('edq-02')]).toEqual([1, 2]);
    // Session-wide this would be 3; Practice presents subjects independently.
    expect(numbers.get('V1')).toBe(1);
  });

  /**
   * Appending a progressive Practice batch may only extend a subject's own run,
   * so nothing already numbered can move — the property "Show More must not
   * change the numbering" reduces to exactly this.
   */
  it('leaves every existing number untouched when a later batch is appended', () => {
    const base: SessionItem[] = [
      { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'V2', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
    ];
    const before = subjectNumberMap(buildBooklet(session({ items: base, questionIds: ['V1', 'V2', 'N1'] })));
    const grown: SessionItem[] = [
      ...base.slice(0, 2),
      { kind: 'question', questionId: 'V3', sectionId: 'Verbal Ability' },
      base[2],
      { kind: 'question', questionId: 'N2', sectionId: 'Numerical Reasoning' },
    ];
    const after = subjectNumberMap(
      buildBooklet(session({ items: grown, questionIds: ['V1', 'V2', 'V3', 'N1', 'N2'] }))
    );

    for (const [id, number] of before) expect(after.get(id)).toBe(number);
    expect(after.get('V3')).toBe(3);
    expect(after.get('N2')).toBe(2);
  });

  it('is unchanged from sessionNumberMap for a single-section booklet', () => {
    const questionIds = Array.from({ length: 12 }, (_, index) => `V${index + 1}`);
    const items: SessionItem[] = questionIds.map((questionId) => ({
      kind: 'question',
      questionId,
      sectionId: 'Verbal Ability',
    }));
    const sections = buildBooklet(session({ items, questionIds }));

    expect([...subjectNumberMap(sections)]).toEqual([...sessionNumberMap(sections)]);
  });
});

describe('computeSectionAnswerCounts', () => {
  it('counts only within the given section', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
      { kind: 'question', questionId: 'N2', sectionId: 'Numerical Reasoning' },
      { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['N1', 'N2', 'V1'] }));
    const answers = { N1: 'A' }; // V1 unanswered, N2 unanswered

    expect(computeSectionAnswerCounts(sections[0], answers)).toEqual({ total: 2, answered: 1, unanswered: 1 });
    expect(computeSectionAnswerCounts(sections[1], answers)).toEqual({ total: 1, answered: 0, unanswered: 1 });
  });
});

describe('navigatorBlocks — flat grid, not one row per legacy question', () => {
  it('merges consecutive plain questions and singleton groups into one shared block', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'Q1', sectionId: 'S' },
      { kind: 'group', groupId: 'g-singleton', sectionId: 'S', questionIds: ['Q2'] }, // migrated legacy question
      { kind: 'question', questionId: 'Q3', sectionId: 'S' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['Q1', 'Q2', 'Q3'] }));
    const blocks = navigatorBlocks(sections[0]);

    expect(blocks).toEqual([{ ids: ['Q1', 'Q2', 'Q3'] }]);
  });

  it('gives a real multi-question group its own labeled block without breaking surrounding questions into separate rows', () => {
    const items: SessionItem[] = [
      { kind: 'question', questionId: 'Q1', sectionId: 'S' },
      { kind: 'group', groupId: 'g-real', sectionId: 'S', questionIds: ['Q2', 'Q3', 'Q4'] },
      { kind: 'question', questionId: 'Q5', sectionId: 'S' },
    ];
    const sections = buildBooklet(session({ items, questionIds: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'] }));
    const blocks = navigatorBlocks(sections[0]);

    expect(blocks).toEqual([
      { ids: ['Q1'] },
      { ids: ['Q2', 'Q3', 'Q4'], groupId: 'g-real' },
      { ids: ['Q5'] },
    ]);
  });

  it('separates administrative nodes into their own marked block, never a question block', () => {
    const section = buildBooklet(
      session({
        items: [
          { kind: 'administrative', id: 'edq-01', sectionId: 'S' },
          { kind: 'question', questionId: 'Q1', sectionId: 'S' },
        ],
        questionIds: ['Q1'],
      })
    )[0];
    const blocks = navigatorBlocks(section);
    expect(blocks).toEqual([
      { ids: ['edq-01'], administrative: true },
      { ids: ['Q1'] },
    ]);
  });
});
