import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Loader2, PlayCircle } from 'lucide-react';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { getQuestionPreview } from '@/data/contentBankWorkspace';
import type { RefinementBatch } from '@/data/refinementBatches';
import { useContentCatalog } from '@/hooks/useContentCatalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRefinementBatches, type RefinementBatchesState } from '@/hooks/useRefinementBatches';
import { ContentBankBreadcrumbs } from '@/components/contentBank/ContentBankBreadcrumbs';
import { StoreDegradedNotice } from '@/components/contentBank/StoreDegradedNotice';
import { WorkflowStatusControl } from '@/components/contentBank/WorkflowStatusControl';
import { WorkflowBadge } from '@/components/contentBank/badges';
import { ReviewExportPanel } from '@/components/contentBank/ReviewExportPanel';
import {
  buildContentBankPracticeLaunch,
  openContentBankPracticeInNewTab,
} from '@/lib/contentBankPractice';
import {
  CONTENT_BANK_BASE,
  contentBankFamilyPath,
  contentBankSubjectPath,
} from '@/navigation/contentBankRoutes';
import type { Question, Subject } from '@/types';

/**
 * Every subject, because a batch is addressed by id alone and the admin app has
 * no exam level of its own — a batch's questions may belong to either level.
 * Module-level so the catalog hook sees a stable list.
 */
const ALL_SUBJECTS: readonly Subject[] = [
  ...new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional]),
];

function formatTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : value;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

/**
 * Batch Workspace — one batch, its workflow status, and the exact items in it.
 *
 * The question list is rendered from `batch.questionIds` in stored order, not
 * from a re-query of the catalog, so what is shown is what a Practice run or an
 * export will contain. An id that no longer resolves is called out and blocks
 * both, because a batch that silently shrinks to the items that happen to still
 * exist is the kind of quiet inaccuracy this project refuses.
 */
function BatchWorkspace({ batch, state }: { batch: RefinementBatch; state: RefinementBatchesState }) {
  const { catalog, error, loading } = useContentCatalog(ALL_SUBJECTS);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useDocumentTitle(batch.title);

  const rows = useMemo(
    () =>
      batch.questionIds.map((id) => ({
        id,
        question: catalog?.getQuestion(id) ?? null,
        alsoIn: state.batches
          .filter((other) => other.id !== batch.id && other.questionIds.includes(id))
          .map((other) => other.id),
      })),
    [batch.id, batch.questionIds, catalog, state.batches],
  );
  const missingIds = useMemo(() => rows.filter((row) => !row.question).map((row) => row.id), [rows]);
  const resolvedQuestions = useMemo(
    () => rows.flatMap((row) => (row.question ? [row.question] : [])) as Question[],
    [rows],
  );
  const subjects = useMemo(
    () => [...new Set(resolvedQuestions.map((question) => question.subject))],
    [resolvedQuestions],
  );
  const familySubject = subjects.length === 1 ? subjects[0] : null;
  const exportsReady = Boolean(catalog) && missingIds.length === 0 && resolvedQuestions.length > 0;

  const practice = () => {
    const launch = buildContentBankPracticeLaunch(batch.questionIds, resolvedQuestions);
    if (!launch) {
      setPracticeError('Practice is unavailable because the batch questions could not be resolved exactly.');
      return;
    }
    if (!openContentBankPracticeInNewTab(launch)) {
      setPracticeError('Practice could not open a new tab. Allow pop-ups for this site and try again.');
      return;
    }
    setPracticeError(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <ContentBankBreadcrumbs
        trail={[
          { label: 'Content Bank', to: CONTENT_BANK_BASE },
          ...(familySubject
            ? [
                { label: familySubject, to: contentBankSubjectPath(familySubject) },
                { label: batch.family, to: contentBankFamilyPath(familySubject, batch.family) },
              ]
            : [{ label: batch.family }]),
          { label: batch.id },
        ]}
      />

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{batch.title}</h1>
          <WorkflowBadge status={batch.status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Fact label="Batch ID">
            <span className="font-mono text-xs">{batch.id}</span>
          </Fact>
          <Fact label="Family">
            {familySubject ? (
              <Link
                to={contentBankFamilyPath(familySubject, batch.family)}
                data-testid="batch-family-link"
                className="rounded text-emerald-700 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
              >
                {batch.family}
              </Link>
            ) : (
              batch.family
            )}
          </Fact>
          <Fact label="Questions">{batch.questionIds.length}</Fact>
          <Fact label={subjects.length > 1 ? 'Subjects' : 'Subject'}>
            {subjects.length > 0 ? subjects.join(', ') : (batch.subject ?? 'Unresolved')}
          </Fact>
          <Fact label="Created">{formatTimestamp(batch.createdAt)}</Fact>
        </dl>
        {batch.updatedAt && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Status last changed {formatTimestamp(batch.updatedAt)}.
          </p>
        )}
      </header>

      {!state.loading && <StoreDegradedNotice state={state} />}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      {state.lastWrite?.batchId === batch.id && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300"
        >
          Saved to {state.lastWrite.target === 'firestore' ? 'Firestore' : 'this browser only'}
          {state.lastWrite.fallbackReason ? ` — ${state.lastWrite.fallbackReason}` : ''}.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section
            aria-labelledby="batch-questions-heading"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2
                id="batch-questions-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Exact question list
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">Stored order preserved</span>
            </div>

            {error && (
              <p role="alert" className="px-4 py-4 text-xs font-semibold text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            {loading && !error ? (
              <p
                role="status"
                className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-500 dark:text-slate-400"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading questions…
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left text-xs">
                  <caption className="sr-only">The {batch.questionIds.length} questions in {batch.title}</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="w-10 px-3 py-3 text-right font-bold">
                        #
                      </th>
                      <th scope="col" className="px-3 py-3 font-bold">
                        Question
                      </th>
                      <th scope="col" className="px-3 py-3 font-bold">
                        Difficulty
                      </th>
                      <th scope="col" className="px-3 py-3 font-bold">
                        Structure
                      </th>
                      <th scope="col" className="px-3 py-3 font-bold">
                        Also in
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row, index) => (
                      <tr key={row.id} data-batch-question={row.id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-3 py-3 text-right align-top font-mono text-slate-400">{index + 1}</td>
                        <td className="max-w-[440px] px-3 py-3 align-top">
                          <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">{row.id}</div>
                          {row.question ? (
                            <div className="mt-1 leading-5">{getQuestionPreview(row.question)}</div>
                          ) : (
                            <div className="mt-1 font-semibold text-red-700 dark:text-red-300">
                              Not in the active question bank.
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">{row.question?.difficulty ?? '—'}</td>
                        <td className="px-3 py-3 align-top">
                          {row.question ? (row.question.structuredExplanation ? 'Structured' : 'Legacy') : '—'}
                        </td>
                        <td className="px-3 py-3 align-top">
                          {row.alsoIn.length === 0 ? (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          ) : (
                            <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                              {row.alsoIn.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <WorkflowStatusControl batch={batch} onTransition={state.transitionBatch} />

          <section
            aria-labelledby="batch-actions-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h2
              id="batch-actions-heading"
              className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Run and review
            </h2>

            {practiceError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              >
                {practiceError}
              </p>
            )}

            {missingIds.length > 0 && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              >
                <strong>Practice and export are unavailable.</strong> These IDs are not in the active question bank:{' '}
                <span className="font-mono">{missingIds.join(', ')}</span>.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={practice}
                disabled={!exportsReady}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Practice these {batch.questionIds.length} questions
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Not recorded in history or analytics.
            </p>
          </section>
        </div>
      </div>

      {catalog && missingIds.length === 0 && resolvedQuestions.length > 0 ? (
        <ReviewExportPanel key={batch.id} batch={batch} questions={resolvedQuestions} />
      ) : (
        <section
          aria-labelledby="review-export-heading"
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 id="review-export-heading" className="text-base font-extrabold text-slate-900 dark:text-white">
            Review &amp; Export
          </h2>
          {loading && !error ? (
            <p role="status" className="text-xs text-slate-500 dark:text-slate-400">Loading export data…</p>
          ) : error ? (
            <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-300">{error}</p>
          ) : (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            >
              <strong>Review Markdown and Raw JSON are unavailable.</strong> These IDs are not in the active question bank:{' '}
              <span className="font-mono">{missingIds.join(', ')}</span>. A partial export is blocked to preserve the exact batch.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Resolves the batch id in the URL against the loaded stores.
 *
 * The not-found case waits for the load to finish before reporting anything: a
 * bookmarked batch is missing only if the stores have actually been read, and
 * saying so early would be a guess.
 */
export function ContentBankBatchResolver({ batchId }: { batchId: string }) {
  const state = useRefinementBatches();
  const batch = state.batches.find((candidate) => candidate.id === batchId);

  if (batch) return <BatchWorkspace batch={batch} state={state} />;

  if (state.loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading refinement batches…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
      >
        No refinement batch with ID <span className="font-mono">{batchId}</span> is registered
        {state.degradedReason ? ' in the stores currently reachable' : ''}.
      </p>
      {state.skippedIds.includes(batchId) && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          A stored document with this ID was read but failed validation, so it was left out rather than shown partially.
        </p>
      )}
      <Link
        to={CONTENT_BANK_BASE}
        className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200"
      >
        Back to Content Bank
      </Link>
    </div>
  );
}

export default function ContentBankBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  if (!batchId) return <Navigate to={CONTENT_BANK_BASE} replace />;
  return <ContentBankBatchResolver batchId={batchId} />;
}
