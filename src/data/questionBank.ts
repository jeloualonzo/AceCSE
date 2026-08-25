import type { ExamLevel, Question, QuestionGroup, Subject } from '@/types';
import {
  createNormalizedCatalog,
  mergeNormalizedCatalogs,
  type NormalizedContentCatalog,
} from '@/data/contentCatalog';
import manifest from 'virtual:question-manifest';
import {
  DIR_BY_SUBJECT,
  isValidQuestion,
  supplyForLevel,
  type QuestionManifest,
} from '@/data/questionShape';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { allClassifications, getCanonicalPoolsForSubject } from '@/data/taxonomy';

/**
 * The question bank, lazily loaded.
 *
 * Content lives in modular datasets under /content/questions/<subject>/*.json
 * (one file per authored batch — see docs/content/JSON_SPEC.md). GitHub stays
 * the source of truth; nothing lives in Firestore.
 *
 * How it scales to tens of thousands of questions:
 *
 *  - `import.meta.glob` WITHOUT `eager` makes Vite emit every dataset file as
 *    its own content-hashed chunk. Nothing is downloaded until a session
 *    actually needs that subject, and adding a batch file requires no code
 *    change — the glob and the build-time manifest both discover it.
 *  - Supply counts come from `virtual:question-manifest` (a few hundred
 *    bytes, computed at build time), so Dashboard/Simulation/Practice render
 *    availability instantly with zero question payload.
 *  - Loaded subjects are cached in memory for the tab's lifetime, and the
 *    hashed chunk files are cached by the browser HTTP cache and the CDN
 *    edge (immutable URLs). A hand-rolled IndexedDB/Cache-API layer would
 *    only duplicate that with added staleness risk, so we deliberately
 *    don't have one.
 *
 * Everything is validated at build time (`npm run validate:questions`) and
 * defensively here at load time; invalid items are dropped (never silently
 * mangled) with a console warning in dev.
 */

const modules = import.meta.glob<Question[]>('../../content/questions/**/*.json', {
  import: 'default',
});

interface ExplicitGroupDataset {
  group: QuestionGroup;
  questions: Question[];
}

const groupModules = import.meta.glob<ExplicitGroupDataset>('../../content/fixtures/**/*.json', {
  import: 'default',
});

/** Production question groups (item sets), organized like the question tree. */
const productionGroupModules = import.meta.glob<QuestionGroup[]>('../../content/groups/**/*.json', {
  import: 'default',
});

const groupPathsByDir = new Map<string, string[]>();
for (const path of Object.keys(productionGroupModules)) {
  const match = path.match(/content\/groups\/([^/]+)\//);
  if (!match) continue;
  const list = groupPathsByDir.get(match[1]) ?? [];
  list.push(path);
  groupPathsByDir.set(match[1], list);
}

async function loadGroups(subjects: readonly Subject[]): Promise<QuestionGroup[]> {
  const dirs = [...new Set(subjects.map((subject) => DIR_BY_SUBJECT[subject]))];
  const datasets = await Promise.all(
    dirs.flatMap((dir) => (groupPathsByDir.get(dir) ?? []).map((path) => productionGroupModules[path]()))
  );
  return datasets.flat().filter((group) => Array.isArray(group?.questionIds));
}

/**
 * The repository files a subject's authored groups come from, as repo-relative
 * POSIX paths — `[]` for a subject with no groups directory at all.
 *
 * Read by the admin structures workspace so it can name its own source instead
 * of hard-coding a path convention that only this module actually enforces.
 */
export function groupSourceFilesForSubject(subject: Subject): string[] {
  return (groupPathsByDir.get(DIR_BY_SUBJECT[subject]) ?? []).map((path) =>
    path.replace(/^(\.\.\/)+/, '')
  );
}

export const QUESTION_MANIFEST: QuestionManifest = manifest;

/** Unique-question supply per subject for a level — synchronous, no fetch. */
export function subjectAvailability(level: ExamLevel): Record<Subject, number> {
  return Object.fromEntries(
    SUBJECTS_BY_LEVEL[level].map((subject) => [
      subject,
      supplyForLevel(QUESTION_MANIFEST.subjects[subject], level),
    ])
  ) as Record<Subject, number>;
}

// ---------------------------------------------------------------------------
// Lazy loading, one subject directory at a time
// ---------------------------------------------------------------------------

/** Module paths grouped by their `content/questions/<dir>/` directory. */
const pathsByDir = new Map<string, string[]>();
for (const path of Object.keys(modules)) {
  const match = path.match(/content\/questions\/([^/]+)\//);
  if (!match) continue;
  const list = pathsByDir.get(match[1]) ?? [];
  list.push(path);
  pathsByDir.set(match[1], list);
}

/** In-memory cache: subject directory → validated questions. */
const loadedByDir = new Map<string, Promise<Question[]>>();

function loadDir(dir: string): Promise<Question[]> {
  const cached = loadedByDir.get(dir);
  if (cached) return cached;

  const paths = (pathsByDir.get(dir) ?? []).sort();
  const promise = Promise.all(paths.map((path) => modules[path]())).then((datasets) => {
    const seen = new Set<string>();
    const questions: Question[] = [];
    for (const dataset of datasets) {
      if (!Array.isArray(dataset)) continue;
      for (const raw of dataset) {
        if (!isValidQuestion(raw)) {
          if (import.meta.env.DEV) console.warn('[questionBank] Dropped invalid question:', raw);
          continue;
        }
        if (seen.has(raw.id)) {
          if (import.meta.env.DEV) console.warn(`[questionBank] Dropped duplicate id: ${raw.id}`);
          continue;
        }
        seen.add(raw.id);
        questions.push(raw);
      }
    }
    return questions;
  });

  loadedByDir.set(dir, promise);
  promise.catch(() => loadedByDir.delete(dir)); // allow retry after a network failure
  return promise;
}

/**
 * Load (and cache) all questions for the given subjects. Chunks are fetched
 * in parallel; repeat calls are free.
 */
export async function loadQuestions(subjects: readonly Subject[]): Promise<Question[]> {
  const dirs = [...new Set(subjects.map((subject) => DIR_BY_SUBJECT[subject]))];
  const bySubject = await Promise.all(dirs.map(loadDir));
  return bySubject.flat();
}

/** Load the given subjects and index them by question id. */
export async function loadQuestionIndex(
  subjects: readonly Subject[]
): Promise<Map<string, Question>> {
  const questions = await loadQuestions(subjects);
  return new Map(questions.map((q) => [q.id, q]));
}

/** Every subject a session of this level might reference. */
export function loadQuestionsForLevel(level: ExamLevel): Promise<Question[]> {
  return loadQuestions(SUBJECTS_BY_LEVEL[level]);
}

/**
 * Load and normalize only the requested production subjects. Legacy questions
 * become singleton groups; explicit fixture content is opt-in and separate.
 */
export async function loadContentCatalog(
  subjects: readonly Subject[]
): Promise<NormalizedContentCatalog> {
  const [questions, groups] = await Promise.all([loadQuestions(subjects), loadGroups(subjects)]);
  const subjectSet = new Set(subjects);
  const classifications = allClassifications().filter((record) => subjectSet.has(record.subject));
  const pools = subjects.flatMap((subject) => getCanonicalPoolsForSubject(subject));
  return createNormalizedCatalog(questions, groups, classifications, pools);
}

/** Load the opt-in grouped fixture without touching the production bank. */
export async function loadGroupedFixtureCatalog(): Promise<NormalizedContentCatalog> {
  const datasets = await Promise.all(Object.values(groupModules).map((load) => load()));
  const questions = datasets.flatMap((dataset) => dataset.questions);
  const groups = datasets.map((dataset) => dataset.group);
  return createNormalizedCatalog(questions, groups, [], []);
}

/** Compose production content with explicitly loaded fixture/test content. */
export async function loadContentCatalogWithFixtures(
  subjects: readonly Subject[]
): Promise<NormalizedContentCatalog> {
  const [production, fixture] = await Promise.all([
    loadContentCatalog(subjects),
    loadGroupedFixtureCatalog(),
  ]);
  return mergeNormalizedCatalogs(production, fixture);
}
