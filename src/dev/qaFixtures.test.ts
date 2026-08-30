import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';
import { REFINEMENT_BATCHES } from '@/data/refinementBatches';
import { isValidQuestion } from '@/data/questionShape';
import type { Subject } from '@/types';
import {
  MATH_RENDERING_FIXTURE_ID,
  MATH_RENDERING_FIXTURE_PATH,
  QA_FIXTURES,
  QA_FIXTURE_CATEGORIES,
  buildQaFixtureCatalog,
  buildQaFixtureSession,
  getQaFixture,
} from './qaFixtures';

/**
 * The QA fixture registry, checked from two directions.
 *
 * The first is that the fixture really is the authored file — the page prints
 * `sourcePath` so a bug report is actionable, and a `sourcePath` pointing at the
 * wrong file would make every report wrong. So the assertions below read that
 * path off disk and compare it with what the module actually imported.
 *
 * The second, and the reason this file exists at all, is that a fixture is NOT
 * examinable content. `content/qa/` sits outside every content root the app and
 * its tooling walk, and the test that matters is the one that loads the real
 * production catalog and finds no fixture in it.
 */

const ALL_SUBJECTS: Subject[] = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
];

/** Every fixture question id, across every registered fixture. */
const FIXTURE_QUESTION_IDS = QA_FIXTURES.flatMap((fixture) =>
  fixture.questions.map((question) => question.id),
);

describe('QA fixture registry — loads from the authored file', () => {
  it('registers the math fixture from content/qa/math-rendering-test.json', () => {
    const fixture = getQaFixture(MATH_RENDERING_FIXTURE_ID);
    expect(fixture).toBeDefined();
    expect(fixture?.sourcePath).toBe('content/qa/math-rendering-test.json');
    expect(MATH_RENDERING_FIXTURE_PATH).toBe('content/qa/math-rendering-test.json');
  });

  it('pins the authored fixture id so it cannot drift', () => {
    expect(MATH_RENDERING_FIXTURE_ID).toBe(
      'math-rendering-test-20260830-all-notation-combinations-v1',
    );
  });

  /**
   * Reading the file off disk is the only way to prove the import and the
   * printed `sourcePath` describe the same bytes. A stale relative import that
   * still type-checked would otherwise pass every other test in this file.
   */
  it('matches the file on disk at the path it reports', () => {
    const fixture = getQaFixture(MATH_RENDERING_FIXTURE_ID)!;
    const onDisk = JSON.parse(readFileSync(fixture.sourcePath, 'utf8'));
    expect(onDisk.id).toBe(MATH_RENDERING_FIXTURE_ID);
    expect(onDisk.category).toBe('math');
    expect(onDisk.questions).toHaveLength(fixture.questions.length);
    expect(onDisk.questions.map((question: { id: string }) => question.id)).toEqual(
      fixture.questions.map((question) => question.id),
    );
  });

  it('validates every fixture question with the production shape guard', () => {
    for (const fixture of QA_FIXTURES) {
      expect(fixture.questions.length).toBeGreaterThan(0);
      for (const question of fixture.questions) {
        expect(isValidQuestion(question), question.id).toBe(true);
        // Fixture ids are derived from the fixture id, which is what keeps them
        // recognisable on sight and impossible to confuse with a bank id.
        expect(question.id.startsWith(fixture.id), question.id).toBe(true);
      }
    }
  });

  it('describes itself with a category from the generic category model', () => {
    expect(QA_FIXTURE_CATEGORIES).toEqual([
      'math',
      'tables',
      'images',
      'charts',
      'graphs',
      'geometry',
      'other',
    ]);
    for (const fixture of QA_FIXTURES) {
      expect(QA_FIXTURE_CATEGORIES).toContain(fixture.category);
      expect(fixture.title.length).toBeGreaterThan(0);
      expect(fixture.description.length).toBeGreaterThan(0);
    }
  });

  it('returns undefined for an unregistered fixture id', () => {
    expect(getQaFixture('no-such-fixture')).toBeUndefined();
  });
});

describe('QA fixture registry — excluded from production content', () => {
  /**
   * The load-bearing isolation test. `loadContentCatalog` is the same loader the
   * learner app uses, over every subject; if a fixture were reachable from any
   * production glob it would appear here.
   */
  it('is absent from the production catalog for every subject', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    expect(FIXTURE_QUESTION_IDS.length).toBeGreaterThan(0);
    for (const id of FIXTURE_QUESTION_IDS) {
      expect(catalog.questions.has(id), `${id} leaked into the production catalog`).toBe(false);
    }
    for (const fixture of QA_FIXTURES) {
      expect(catalog.questions.has(fixture.id)).toBe(false);
    }
  });

  it('does not appear in the production pool of any subject', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const pooled = new Set([...catalog.questions.values()].map((question) => question.id));
    for (const id of FIXTURE_QUESTION_IDS) {
      expect(pooled.has(id), `${id} is in a production pool`).toBe(false);
    }
  });

  it('is not referenced by any refinement batch', () => {
    const batched = new Set(REFINEMENT_BATCHES.flatMap((batch) => batch.questionIds));
    for (const id of FIXTURE_QUESTION_IDS) {
      expect(batched.has(id), `${id} is in a refinement batch`).toBe(false);
    }
    for (const fixture of QA_FIXTURES) {
      expect(REFINEMENT_BATCHES.some((batch) => batch.id === fixture.id)).toBe(false);
    }
  });

  /**
   * The directory convention is the isolation mechanism, so it is asserted
   * directly: a fixture that moved under `content/questions/` would be swept up
   * by the manifest plugin, the bank glob, and the validator all at once.
   */
  it('lives outside every production content root', () => {
    for (const fixture of QA_FIXTURES) {
      expect(fixture.sourcePath.startsWith('content/qa/')).toBe(true);
      expect(fixture.sourcePath).not.toContain('content/questions');
      expect(fixture.sourcePath).not.toContain('content/groups');
      expect(fixture.sourcePath).not.toContain('content/fixtures');
      expect(fixture.sourcePath).not.toContain('content/taxonomy');
    }
  });
});

describe('QA fixture session — in-memory, never learner data', () => {
  it('builds a practice session over exactly the fixture questions', () => {
    const fixture = getQaFixture(MATH_RENDERING_FIXTURE_ID)!;
    const session = buildQaFixtureSession(fixture, 1_756_000_000_000);
    expect(session.config.mode).toBe('practice');
    expect(session.questionIds).toEqual(fixture.questions.map((question) => question.id));
    expect(session.config.exactQuestionIds).toEqual(session.questionIds);
    expect(session.config.questionCount).toBe(fixture.questions.length);
    expect(session.answers).toEqual({});
  });

  /**
   * `internalReview` is the one flag that suppresses the attempt write in
   * `ExamPage`'s `finishWith`. The QA page never calls a persistence function at
   * all, but the session still carries the flag so the run stays honest about
   * what it is wherever it is read.
   */
  it('marks the session internalReview so it can never be recorded', () => {
    const session = buildQaFixtureSession(getQaFixture(MATH_RENDERING_FIXTURE_ID)!, 0);
    expect(session.internalReview).toBe(true);
  });

  it('is untimed, so nothing can grade it at a deadline', () => {
    const session = buildQaFixtureSession(getQaFixture(MATH_RENDERING_FIXTURE_ID)!, 0);
    expect(session.config.timed).toBe(false);
    expect(session.config.durationSeconds).toBeNull();
    expect(session.deadlineAt).toBeNull();
  });

  /**
   * Sectioned items are what make the real booklet render a real section rather
   * than its legacy unsectioned fallback — the fallback is a different layout,
   * and a fixture rendered through it would not be testing the learner UI.
   */
  it('emits one sectioned question item per fixture question', () => {
    const fixture = getQaFixture(MATH_RENDERING_FIXTURE_ID)!;
    const session = buildQaFixtureSession(fixture, 0);
    expect(session.items).toHaveLength(fixture.questions.length);
    for (const [index, item] of (session.items ?? []).entries()) {
      expect(item.kind).toBe('question');
      if (item.kind !== 'question') continue;
      expect(item.questionId).toBe(fixture.questions[index].id);
      expect(item.sectionId).toBe(fixture.questions[index].subject);
    }
  });

  it('builds its question index with the production normalizer', () => {
    const fixture = getQaFixture(MATH_RENDERING_FIXTURE_ID)!;
    const catalog = buildQaFixtureCatalog(fixture);
    for (const question of fixture.questions) {
      expect(catalog.questions.get(question.id)?.question).toBe(question.question);
    }
  });
});
