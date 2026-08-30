/**
 * Development-only QA fixtures.
 *
 * A QA fixture is a small, self-contained set of authored questions whose only
 * job is to prove how a learner-facing rendering path behaves. It is NOT
 * examinable content: fixtures live in `content/qa/`, which is outside every
 * content root the app and its tooling walk —
 *
 *   - `scripts/vite-plugin-question-manifest.ts` roots at `content/questions`
 *     (subject subdirectory required) and `content/groups`,
 *   - `src/data/questionBank.ts` globs `content/questions/**`,
 *     `content/fixtures/**`, and `content/groups/**`,
 *   - `scripts/validate-questions.mjs` roots at `content/questions` and
 *     `content/groups`.
 *
 * So the only way to reach a fixture is the explicit relative import below —
 * the same convention `src/data/refinementBatches.ts` already uses. A fixture
 * cannot change a production question count, a pool, the taxonomy, a
 * refinement batch, or family progress, because nothing that computes those
 * ever sees it.
 *
 * The registry is deliberately generic. `math` is only the first category;
 * tables, images, charts, graphs, geometry, and unusual layouts are the same
 * shape of problem — author a fixture, open it in the real learner UI, look at
 * it. Nothing here is a fixture-management CMS: a fixture is a JSON file plus
 * one line in `QA_FIXTURES`.
 */

import mathRenderingJson from '../../content/qa/math-rendering-test.json';
import { isValidQuestion } from '@/data/questionShape';
import { createNormalizedCatalog, type NormalizedContentCatalog } from '@/data/contentCatalog';
import type { ExamSession, Question, SessionItem, Subject } from '@/types';

/** What a fixture is testing. Metadata only — it selects no code path. */
export const QA_FIXTURE_CATEGORIES = [
  'math',
  'tables',
  'images',
  'charts',
  'graphs',
  'geometry',
  'other',
] as const;

export type QaFixtureCategory = (typeof QA_FIXTURE_CATEGORIES)[number];

export interface QaFixture {
  /** Stable authored id, shown on the QA page so a report is unambiguous. */
  id: string;
  title: string;
  category: QaFixtureCategory;
  description: string;
  /** Repo-relative source of truth, shown on the page so it is findable. */
  sourcePath: string;
  questions: Question[];
}

/** The math-notation fixture's authored id. Tests pin this so it cannot drift. */
export const MATH_RENDERING_FIXTURE_ID =
  'math-rendering-test-20260830-all-notation-combinations-v1';

export const MATH_RENDERING_FIXTURE_PATH = 'content/qa/math-rendering-test.json';

function isCategory(value: unknown): value is QaFixtureCategory {
  return typeof value === 'string'
    && (QA_FIXTURE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Fixture questions are validated by the same guard the production loader
 * applies. A fixture that could not survive the bank's own shape check would
 * not be exercising the learner components honestly.
 */
function loadFixture(raw: unknown, sourcePath: string): QaFixture {
  const envelope = raw as Record<string, unknown>;
  const { id, title, category, description } = envelope;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`${sourcePath}: fixture is missing an id`);
  }
  if (typeof title !== 'string' || typeof description !== 'string' || !isCategory(category)) {
    throw new Error(`${sourcePath}: fixture ${id} is missing title, category, or description`);
  }
  if (!Array.isArray(envelope.questions) || envelope.questions.length === 0) {
    throw new Error(`${sourcePath}: fixture ${id} has no questions`);
  }
  const questions = envelope.questions.map((candidate: unknown, index: number) => {
    if (!isValidQuestion(candidate)) {
      throw new Error(`${sourcePath}: question ${index} failed isValidQuestion`);
    }
    if (!candidate.id.startsWith(id)) {
      throw new Error(
        `${sourcePath}: question id ${candidate.id} is not derived from fixture id ${id}`,
      );
    }
    return candidate;
  });
  return { id, title, category, description, sourcePath, questions };
}

/** Every registered fixture. Add a file, add a line — no other wiring. */
export const QA_FIXTURES: readonly QaFixture[] = [
  loadFixture(mathRenderingJson, MATH_RENDERING_FIXTURE_PATH),
];

export function getQaFixture(fixtureId: string): QaFixture | undefined {
  return QA_FIXTURES.find((fixture) => fixture.id === fixtureId);
}

/**
 * The fixture as a normalized catalog, built by the SAME normalizer the
 * production loader uses (`createNormalizedCatalog`). The QA page needs a
 * `questionIndex` and a `getGroup` exactly like `ExamPage` does, and this is
 * where both come from — not a hand-rolled Map that could diverge.
 */
export function buildQaFixtureCatalog(fixture: QaFixture): NormalizedContentCatalog {
  return createNormalizedCatalog(fixture.questions);
}

/**
 * An in-memory Practice session over the fixture's questions.
 *
 * The item shape mirrors what `buildPracticeItems` emits for standalone
 * questions in `src/lib/examEngine.ts` — one `question` item per question,
 * sectioned by subject — so the real booklet renders a real section rather
 * than the legacy unsectioned fallback.
 *
 * `internalReview` is set for the same reason the Content Bank review run sets
 * it: this run is graded and reviewable but is not learner data. The QA page
 * additionally never calls a persistence function at all, so the session
 * exists only for as long as the component is mounted.
 */
export function buildQaFixtureSession(fixture: QaFixture, startedAt: number): ExamSession {
  const questionIds = fixture.questions.map((question) => question.id);
  const items: SessionItem[] = fixture.questions.map((question) => ({
    kind: 'question',
    questionId: question.id,
    sectionId: question.subject,
  }));
  const subjects = [...new Set(fixture.questions.map((question) => question.subject))] as Subject[];
  return {
    id: `qa-fixture:${fixture.id}`,
    config: {
      mode: 'practice',
      // A session must name one level; the fixture's questions are authored
      // 'Both', so either is honest. This is not an app-wide level.
      examLevel: 'Professional',
      questionCount: questionIds.length,
      subjects,
      exactQuestionIds: [...questionIds],
      timed: false,
      durationSeconds: null,
    },
    internalReview: true,
    questionIds,
    items,
    startedAt,
    deadlineAt: null,
    answers: {},
  };
}
