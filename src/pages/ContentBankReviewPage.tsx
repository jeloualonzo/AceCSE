import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { useContentCatalog } from '@/hooks/useContentCatalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRefinementBatches } from '@/hooks/useRefinementBatches';
import { ContentBankBreadcrumbs } from '@/components/contentBank/ContentBankBreadcrumbs';
import { ReviewExportPanel } from '@/components/contentBank/ReviewExportPanel';
import { WorkflowBadge } from '@/components/contentBank/badges';
import {
  CONTENT_BANK_BASE,
  contentBankBatchPath,
  contentBankFamilyPath,
  contentBankSubjectPath,
} from '@/navigation/contentBankRoutes';
import type { Question, Subject } from '@/types';

/** Every subject: a batch is addressed by id and may cross level boundaries. */
const ALL_SUBJECTS: readonly Subject[] = [
  ...new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional]),
];

/**
 * Dedicated Review & Export page.
 *
 * Its own route rather than a panel inside the Batch Workspace, so the exact
 * text an admin is copying has the whole viewport and a URL that can be returned
 * to mid-review. It resolves the batch's IDs in stored order and hands them to
 * {@link ReviewExportPanel} unchanged — the panel owns character counting,
 * chunking, and the integrity check, and this page adds no second copy path.
 */
function ReviewWorkspace({ batchId }: { batchId: string }) {
  const state = useRefinementBatches();
  const { catalog, error, loading } = useContentCatalog(ALL_SUBJECTS);
  const batch = state.batches.find((candidate) => candidate.id === batchId);

  useDocumentTitle(batch ? `Review — ${batch.title}` : 'Review');

  const resolved = useMemo(() => {
    if (!batch || !catalog) return { questions: [] as Question[], missingIds: [] as string[] };
    const questions: Question[] = [];
    const missingIds: string[] = [];
    for (const id of batch.questionIds) {
      const question = catalog.getQuestion(id);
      if (question) questions.push(question);
      else missingIds.push(id);
    }
    return { questions, missingIds };
  }, [batch, catalog]);

  const subjects = [...new Set(resolved.questions.map((question) => question.subject))];
  const familySubject = subjects.length === 1 ? subjects[0] : null;

  if (state.loading || loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading this batch…
        </p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          No refinement batch with ID <span className="font-mono">{batchId}</span> is registered.
        </p>
        <Link
          to={CONTENT_BANK_BASE}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200"
        >
          Back to Content Bank
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <ContentBankBreadcrumbs
        trail={[
          { label: 'Content Bank', to: CONTENT_BANK_BASE },
          ...(familySubject
            ? [
                { label: familySubject, to: contentBankSubjectPath(familySubject) },
                { label: batch.family, to: contentBankFamilyPath(familySubject, batch.family) },
              ]
            : [{ label: batch.family }]),
          { label: batch.id, to: contentBankBatchPath(batch.id) },
          { label: 'Review' },
        ]}
      />

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{batch.title}</h1>
          <WorkflowBadge status={batch.status} />
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Batch ID</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-slate-900 dark:text-white">{batch.id}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Questions</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{batch.questionIds.length}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Family</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{batch.family}</dd>
          </div>
        </dl>
        <Link
          to={contentBankBatchPath(batch.id)}
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to batch workspace
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {resolved.missingIds.length > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <strong>This batch cannot be exported.</strong> These IDs are not in the active question bank:{' '}
          <span className="font-mono">{resolved.missingIds.join(', ')}</span>. A partial export would misrepresent the
          batch, so none is offered.
        </p>
      )}

      {resolved.missingIds.length === 0 && catalog && (
        <ReviewExportPanel key={batch.id} batch={batch} questions={resolved.questions} />
      )}
    </div>
  );
}

export default function ContentBankReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  if (!batchId) return <Navigate to={CONTENT_BANK_BASE} replace />;
  return <ReviewWorkspace batchId={batchId} />;
}
