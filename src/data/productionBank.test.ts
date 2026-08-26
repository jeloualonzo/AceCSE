import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';
import { buildGroupPracticeSession, buildSimulationSession } from '@/lib/examEngine';
import { gradeSession } from '@/lib/grading';
import type { Subject } from '@/types';

const allSubjects: Subject[] = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
];

const migratedNumberSeriesIds = new Set([
  'num-0019', 'num-0020', 'num-0021', 'num-0022', 'num-0023', 'num-0024',
  'num-0025', 'num-0026', 'num-0108', 'num-0137', 'num-0147',
]);
const cleanedSpellingIds = new Set([
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
]);
const structuredFilingIds = new Set([
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
]);
const structuredGrammarIds = new Set(['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062']);
const structuredClericalOperationsIds = new Set([
  'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
  'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
  'cler-0051', 'cler-0057', 'seed-cler-003',
]);

describe('production bank — five-choice migration', () => {
  it('every production question has exactly five contiguous choices and a valid key', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    expect(catalog.questions.size).toBeGreaterThanOrEqual(686);
    for (const q of catalog.questions.values()) {
      expect(q.choices).toHaveLength(5);
      expect(q.choices.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(q.choices.some((c) => c.id === q.correctOptionId)).toBe(true);
      if (migratedNumberSeriesIds.has(q.id) || cleanedSpellingIds.has(q.id) || structuredFilingIds.has(q.id) || structuredGrammarIds.has(q.id) || structuredClericalOperationsIds.has(q.id)) {
        expect(q.distractorExplanations).toBeUndefined();
      } else {

        // distractor notes cover exactly the four wrong options
        const wrong = q.choices.filter((c) => c.id !== q.correctOptionId).map((c) => c.id);
        expect(Object.keys(q.distractorExplanations ?? {}).sort()).toEqual(wrong.sort());
      }
      // no duplicate option texts
      expect(new Set(q.choices.map((c) => c.text.trim().toLowerCase())).size).toBe(5);
    }
  });

  it('E is genuinely represented and no position dominates (~20% each)', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const q of catalog.questions.values()) counts[q.correctOptionId] += 1;
    const total = catalog.questions.size;
    for (const letter of ['A', 'B', 'C', 'D', 'E']) {
      expect(counts[letter] / total).toBeGreaterThan(0.15);
      expect(counts[letter] / total).toBeLessThan(0.25);
    }
  });

  it('grades a correct E answer as correct on a real production question', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const eQuestion = [...catalog.questions.values()].find((q) => q.correctOptionId === 'E')!;
    expect(eQuestion).toBeTruthy();
    const session = {
      id: 's-test',
      config: {
        mode: 'practice' as const,
        examLevel: 'Professional' as const,
        questionCount: 1,
        timed: false,
        durationSeconds: null,
      },
      questionIds: [eQuestion.id],
      startedAt: Date.now(),
      deadlineAt: null,
      answers: { [eQuestion.id]: 'E' as const },
    };
    const graded = gradeSession(session, catalog.questions);
    expect(graded.correctCount).toBe(1);
    expect(graded.percentage).toBe(100);
  });
});

describe('production bank — explicit item sets', () => {
  it('loads 33 production groups covering 215 questions, all members resolvable', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const explicit = [...catalog.groups.values()].filter((g) => !g.isImplicitSingleton);
    expect(explicit.length).toBe(33);
    const memberIds = new Set(explicit.flatMap((g) => g.questionIds));
    expect(memberIds.size).toBe(215);
    for (const g of explicit) {
      expect(g.questionIds.length).toBeGreaterThanOrEqual(2);
      expect(g.directions?.length ?? 0).toBeGreaterThanOrEqual(20);
      expect(g.questions).toHaveLength(g.questionIds.length);
      for (const q of g.questions) expect(q.subject).toBe(g.subject);
    }
    // a grouped question no longer has an implicit singleton
    const sample = explicit[0].questionIds[0];
    expect(catalog.groups.has(`singleton:${sample}`)).toBe(false);
  });

  it('shared-stimulus groups are atomic/fixed and their members share the passage', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const rc = catalog.getGroup('grp-rc-public-trust')!;
    expect(rc.selectionPolicy).toBe('atomic');
    expect(rc.orderPolicy).toBe('fixed');
    expect(rc.contentBlocks?.length).toBeGreaterThan(0);
    const passages = new Set(rc.questions.map((q) => q.passage));
    expect(passages.size).toBe(1);
    expect(rc.contentBlocks![0].kind).toBe('text');
  });

  it('full simulations still meet exact scored totals with explicit groups in play', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const pro = await buildSimulationSession('Professional', 150, { seed: 'grouped-pro', catalog });
    expect(pro.questionIds).toHaveLength(150);
    expect(new Set(pro.questionIds).size).toBe(150);
    // atomic groups selected whole and contiguous
    for (const item of pro.items ?? []) {
      if (item.kind !== 'group') continue;
      const g = catalog.getGroup(item.groupId);
      if (g && !g.isImplicitSingleton && g.selectionPolicy === 'atomic') {
        expect(item.questionIds).toEqual(g.questionIds);
      }
      const start = pro.questionIds.indexOf(item.questionIds[0]);
      expect(pro.questionIds.slice(start, start + item.questionIds.length)).toEqual(item.questionIds);
    }
    const sub = await buildSimulationSession('Subprofessional', 145, { seed: 'grouped-sub', catalog });
    expect(sub.questionIds).toHaveLength(145);
  });

  it('group practice loads a whole set in authored order with a single group item', async () => {
    const session = await buildGroupPracticeSession('Subprofessional', 'grp-filing-01');
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const group = catalog.getGroup('grp-filing-01')!;
    expect(session.questionIds).toEqual(group.questionIds);
    expect(session.config.mode).toBe('practice');
    expect(session.config.subjects).toEqual(['Clerical Ability']);
    expect(session.items).toEqual([
      { kind: 'group', groupId: 'grp-filing-01', sectionId: 'Clerical Ability', questionIds: group.questionIds },
    ]);
    // no EDQ in practice
    expect((session.items ?? []).some((i) => i.kind === 'administrative')).toBe(false);
  });
});
