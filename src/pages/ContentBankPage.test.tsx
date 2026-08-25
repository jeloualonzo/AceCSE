// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { QUESTION_MANIFEST, loadContentCatalog } from '@/data/questionBank';
import { allClassifications } from '@/data/taxonomy';
import {
  DEFAULT_REFINEMENT_STATUS,
  generateRefinementBatchName,
  getRefinementBatches,
} from '@/data/refinementBatches';
import {
  buildFilingPracticeSession,
  buildGrammarPilotPracticeSession,
  buildNumberSeriesPracticeSession,
  buildSpellingPracticeSession,
} from '@/lib/examEngine';
import { EXPORT_CHUNK_CHARACTER_LIMIT } from '@/lib/exportText';
import { NAV_ITEMS } from '@/navigation/navConfig';
import { EXAM_ROUTE } from '@/navigation/appRoutes';
import {
  CONTENT_BANK_BASE,
  CONTENT_BANK_BATCH_SEGMENT,
  contentBankBatchPath,
  contentBankBatchReviewPath,
  contentBankFamilyPath,
  contentBankSubjectPath,
} from '@/navigation/contentBankRoutes';
import { CONTENT_BANK_ROUTE } from '@/App';
import type { Subject } from '@/types';
import {
  buildSubjectDashboardSummaries,
  buildSubjectWorkspaceData,
  slugForFamily,
  WORKSPACE_BATCHES_STORAGE_KEY,
} from '@/data/contentBankWorkspace';
import { ContentBankPage, getQAFocusGroups, QA_FOCUS_GROUPS } from './ContentBankPage';
import ContentBankBatchPage from './ContentBankBatchPage';
import ContentBankFamilyPage from './ContentBankFamilyPage';
import ContentBankReviewPage from './ContentBankReviewPage';
import ContentBankSubjectPage from './ContentBankSubjectPage';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  // Every Content Bank page reaches useAuth through useRefinementBatches, which
  // only wants a uid to stamp writes with.
  useAuth: () => ({ user: null }),
}));

/**
 * Firestore is refused for the whole file, on purpose.
 *
 * Mocking the service facade — not the Firestore SDK — is the seam that keeps
 * jsdom from initializing Firebase at all, and it pins `writeTarget: 'local'`
 * deterministically so a create or a transition lands in localStorage where the
 * test can read exactly what was written. The Firestore-answering path and the
 * store precedence that goes with it are covered by `refinementBatchSource.test.ts`
 * against the pure merge, which needs neither a browser nor a database.
 */
vi.mock('@/services/refinementBatchStore', () => {
  const refused = async () => {
    throw new Error('Missing or insufficient permissions.');
  };
  return {
    fetchRefinementBatches: refused,
    createRefinementBatch: refused,
    updateRefinementBatchStatus: refused,
    seedRefinementBatches: refused,
  };
});

/**
 * No shell-context mock: no Content Bank page reads the outlet context. The
 * admin app carries no selected exam level, so a batch's own questions decide
 * what level an exact-ID review run is recorded under — asserted below.
 */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const INVENTORY_SUBJECTS: Subject[] = [...new Set([
  ...SUBJECTS_BY_LEVEL.Professional,
  ...SUBJECTS_BY_LEVEL.Subprofessional,
])];

/** Catalog loads for five subjects are slow in jsdom; the default 5s is not enough. */
const SLOW = 20_000;

/**
 * The real Content Bank route table from `src/App.tsx`, minus `RequireAdmin`
 * (which has its own test). Mounting all five routes together is also what
 * pins React Router's ranking: `batch/:batchId` and `:subjectSlug/:familySlug`
 * are both two segments deep, so a wrong preference would send a batch URL to
 * the Family Workspace instead.
 */
function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={CONTENT_BANK_BASE}>
          <Route index element={<ContentBankPage />} />
          <Route path={`${CONTENT_BANK_BATCH_SEGMENT}/:batchId`} element={<ContentBankBatchPage />} />
          <Route path={`${CONTENT_BANK_BATCH_SEGMENT}/:batchId/review`} element={<ContentBankReviewPage />} />
          <Route path=":subjectSlug" element={<ContentBankSubjectPage />} />
          <Route path=":subjectSlug/:familySlug" element={<ContentBankFamilyPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

/** The store notice only renders once the batch load has settled. */
function batchesLoaded() {
  return waitFor(() => expect(screen.getByText('Saving to this browser only')).toBeInTheDocument());
}

function reviewPanelLoaded() {
  return waitFor(() => expect(screen.getByRole('button', { name: 'Review Markdown' })).toBeInTheDocument(), { timeout: SLOW });
}

function batchIdsInOrder(): (string | undefined)[] {
  return [...document.querySelectorAll<HTMLElement>('[data-refinement-batch]')].map(
    (node) => node.dataset.refinementBatch
  );
}

/**
 * Finds a family at runtime instead of hard-coding one, because the shipped
 * registry keeps claiming questions: a family with spare remaining items today
 * may have none next batch, and a test pinned to a name would fail for a reason
 * that has nothing to do with the code.
 */
async function familyWithRemaining(subject: Subject, minimum: number) {
  const catalog = await loadContentCatalog([subject]);
  // The same batch list the page resolves to while Firestore is refused.
  const workspace = buildSubjectWorkspaceData(subject, catalog, getRefinementBatches());
  const group = workspace.families.find((family) => family.remainingQuestionIds.length >= minimum);
  if (!group) throw new Error(`No ${subject} family has ${minimum} remaining questions.`);
  const slug = slugForFamily(group.family);
  // Exactly what the picker shows: family by slug, remaining only, in workspace order.
  const remaining = workspace.questions
    .filter((item) => slugForFamily(item.family) === slug && item.state === 'remaining')
    .map((item) => item.question.id);
  return { family: group.family, slug, remaining };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => navigateMock.mockReset());

describe('Content Bank dashboard', () => {
  it('renders all current subjects as reusable workspace entry points', () => {
    renderRoute(CONTENT_BANK_ROUTE);

    expect(CONTENT_BANK_ROUTE).toBe('/admin/content-bank');
    expect(screen.getByRole('heading', { name: 'Content Bank', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subject Workspaces' })).toBeInTheDocument();
    expect(screen.getByTestId('content-bank-subject-count')).toHaveTextContent('5 subjects');
    expect(screen.getByTestId('content-bank-subject-count')).toHaveTextContent(
      `${QUESTION_MANIFEST.totalQuestions.toLocaleString('en-US')} active questions`
    );
    for (const subject of INVENTORY_SUBJECTS) {
      const card = screen.getByTestId(`subject-card-${subject}`);
      // The whole card is the link into the workspace.
      expect(card).toHaveAttribute('href', contentBankSubjectPath(subject));
      expect(card).toHaveTextContent('Open Subject Workspace');
    }
    // Admin-only: the Content Bank is never advertised in the learner shell nav.
    expect(NAV_ITEMS.some((item) => item.path === CONTENT_BANK_ROUTE)).toBe(false);
  });

  it('derives subject cards from active classifications and the separate QA registry', async () => {
    const summaries = buildSubjectDashboardSummaries(getRefinementBatches());
    renderRoute(CONTENT_BANK_ROUTE);
    await batchesLoaded();

    for (const summary of summaries) {
      const card = screen.getByTestId(`subject-card-${summary.subject}`);
      expect(card).toHaveTextContent(`${summary.activeQuestionCount.toLocaleString('en-US')} active questions`);
      expect(card).toHaveTextContent(`${summary.familyCount} families`);
      const percent =
        summary.activeQuestionCount === 0
          ? 0
          : Math.round((summary.frozenQuestionCount / summary.activeQuestionCount) * 100);
      await waitFor(() =>
        expect(card).toHaveTextContent(
          `${summary.frozenQuestionCount} of ${summary.activeQuestionCount} (${percent}%)`
        )
      );
    }
    expect(allClassifications().length).toBe(QUESTION_MANIFEST.totalQuestions);
  });

  it('keeps the existing canonical QA focus predicates and exact-ID Practice builders compatible', async () => {
    const groups = getQAFocusGroups();
    const classifications = allClassifications();
    const expected = new Map([
      ['filing-alphabetizing', classifications.filter((record) => record.subject === 'Clerical Ability' && record.topic === 'Filing & Alphabetizing').map((record) => record.questionId)],
      ['spelling', classifications.filter((record) => record.poolId === 'clerical-spelling' && record.taskFormat === 'shared_spelling_task').map((record) => record.questionId)],
      ['number-series', classifications.filter((record) => record.poolId === 'numerical-number-sequence' && record.taskFormat === 'number_sequence').map((record) => record.questionId)],
      ['grammar-sentence-correction', classifications.filter((record) => record.poolId === 'verbal-grammar-usage' && record.taskFormat === 'shared_grammar_sentence_correction').map((record) => record.questionId)],
    ]);

    expect(QA_FOCUS_GROUPS).toHaveLength(4);
    expect(QA_FOCUS_GROUPS.map((config) => config.id)).toEqual(['grammar-sentence-correction', 'number-series', 'spelling', 'filing-alphabetizing']);
    for (const group of groups) expect(group.questionIds).toEqual(expected.get(group.config.id));

    const builders = [
      ['filing-alphabetizing', buildFilingPracticeSession],
      ['spelling', buildSpellingPracticeSession],
      ['number-series', buildNumberSeriesPracticeSession],
      ['grammar-sentence-correction', buildGrammarPilotPracticeSession],
    ] as const;
    const groupMap = new Map(groups.map((group) => [group.config.id, group]));
    for (const [groupId, build] of builders) {
      const session = await build('Subprofessional');
      expect(new Set(session.questionIds)).toEqual(new Set(groupMap.get(groupId)!.questionIds));
    }
  });

  it('shows recent refinement batches newest first, with facts and no store labels', async () => {
    const registry = getRefinementBatches();
    expect(registry.length).toBeGreaterThan(6);
    renderRoute(CONTENT_BANK_ROUTE);

    await waitFor(() => expect(batchIdsInOrder()).toEqual(registry.slice(0, 6).map((batch) => batch.id)));
    expect(screen.getByTestId('refinement-count-grammar-pilot-01')).toHaveTextContent('4');
    expect(document.querySelector('[data-refinement-batch="grammar-pilot-01"]')).toHaveTextContent('Grammar & Usage');
    // Which store a batch came from is not narrated per row. The one case that
    // changes what a batch means — writes falling back to this browser — is said
    // once for the page by StoreDegradedNotice, asserted below.
    expect(screen.queryByText(/Stored in|Shipped registry/)).not.toBeInTheDocument();
    expect(screen.getByText('Saving to this browser only')).toBeInTheDocument();
  });

  it('never lists the retired batch2, and clears it out of this browser', async () => {
    // Exactly the shape the pre-Firestore Content Bank left behind: ten
    // arbitrary Clerical Ability ids under a real family. Dated newest of all,
    // so an unfiltered list would put it first — the assertion cannot pass by
    // the row simply falling off the end of the six shown.
    const legitimate = {
      id: 'clerical-ops-check-01',
      title: 'Clerical Ops Check 1',
      family: 'Filing & Alphabetizing',
      status: 'builder',
      createdAt: '2026-08-23T15:00:00+08:00',
      questionIds: ['cler-0056'],
    };
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([
      {
        id: 'batch2',
        title: 'Batch 2',
        family: 'Clerical Operations',
        status: 'needs-content',
        createdAt: '2026-08-23T16:00:00+08:00',
        questionIds: Array.from({ length: 10 }, (_, index) => `cler-${String(index + 1).padStart(4, '0')}`),
      },
      legitimate,
    ]));
    renderRoute(CONTENT_BANK_ROUTE);
    await batchesLoaded();

    // The batch list an admin actually sees: the legitimate local batch, then the
    // shipped registry. No batch2 anywhere in it.
    await waitFor(() =>
      expect(batchIdsInOrder()).toEqual([
        legitimate.id,
        ...getRefinementBatches().slice(0, 5).map((batch) => batch.id),
      ])
    );
    expect(document.querySelector('[data-refinement-batch="batch2"]')).toBeNull();
    expect(screen.queryByTestId('refinement-count-batch2')).not.toBeInTheDocument();

    // And it is gone from storage, so the next session has nothing to resurrect
    // and nothing to migrate into Firestore. Filtering the render alone would
    // leave the row sitting here.
    expect(JSON.parse(localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY) ?? '[]')).toEqual([legitimate]);
  });
});

describe('Content Bank workspaces', () => {
  it('lists a subject’s families and batches without offering batch creation there', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, getRefinementBatches());
    renderRoute(contentBankSubjectPath('Clerical Ability'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Clerical Ability', level: 1 })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Families' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batches in this subject' })).toBeInTheDocument();
    const rows = [...document.querySelectorAll<HTMLElement>('[data-family-row]')];
    expect(rows.map((row) => row.dataset.familyRow)).toEqual(
      workspace.families.map((family) => slugForFamily(family.family))
    );
    rows.forEach((row, index) => {
      const family = workspace.families[index];
      const href = contentBankFamilyPath('Clerical Ability', family.family);
      // Every link in the row resolves from that row's own family, so a family
      // that spans two task formats cannot borrow another row's destination.
      const links = within(row).getAllByRole('link');
      expect(links).not.toHaveLength(0);
      links.forEach((link) => expect(link).toHaveAttribute('href', href));
      // A row that highlights on hover has to be openable by more than its name:
      // the last column names the next step, and it is a real link so the
      // keyboard reaches it too.
      expect(links.at(-1)).toHaveAccessibleName(
        family.remainingQuestionIds.length > 0
          ? `Select questions in ${family.family} (${family.remainingQuestionIds.length} remaining)`
          : `Review ${family.family}`
      );
    });
    // Batches belong to exactly one family, so they are created a level deeper.
    expect(screen.queryByRole('heading', { name: 'Create refinement batch' })).not.toBeInTheDocument();
    // Only the selected subject is loaded.
    expect(screen.queryByText('Verbal Ability')).not.toBeInTheDocument();
  }, SLOW);

  it('routes a batch URL to the Batch Workspace and launches the learner Practice engine on its exact IDs', async () => {
    const user = userEvent.setup();
    const batch = getRefinementBatches().find((candidate) => candidate.id === 'filing-batch-02')!;
    renderRoute(contentBankBatchPath(batch.id));

    // Reaching this heading at all is the ranking proof: `batch` is a static
    // segment, so it must beat `:subjectSlug/:familySlug` — which would have
    // failed subjectFromSlug('batch') and redirected out of the Content Bank.
    await waitFor(() => expect(screen.getByRole('heading', { name: batch.title, level: 1 })).toBeInTheDocument(), {
      timeout: SLOW,
    });
    await waitFor(() =>
      expect(
        [...document.querySelectorAll<HTMLElement>('[data-batch-question]')].map((node) => node.dataset.batchQuestion)
      ).toEqual(batch.questionIds)
    );
    expect(screen.getByTestId('batch-family-link')).toHaveAttribute(
      'href',
      contentBankFamilyPath('Clerical Ability', batch.family)
    );
    const reviewPanel = screen.getByRole('region', { name: 'Review & Export' });
    expect(within(reviewPanel).getByRole('button', { name: 'Review Markdown' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: 'Review & export' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Practice these ${batch.questionIds.length} questions` }));
    // The exact IDs, in order, through the learner exam route. `internalReview`
    // is what keeps this graded and reviewable but never written as an attempt.
    // The level is derived from the batch itself — Clerical Ability exists only
    // at Subprofessional — because the admin app has no selected level to read.
    expect(navigateMock).toHaveBeenCalledWith(EXAM_ROUTE, {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Subprofessional',
          questionCount: batch.questionIds.length,
          questionIds: batch.questionIds,
          internalReview: true,
        },
      },
    });
  }, SLOW);

  it('offers workflow status only as controlled buttons, and a transition survives the next read', async () => {
    const user = userEvent.setup();
    // grammar-pilot-01 ships as Ready for QA, so both a forward and a backward
    // move are legal and neither is invented by the test.
    renderRoute(contentBankBatchPath('grammar-pilot-01'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Workflow status' })).toBeInTheDocument(), {
      timeout: SLOW,
    });
    await batchesLoaded();

    const workflow = screen.getByRole('heading', { name: 'Workflow status' }).closest('section')!;
    // Status is never typed: there is no field to put a wrong value into, and the
    // only affordances are the two legal moves from Ready for QA.
    expect(within(workflow).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(workflow).queryAllByRole('combobox')).toHaveLength(0);
    expect(within(workflow).getAllByRole('button').map((button) => button.textContent?.trim()).sort()).toEqual([
      'Advance to Frozen',
      'Send back to Builder',
    ]);
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Ready for QA');

    await user.click(within(workflow).getByRole('button', { name: 'Advance to Frozen' }));

    // Frozen is terminal in one direction only, so the button set proves the new
    // status was re-read rather than only rendered optimistically.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Send back to Ready for QA' })).toBeInTheDocument()
    );
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Frozen');
    const stored = JSON.parse(localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY) ?? '[]') as Array<{
      id: string;
      status: string;
      updatedAt?: string;
    }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: 'grammar-pilot-01', status: 'frozen' });
    expect(stored[0].updatedAt).toBeTruthy();
  }, SLOW);

  it('creates a batch from a family with a generated ID, exact selected questions, and no typed status', async () => {
    const user = userEvent.setup();
    const { family, remaining } = await familyWithRemaining('Clerical Ability', 3);
    const expectedName = generateRefinementBatchName(family, getRefinementBatches());
    renderRoute(contentBankFamilyPath('Clerical Ability', family));

    await waitFor(() => expect(screen.getByRole('heading', { name: family, level: 1 })).toBeInTheDocument(), {
      timeout: SLOW,
    });
    // Wait for the real batch list: numbering derives from it, so creating
    // before it lands would generate an id against an empty registry.
    await batchesLoaded();
    expect(screen.getByTestId('visible-question-count')).toHaveTextContent(String(remaining.length));
    const createPanel = screen.getByRole('region', { name: 'Create refinement batch' });
    expect(within(createPanel).getByTestId('generated-batch-id')).toHaveTextContent(expectedName.id);
    expect(within(createPanel).getByTestId('generated-batch-title')).toHaveTextContent(expectedName.title);
    // The starting status is stated, not chosen — and no control can change it.
    expect(createPanel).toHaveTextContent('Needs Content');
    expect(within(createPanel).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(createPanel).queryAllByRole('combobox')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: `Select all remaining (${remaining.length})` }));
    expect(screen.getByTestId('selected-question-count')).toHaveTextContent(String(remaining.length));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('selected-question-count')).toHaveTextContent('0');

    await user.clear(screen.getByLabelText('Next N'));
    await user.type(screen.getByLabelText('Next N'), '3');
    await user.click(screen.getByRole('button', { name: 'Select next N' }));
    expect(screen.getByTestId('selected-question-count')).toHaveTextContent('3');

    // The selection is explicit and ordered on screen before anything is saved:
    // this order is what the batch stores, what the review export renders, and
    // what the exact-ID Practice run plays.
    expect(
      [...within(createPanel).getByTestId('selected-question-ids').querySelectorAll('li')].map((item) =>
        item.textContent?.replace(/^\d+\.\s*/, '')
      )
    ).toEqual(remaining.slice(0, 3));

    // The action names the batch it will create, counted — nothing is created
    // that was not read first.
    await user.click(screen.getByRole('button', { name: `Create ${expectedName.title} (3 questions)` }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(contentBankBatchPath(expectedName.id)));
    const stored = JSON.parse(localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY) ?? '[]') as Array<{
      id: string;
      title: string;
      family: string;
      status: string;
      questionIds: string[];
    }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: expectedName.id,
      title: expectedName.title,
      family,
      status: DEFAULT_REFINEMENT_STATUS,
    });
    // Exactly the questions that were selected, in the order shown.
    expect(stored[0].questionIds).toEqual(remaining.slice(0, 3));
    // The batch is on the page as a row with its facts — and the browser-only
    // fallback is stated once for the page rather than on the row itself.
    await waitFor(() =>
      expect(document.querySelector(`[data-refinement-batch="${expectedName.id}"]`)).not.toBeNull()
    );
    expect(screen.getByText('Saving to this browser only')).toBeInTheDocument();
  }, SLOW);

  it('opens a family from its row, scopes the picker to that family, and orders the selection independently of click order', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, getRefinementBatches());
    const { family, slug, remaining } = await familyWithRemaining('Clerical Ability', 3);
    // Everything in the family, in workspace order — the picker's own order.
    const familyQuestionIds = workspace.questions
      .filter((item) => slugForFamily(item.family) === slug)
      .map((item) => item.question.id);
    const outsideFamily = workspace.questions
      .filter((item) => slugForFamily(item.family) !== slug)
      .map((item) => item.question.id);
    expect(outsideFamily.length).toBeGreaterThan(0);

    renderRoute(contentBankSubjectPath('Clerical Ability'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Clerical Ability', level: 1 })).toBeInTheDocument(), {
      timeout: SLOW,
    });

    // The click an admin actually makes: the row's action, not a bare page URL.
    await user.click(
      screen.getByRole('link', { name: `Select questions in ${family} (${remaining.length} remaining)` })
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: family, level: 1 })).toBeInTheDocument(), {
      timeout: SLOW,
    });
    await batchesLoaded();

    // The selection workflow leads the page and the existing batches sit below
    // it: the actionable step is not buried under a grid that grows every time
    // the workflow is used.
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Select questions for the next batch',
      'Create refinement batch',
      'Batches in this family',
    ]);

    const rowIds = () =>
      [...document.querySelectorAll<HTMLElement>('[data-question-row]')].map((node) => node.dataset.questionRow);
    // Unclaimed only by default — the questions a new batch can actually take.
    expect(rowIds()).toEqual(remaining);
    // With the state filter opened up: this family entire, and nothing else in
    // the subject. Mixing two families into one batch is not reachable from here.
    await user.selectOptions(screen.getByLabelText('Refinement state'), 'All');
    expect(rowIds()).toEqual(familyQuestionIds);
    expect(rowIds().filter((id) => outsideFamily.includes(id!))).toEqual([]);

    // Ticked back to front. The stored order still follows the family listing,
    // so the same three questions produce the same batch whoever picks them.
    const reversed = [...remaining.slice(0, 3)].reverse();
    for (const questionId of reversed) {
      await user.click(screen.getByRole('checkbox', { name: `Select ${questionId}` }));
    }
    expect(screen.getByTestId('selected-question-count')).toHaveTextContent('3');
    expect(
      [...screen.getByTestId('selected-question-ids').querySelectorAll('li')].map((item) =>
        item.textContent?.replace(/^\d+\.\s*/, '')
      )
    ).toEqual(remaining.slice(0, 3));

    await user.click(
      screen.getByRole('button', {
        name: `Create ${generateRefinementBatchName(family, getRefinementBatches()).title} (3 questions)`,
      })
    );
    const storedBatches = () =>
      JSON.parse(localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY) ?? '[]') as Array<{
        family: string;
        questionIds: string[];
      }>;
    await waitFor(() => expect(storedBatches()).toHaveLength(1));
    expect(storedBatches()[0].family).toBe(family);
    expect(storedBatches()[0].questionIds).toEqual(remaining.slice(0, 3));
  }, SLOW);

  it('blocks Practice and export for a batch whose IDs no longer resolve instead of quietly shrinking it', async () => {
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([{
      id: 'ui-broken-batch',
      title: 'UI Broken Batch',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T15:00:00+08:00',
      questionIds: ['cler-0056', 'cler-9999'],
    }]));
    renderRoute(contentBankBatchPath('ui-broken-batch'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI Broken Batch', level: 1 })).toBeInTheDocument(), {
      timeout: SLOW,
    });
    // Scoped to the actions section: the store is also degraded in this test
    // (batches came from localStorage), and that notice is an alert of its own.
    const actions = screen.getByRole('region', { name: 'Run and review' });
    const alert = await waitFor(() => within(actions).getByRole('alert'));
    expect(alert).toHaveTextContent('Practice and export are unavailable.');
    expect(alert).toHaveTextContent('cler-9999');
    expect(screen.getByRole('button', { name: 'Practice these 2 questions' })).toBeDisabled();
    // The review link is withheld, not left live against a partial batch.
    expect(screen.queryByRole('link', { name: 'Review & export' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Review & Export' })).toHaveTextContent('Review Markdown and Raw JSON are unavailable.');
    // Both IDs are still listed, so the batch is not silently rewritten.
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-batch-question]')].map((node) => node.dataset.batchQuestion)
    ).toEqual(['cler-0056', 'cler-9999']);
  }, SLOW);
});

describe('Batch Workspace Review & Export', () => {
  it('redirects old review URLs to the Batch Workspace’s embedded panel', async () => {
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([{
      id: 'ui-legacy-review',
      title: 'UI Legacy Review',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T15:00:00+08:00',
      questionIds: ['cler-0056'],
    }]));
    renderRoute(contentBankBatchReviewPath('ui-legacy-review'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI Legacy Review', level: 1 })).toBeInTheDocument(), { timeout: SLOW });
    expect(screen.getByRole('region', { name: 'Review & Export' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to batch workspace' })).not.toBeInTheDocument();
  }, SLOW);

  it('copies the exact chunk it displayed, byte for byte, and reports the same count', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    // filing-batch-02 is the largest shipped batch — the real multi-chunk case.
    renderRoute(contentBankBatchPath('filing-batch-02'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Filing & Alphabetizing — Batch 2', level: 1 })).toBeInTheDocument(), { timeout: SLOW });
    await reviewPanelLoaded();
    const panel = screen.getByRole('region', { name: 'Review & Export' });

    // The count the UI shows must be the count of the string it hands over.
    const displayedTotal = Number(panel.querySelector('dd')!.textContent!.replaceAll(',', ''));
    const chunkLabels = screen.getAllByText(/^Chunk \d+ of \d+$/);
    expect(chunkLabels.length).toBeGreaterThan(1);
    expect(chunkLabels.map((node) => node.textContent)).toEqual(
      chunkLabels.map((_, index) => `Chunk ${index + 1} of ${chunkLabels.length}`)
    );
    const displayedChunkCounts = screen.getAllByText(/^[\d,]+ characters$/)
      .map((node) => Number(node.textContent!.replace(' characters', '').replaceAll(',', '')));
    expect(displayedChunkCounts).toHaveLength(chunkLabels.length);
    expect(displayedChunkCounts.every((count) => count <= EXPORT_CHUNK_CHARACTER_LIMIT)).toBe(true);
    expect(displayedChunkCounts.reduce((total, count) => total + count, 0)).toBe(displayedTotal);

    const copyButtons = screen.getAllByRole('button', { name: 'Copy Chunk' });
    expect(copyButtons).toHaveLength(chunkLabels.length);
    await user.click(copyButtons[0]);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
      `Chunk 1 of ${chunkLabels.length} copied — ${displayedChunkCounts[0].toLocaleString('en-US')} characters.`
    ));

    const copiedChunk = String(writeText.mock.calls[0]?.[0]);
    expect(copiedChunk).toHaveLength(displayedChunkCounts[0]);
    // Pure LF: the length displayed is the length of this exact string. Chromium
    // adds a CR per line on the way to the clipboard and the paste target drops
    // it again, so the displayed number is what the target reports.
    expect(copiedChunk).toContain('\n');
    expect(copiedChunk).not.toContain('\r');
    expect(copiedChunk).toContain('# Filing & Alphabetizing — Batch 2');

    // Every chunk copied in order must reassemble into the whole document.
    for (const button of copyButtons.slice(1)) await user.click(button);
    const copiedChunks = writeText.mock.calls.map((call) => String(call[0]));
    expect(copiedChunks.map((text) => text.length)).toEqual(displayedChunkCounts);
    const reassembled = copiedChunks.join('');
    expect(reassembled).toHaveLength(displayedTotal);
    expect(reassembled).not.toContain('\r');
    expect(reassembled).toContain('### Learner View');
    expect(reassembled).toContain('### Authoring View');
    // The whole-document copy is that same string, not a re-render of it.
    await user.click(screen.getByRole('button', { name: /^Copy whole Review Markdown/ }));
    expect(String(writeText.mock.calls.at(-1)?.[0])).toBe(reassembled);
  }, SLOW);

  it('copies raw JSON for the batch in exact order without leaking registry fields', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([{
      id: 'ui-json-batch',
      title: 'UI JSON Batch',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T15:00:00+08:00',
      questionIds: ['cler-0056'],
    }]));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderRoute(contentBankBatchPath('ui-json-batch'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI JSON Batch', level: 1 })).toBeInTheDocument(), { timeout: SLOW });
    await reviewPanelLoaded();
    await user.click(screen.getByRole('button', { name: 'Raw JSON', pressed: false }));
    await user.click(screen.getByRole('button', { name: /^Copy whole Raw JSON/ }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Whole Raw JSON copied —'));
    const copied = String(writeText.mock.calls[0]?.[0]);
    expect(copied).not.toContain('\r');
    const raw = JSON.parse(copied) as Array<{ id: string; batchId?: string }>;
    expect(raw.map((item) => item.id)).toEqual(['cler-0056']);
    expect(raw[0]?.batchId).toBeUndefined();
    expect(copied).not.toContain('ui-json-batch');
  }, SLOW);

  it('refuses to copy and says so in an alert when the export cannot be built', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([{
      id: 'ui-clipboardless-batch',
      title: 'UI Clipboardless Batch',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T15:00:00+08:00',
      questionIds: ['cler-0056'],
    }]));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    renderRoute(contentBankBatchPath('ui-clipboardless-batch'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI Clipboardless Batch', level: 1 })).toBeInTheDocument(), { timeout: SLOW });
    await reviewPanelLoaded();
    await user.click(screen.getAllByRole('button', { name: 'Copy Chunk' })[0]);

    // A failed copy must read as a failure, not as an emerald success message.
    const reviewPanel = screen.getByRole('region', { name: 'Review & Export' });
    const alert = await waitFor(() => within(reviewPanel).getByRole('alert'));
    expect(alert).toHaveTextContent('Clipboard access is unavailable');
    expect(alert.className).toContain('red');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  }, SLOW);

  it('shows the chunk text for inspection without reflowing or altering it', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([{
      id: 'ui-inspect-batch',
      title: 'UI Inspect Batch',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T15:00:00+08:00',
      questionIds: ['cler-0056'],
    }]));
    renderRoute(contentBankBatchPath('ui-inspect-batch'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI Inspect Batch', level: 1 })).toBeInTheDocument(), { timeout: SLOW });
    await reviewPanelLoaded();

    const show = screen.getAllByRole('button', { name: 'Show' })[0];
    expect(show).toHaveAttribute('aria-expanded', 'false');
    await user.click(show);

    const preview = document.getElementById('export-chunk-1')!;
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
    expect(preview.tagName).toBe('PRE');
    expect(preview.className).toContain('whitespace-pre');
    expect(preview.className).toContain('overflow-auto');
    expect(preview.textContent).toContain('# UI Inspect Batch');
  }, SLOW);
});
