import { describe, expect, it } from 'vitest';
import { createNormalizedCatalog, mergeNormalizedCatalogs } from '@/data/contentCatalog';
import { loadContentCatalog, loadGroupedFixtureCatalog } from '@/data/questionBank';
import {
  allocateScoredSubjects,
  buildSimulationSession,
  buildPracticeSession,
  buildProgressivePracticeSession,
  appendProgressivePracticeBatch,
  hasMoreProgressivePractice,
  scalePolicy,
} from '@/lib/examEngine';
import { gradeSession } from '@/lib/grading';
import { buildBooklet, sessionNumberMap } from '@/lib/examViewModel';
import { EDQ_ITEMS } from '@/data/edq';
import { EXAM_FRAMEWORK, SIMULATION_ALLOCATION_POLICY } from '@/config/exam';
import type { ExamLevel, Question, QuestionGroup, Subject } from '@/types';

const profSubjects: Subject[] = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'General Information',
];
const allSubjects: Subject[] = [...profSubjects, 'Clerical Ability'];

function question(id: string, subject: Subject, index: number): Question {
  return {
    id,
    examLevel: 'Both',
    subject,
    topic: 'Verification',
    difficulty: 'Easy',
    question: `Question ${id}`,
    choices: [
      { id: 'A', text: 'A' },
      { id: 'B', text: 'B' },
      { id: 'C', text: 'C' },
      { id: 'D', text: 'D' },
    ],
    correctOptionId: 'A',
    explanation: 'Verification explanation.',
    tags: [`index-${index}`],
  };
}

function group(
  id: string,
  subject: Subject,
  ids: string[],
  selectionPolicy: QuestionGroup['selectionPolicy'] = 'atomic',
  orderPolicy: QuestionGroup['orderPolicy'] = 'fixed'
): QuestionGroup {
  return { id, examLevel: 'Both', subject, topic: 'Verification', questionIds: ids, selectionPolicy, orderPolicy, tags: ['test'] };
}

/** Synthetic catalog with generous singleton supply for every Professional subject. */
function syntheticCatalog(extraGroups: QuestionGroup[] = [], extraQuestions: Question[] = [], perSubject = 60) {
  const fillerQuestions = profSubjects.flatMap((subject) =>
    Array.from({ length: perSubject }, (_, index) => question(`${subject}-filler-${index}`, subject, index))
  );
  const fillerGroups = fillerQuestions.map((item) => group(`singleton-${item.id}`, item.subject, [item.id]));
  return createNormalizedCatalog([...fillerQuestions, ...extraQuestions], [...fillerGroups, ...extraGroups]);
}

const seededRun = (level: ExamLevel, scored: number, seed: string, catalog = syntheticCatalog()) =>
  buildSimulationSession(level, scored, { seed, catalog });

// ---------------------------------------------------------------------------
// EDQ
// ---------------------------------------------------------------------------

describe('EDQ section', () => {
  it('presents exactly 20 EDQ items, first, numbered 1–20, with the first scored item at 21', async () => {
    const session = await seededRun('Professional', 20, 'edq-basic');
    const admin = (session.items ?? []).filter((item) => item.kind === 'administrative');
    expect(admin).toHaveLength(20);
    // EDQ is the leading block
    expect((session.items ?? []).slice(0, 20).every((item) => item.kind === 'administrative')).toBe(true);
    expect(admin.every((item) => item.sectionId === 'EDQ')).toBe(true);

    const numbers = sessionNumberMap(buildBooklet(session));
    EDQ_ITEMS.forEach((item, index) => expect(numbers.get(item.id)).toBe(index + 1));
    expect(numbers.get(session.questionIds[0])).toBe(21);
  });

  it('keeps EDQ ids out of questionIds and out of grading entirely', async () => {
    const session = await seededRun('Professional', 20, 'edq-grading');
    const edqIds = new Set(EDQ_ITEMS.map((item) => item.id));
    expect(session.questionIds.some((id) => edqIds.has(id))).toBe(false);

    // Answer every scored question correctly AND scribble EDQ responses.
    const index = new Map(
      session.questionIds.map((id) => [id, question(id, 'Verbal Ability', 0)])
    );
    const answers = Object.fromEntries(session.questionIds.map((id) => [id, 'A' as const]));
    const graded = gradeSession(
      { ...session, answers, edqAnswers: { 'edq-01': 'Male' }, edqResponseMode: true },
      index
    );

    // EDQ affects nothing: not the count, not the percentage, not pass/fail.
    expect(graded.questionCount).toBe(session.questionIds.length);
    expect(graded.percentage).toBe(100);
    expect(graded.passed).toBe(true);
    expect(graded.items.some((item) => edqIds.has(item.questionId))).toBe(false);
    // PRIVACY: the Attempt object (the ONLY thing sent to Firestore) carries
    // no EDQ fields, so EDQ responses can never reach Firestore.
    expect(JSON.stringify(graded)).not.toContain('edq');
  });

  it('EDQ responses are optional — grading is identical with none, some, or all filled in', async () => {
    const session = await seededRun('Professional', 20, 'edq-optional');
    const index = new Map(session.questionIds.map((id) => [id, question(id, 'Verbal Ability', 0)]));
    const none = gradeSession(session, index, session.startedAt + 1000);
    const some = gradeSession(
      { ...session, edqAnswers: { 'edq-03': '25–31 years old' } },
      index,
      session.startedAt + 1000
    );
    expect(some.percentage).toBe(none.percentage);
    expect(some.correctCount).toBe(none.correctCount);
    expect(some.passed).toBe(none.passed);
  });
});

// ---------------------------------------------------------------------------
// Unified Practice booklet structure
// ---------------------------------------------------------------------------

describe('generic Practice booklet structure', () => {
  it('builds structured items instead of the legacy flat fallback', async () => {
    const session = await buildPracticeSession(
      'Professional',
      ['Verbal Ability', 'Numerical Reasoning'],
      12
    );
    expect(session.items?.length).toBeGreaterThan(0);
    expect(session.questionIds).toHaveLength(12);
    expect(new Set(session.questionIds).size).toBe(12);
    expect(buildBooklet(session)).toHaveLength(2);
    expect(session.items?.flatMap((item) => item.kind === 'question' ? [item.questionId] : item.kind === 'group' || item.kind === 'pool' ? item.questionIds : [])).toEqual(session.questionIds);
    expect(session.items?.every((item) => item.kind !== 'administrative')).toBe(true);
  });
});

describe('progressive Practice batches', () => {
  it('starts with an internal batch and appends unique questions without resetting numbering or answers', async () => {
    const catalog = syntheticCatalog([], [], 30);
    const initial = await buildProgressivePracticeSession(
      'Professional',
      ['Verbal Ability'],
      undefined,
      { catalog }
    );

    expect(initial.questionIds).toHaveLength(10);
    expect(initial.practiceProgress?.batchSize).toBe(10);
    expect(initial.practiceProgress?.nextIndex).toBe(10);
    expect(hasMoreProgressivePractice(initial)).toBe(true);
    const initialNumbers = sessionNumberMap(buildBooklet(initial));
    expect([...initialNumbers.values()]).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));

    const firstAnswer = { [initial.questionIds[0]]: 'A' as const };
    const answered = { ...initial, answers: firstAnswer };
    const extended = appendProgressivePracticeBatch(answered, catalog);

    expect(extended.questionIds).toHaveLength(20);
    expect(new Set(extended.questionIds).size).toBe(20);
    expect(extended.answers).toEqual(firstAnswer);
    expect(extended.questionIds.slice(0, 10)).toEqual(initial.questionIds);
    expect(sessionNumberMap(buildBooklet(extended)).get(initial.questionIds[0])).toBe(1);
    expect(sessionNumberMap(buildBooklet(extended)).get(extended.questionIds[19])).toBe(20);
    expect(hasMoreProgressivePractice(extended)).toBe(true);
  });

  it('keeps Practice open-ended with no countdown deadline', async () => {
    const catalog = syntheticCatalog([], [], 30);
    const session = await buildProgressivePracticeSession(
      'Professional',
      ['Verbal Ability'],
      undefined,
      { catalog }
    );

    expect(session.config.timed).toBe(false);
    expect(session.config.durationSeconds).toBeNull();
    expect(session.deadlineAt).toBeNull();
  });

  it('supports All Subjects without exposing a fixed session total in the live Practice contract', async () => {
    const catalog = syntheticCatalog([], [], 8);
    const session = await buildProgressivePracticeSession(
      'Professional',
      profSubjects,
      10,
      { catalog }
    );

    expect(session.config.subjects).toEqual(profSubjects);
    expect(session.config.mode).toBe('practice');
    expect(session.questionIds).toHaveLength(10);
    expect(session.practiceProgress?.candidateQuestionIds.length).toBeGreaterThan(10);
    expect(session.items?.every((item) => item.kind !== 'administrative')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Variable subject order
// ---------------------------------------------------------------------------

describe('variable subject order', () => {
  it('same seed → same subject order; every subject appears exactly once as one contiguous block', async () => {
    const a = await seededRun('Professional', 50, 'order-seed');
    const b = await seededRun('Professional', 50, 'order-seed');

    const blockOrder = (s: typeof a) => {
      const seen: string[] = [];
      for (const item of s.items ?? []) {
        if (item.kind !== 'group' || !item.sectionId) continue;
        if (seen[seen.length - 1] !== item.sectionId) seen.push(item.sectionId);
      }
      return seen;
    };

    const orderA = blockOrder(a);
    expect(orderA).toEqual(blockOrder(b));
    // exactly once each, contiguous (no subject re-appears later)
    expect([...orderA].sort()).toEqual([...profSubjects].sort());
    expect(new Set(orderA).size).toBe(orderA.length);
  });

  it('different seeds can produce different valid orders (checked across a seed sweep)', async () => {
    const orders = new Set<string>();
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
      const s = await seededRun('Professional', 20, seed);
      const seen: string[] = [];
      for (const item of s.items ?? []) {
        if ((item.kind === 'group' || item.kind === 'pool') && item.sectionId && seen[seen.length - 1] !== item.sectionId) {
          seen.push(item.sectionId);
        }
      }
      orders.add(seen.join('>'));
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Variable allocation
// ---------------------------------------------------------------------------

describe('variable subject allocation', () => {
  it('full Professional simulation carries exactly 150 scored questions within policy bounds', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const session = await buildSimulationSession('Professional', 150, { seed: 'full-pro', catalog });
    expect(session.questionIds).toHaveLength(150);
    expect(new Set(session.questionIds).size).toBe(150);

    const bySubject = new Map<string, number>();
    for (const item of session.items ?? []) {
      if (item.kind !== 'group' && item.kind !== 'pool') continue;
      bySubject.set(item.sectionId ?? '', (bySubject.get(item.sectionId ?? '') ?? 0) + item.questionIds.length);
    }
    for (const rule of SIMULATION_ALLOCATION_POLICY.Professional.rules) {
      const count = bySubject.get(rule.subject) ?? 0;
      expect(count).toBeGreaterThanOrEqual(rule.minItems);
      expect(count).toBeLessThanOrEqual(rule.maxItems);
    }
    // presented = EDQ + scored = the fixed framework
    const admin = (session.items ?? []).filter((item) => item.kind === 'administrative').length;
    expect(admin + session.questionIds.length).toBe(EXAM_FRAMEWORK.Professional.presentedItems);
  });

  it('full Subprofessional simulation carries exactly 145 scored questions within policy bounds', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    const session = await buildSimulationSession('Subprofessional', 145, { seed: 'full-sub', catalog });
    expect(session.questionIds).toHaveLength(145);

    const bySubject = new Map<string, number>();
    for (const item of session.items ?? []) {
      if (item.kind !== 'group' && item.kind !== 'pool') continue;
      bySubject.set(item.sectionId ?? '', (bySubject.get(item.sectionId ?? '') ?? 0) + item.questionIds.length);
    }
    for (const rule of SIMULATION_ALLOCATION_POLICY.Subprofessional.rules) {
      const count = bySubject.get(rule.subject) ?? 0;
      expect(count).toBeGreaterThanOrEqual(rule.minItems);
      expect(count).toBeLessThanOrEqual(rule.maxItems);
    }
    const admin = (session.items ?? []).filter((item) => item.kind === 'administrative').length;
    expect(admin + session.questionIds.length).toBe(EXAM_FRAMEWORK.Subprofessional.presentedItems);
  });

  it('allocation sums exactly and respects bounds across a seed sweep', () => {
    const policy = SIMULATION_ALLOCATION_POLICY.Professional;
    const supply = { 'Numerical Reasoning': 200, 'Analytical Reasoning': 200, 'Verbal Ability': 200, 'General Information': 200, 'Clerical Ability': 0 } as Record<Subject, number>;
    for (let i = 0; i < 25; i++) {
      let state = i + 1;
      const random = () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
      };
      const counts = allocateScoredSubjects(policy, supply, random);
      expect(counts).not.toBeNull();
      const total = policy.rules.reduce((sum, r) => sum + (counts?.[r.subject] ?? 0), 0);
      expect(total).toBe(150);
      for (const rule of policy.rules) {
        expect(counts?.[rule.subject]).toBeGreaterThanOrEqual(rule.minItems);
        expect(counts?.[rule.subject]).toBeLessThanOrEqual(rule.maxItems);
      }
    }
  });

  it('scaled tiers respect proportionally scaled bounds and exact totals', async () => {
    const scaled = scalePolicy(SIMULATION_ALLOCATION_POLICY.Professional, 20);
    expect(scaled.totalScoredItems).toBe(20);
    const session = await seededRun('Professional', 20, 'tier-20');
    const bySubject = new Map<string, number>();
    for (const item of session.items ?? []) {
      if (item.kind !== 'group' && item.kind !== 'pool') continue;
      bySubject.set(item.sectionId ?? '', (bySubject.get(item.sectionId ?? '') ?? 0) + item.questionIds.length);
    }
    expect(session.questionIds).toHaveLength(20);
    for (const rule of scaled.rules) {
      const count = bySubject.get(rule.subject) ?? 0;
      expect(count).toBeGreaterThanOrEqual(rule.minItems);
      expect(count).toBeLessThanOrEqual(rule.maxItems);
    }
  });

  it('returns null (→ locked tier) when the supply cannot satisfy the policy', () => {
    const policy = SIMULATION_ALLOCATION_POLICY.Subprofessional;
    const supply = { 'Numerical Reasoning': 200, 'Clerical Ability': 5, 'Verbal Ability': 200, 'General Information': 200, 'Analytical Reasoning': 0 } as Record<Subject, number>;
    expect(allocateScoredSubjects(policy, supply, () => 0.5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Seed reproducibility (order + allocation + groups + question sequence)
// ---------------------------------------------------------------------------

describe('seeded reproducibility', () => {
  it('same level + policy + seed + content ⇒ identical items and question sequence', async () => {
    const catalog = syntheticCatalog();
    const a = await buildSimulationSession('Professional', 50, { seed: 'repro', catalog });
    const b = await buildSimulationSession('Professional', 50, { seed: 'repro', catalog });
    expect(a.items).toEqual(b.items);
    expect(a.questionIds).toEqual(b.questionIds);
    expect(a.seed).toBe('repro');
  });

  it('a session generated WITHOUT an explicit seed still stores one (reproducible after the fact)', async () => {
    const catalog = syntheticCatalog();
    const first = await buildSimulationSession('Professional', 20, { catalog });
    expect(first.seed).toBeTruthy();
    const replay = await buildSimulationSession('Professional', 20, { seed: first.seed, catalog });
    expect(replay.questionIds).toEqual(first.questionIds);
    expect(replay.items).toEqual(first.items);
  });
});

// ---------------------------------------------------------------------------
// Group integrity under variable allocation
// ---------------------------------------------------------------------------

describe('group integrity under variable allocation', () => {
  it('atomic groups are taken whole or not at all, and stay contiguous inside their subject', async () => {
    const packIds = (n: number, tag: string) => Array.from({ length: n }, (_, i) => `${tag}-${i}`);
    const g1 = packIds(4, 'VA-pack1');
    const g2 = packIds(3, 'VA-pack2');
    const questions = [...g1, ...g2].map((id, i) => question(id, 'Verbal Ability', i));
    const catalog = syntheticCatalog(
      [group('pack1', 'Verbal Ability', g1), group('pack2', 'Verbal Ability', g2)],
      questions
    );
    const session = await buildSimulationSession('Professional', 50, { seed: 'atomic-var', catalog });
    for (const item of session.items ?? []) {
      if (item.kind !== 'group') continue;
      if (item.groupId === 'pack1') expect(item.questionIds).toEqual(g1);
      if (item.groupId === 'pack2') expect(item.questionIds).toEqual(g2);
      // contiguity: the group's ids appear as one consecutive run in questionIds
      const start = session.questionIds.indexOf(item.questionIds[0]);
      expect(session.questionIds.slice(start, start + item.questionIds.length)).toEqual(item.questionIds);
    }
  });

  it('splittable groups may contribute a fixed-order subset', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `SPLIT-${i}`);
    const questions = ids.map((id, i) => question(id, 'Verbal Ability', i));
    const catalog = createNormalizedCatalog(
      [
        ...questions,
        ...profSubjects
          .filter((s) => s !== 'Verbal Ability')
          .flatMap((s) => Array.from({ length: 60 }, (_, i) => question(`${s}-f-${i}`, s, i))),
      ],
      [group('split', 'Verbal Ability', ids, 'splittable')]
    );
    const session = await buildSimulationSession('Professional', 20, { seed: 'split-var', catalog });
    const item = (session.items ?? []).find((i) => i.kind === 'group' && i.groupId === 'split');
    expect(item).toBeTruthy();
    if (item?.kind === 'group') {
      // subset preserves authored order
      expect(item.questionIds).toEqual(ids.slice(0, item.questionIds.length));
    }
  });

  it('throws the documented InsufficientBankError when atomic sizes make the allocation impossible', async () => {
    // Verbal supply exists ONLY as 8-question atomic packs; the scaled-20
    // verbal max (8) can be hit, so make packs of 9 — no combination fits.
    const packs = [9, 9, 9].map((n, gi) => Array.from({ length: n }, (_, i) => `P${gi}-${i}`));
    const questions = packs.flat().map((id, i) => question(id, 'Verbal Ability', i));
    const catalog = createNormalizedCatalog(
      [
        ...questions,
        ...profSubjects
          .filter((s) => s !== 'Verbal Ability')
          .flatMap((s) => Array.from({ length: 60 }, (_, i) => question(`${s}-f-${i}`, s, i))),
      ],
      packs.map((ids, gi) => group(`pack-${gi}`, 'Verbal Ability', ids))
    );
    await expect(
      buildSimulationSession('Professional', 20, { seed: 'impossible', catalog })
    ).rejects.toThrow('Not enough unique questions');
  });
});

// ---------------------------------------------------------------------------
// Production + fixture regression (from the previous phase, adapted)
// ---------------------------------------------------------------------------

describe('production and fixture verification', () => {
  it('loads the production bank and generates a valid simulation from it', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    expect(catalog.questions.size).toBeGreaterThanOrEqual(688);
    const session = await buildSimulationSession('Professional', 20, { seed: 'production', catalog });
    expect(session.questionIds).toHaveLength(20);
    expect(new Set(session.questionIds).size).toBe(20);
    const scored = (session.items ?? []).filter((item) => item.kind === 'group');
    const admin = (session.items ?? []).filter((item) => item.kind === 'administrative');
    expect(scored.length).toBeGreaterThan(0);
    expect(admin).toHaveLength(20);
  });

  it('routes the explicit grouped fixture through session generation', async () => {
    const fixture = await loadGroupedFixtureCatalog();
    expect(fixture.groups.has('fixture-reading-set-001')).toBe(true);
    const filler = profSubjects.flatMap((s) =>
      Array.from({ length: s === 'Verbal Ability' ? 10 : 60 }, (_, i) => question(`${s}-fixture-filler-${i}`, s, i))
    );
    const fillerGroups = filler.map((q) => group(`sf-${q.id}`, q.subject, [q.id]));
    const production = createNormalizedCatalog(filler, fillerGroups);
    const catalog = mergeNormalizedCatalogs(production, fixture);
    // sweep seeds until the fixture group is selected (selection is seeded-random)
    let found = false;
    for (const seed of Array.from({ length: 40 }, (_, i) => `f${i}`)) {
      const session = await buildSimulationSession('Professional', 20, { seed, catalog });
      const item = (session.items ?? []).find((i) => i.kind === 'group' && i.groupId === 'fixture-reading-set-001');
      if (item && item.kind === 'group') {
        expect(session.questionIds).toEqual(expect.arrayContaining(item.questionIds));
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Five-choice questions in the engine and grading
// ---------------------------------------------------------------------------

describe('five-choice questions', () => {
  function fiveChoice(id: string, subject: Subject): Question {
    return {
      ...question(id, subject, 0),
      choices: [
        { id: 'A', text: 'a' },
        { id: 'B', text: 'b' },
        { id: 'C', text: 'c' },
        { id: 'D', text: 'd' },
        { id: 'E', text: 'e' },
      ],
      correctOptionId: 'E',
    };
  }

  it('mixes 4- and 5-choice questions in one simulation and grades E correctly', async () => {
    const five = Array.from({ length: 5 }, (_, i) => fiveChoice(`FIVE-${i}`, 'Verbal Ability'));
    const catalog = syntheticCatalog(
      five.map((q) => group(`g-${q.id}`, 'Verbal Ability', [q.id])),
      five
    );
    // sweep seeds until at least one 5-choice question is selected
    let session = await buildSimulationSession('Professional', 20, { seed: 'five-0', catalog });
    for (let i = 1; i < 30 && !session.questionIds.some((id) => id.startsWith('FIVE-')); i++) {
      session = await buildSimulationSession('Professional', 20, { seed: `five-${i}`, catalog });
    }
    const picked = session.questionIds.filter((id) => id.startsWith('FIVE-'));
    expect(picked.length).toBeGreaterThan(0);

    const index = new Map(
      session.questionIds.map((id) => [
        id,
        id.startsWith('FIVE-') ? fiveChoice(id, 'Verbal Ability') : question(id, 'Verbal Ability', 0),
      ])
    );
    const answers = Object.fromEntries(
      session.questionIds.map((id) => [id, id.startsWith('FIVE-') ? ('E' as const) : ('A' as const)])
    );
    const graded = gradeSession({ ...session, answers }, index);
    expect(graded.percentage).toBe(100);

    // A wrong E-answer on a 4-choice question is simply incorrect, never a crash.
    const wrongAnswers = { ...answers, [session.questionIds[0]]: 'E' as const };
    const idx0 = index.get(session.questionIds[0])!;
    const gradedWrong = gradeSession({ ...session, answers: wrongAnswers }, index);
    if (idx0.correctOptionId !== 'E') {
      expect(gradedWrong.correctCount).toBe(graded.correctCount - 1);
    }
  });
});
