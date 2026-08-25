import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  buildSubjectWorkspaceData,
  findFamilyBySlug,
  slugForFamily,
  subjectFromSlug,
} from '@/data/contentBankWorkspace';
import type { RefinementBatch } from '@/data/refinementBatches';
import { useContentCatalog } from '@/hooks/useContentCatalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRefinementBatches } from '@/hooks/useRefinementBatches';
import { ContentBankBreadcrumbs } from '@/components/contentBank/ContentBankBreadcrumbs';
import { BatchCard } from '@/components/contentBank/BatchCard';
import { CreateBatchPanel } from '@/components/contentBank/CreateBatchPanel';
import { FamilyQuestionPicker } from '@/components/contentBank/FamilyQuestionPicker';
import { StoreDegradedNotice } from '@/components/contentBank/StoreDegradedNotice';
import { FrozenProgressBar, ProgressBadge, StatFigure } from '@/components/contentBank/badges';
import {
  CONTENT_BANK_BASE,
  contentBankBatchPath,
  contentBankSubjectPath,
} from '@/navigation/contentBankRoutes';
import type { Subject } from '@/types';

/**
 * Family Workspace — where refinement work actually happens.
 *
 * Keyed by family (the taxonomy topic) rather than by the finer
 * topic+pool+task-format grouping the progress tables use, because a batch
 * records a family and nothing narrower. If a family spans more than one task
 * format, all of it appears here and the formats are listed, so the page cannot
 * quietly show a subset of what a batch created here would cover.
 *
 * Ordered top to bottom by what the admin came here to do: progress, then the
 * selection and the create action, then the batches that already exist. The
 * batch list used to sit above the picker, which buried the one actionable step
 * on the page below a grid that grows every time the workflow is used.
 */
function FamilyWorkspace({ subject, familySlug }: { subject: Subject; familySlug: string }) {
  const navigate = useNavigate();
  const { catalog, error, loading } = useContentCatalog([subject]);
  const batchState = useRefinementBatches();
  // Ordered, not a set: this is the order the batch stores, exports, and runs in.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const workspace = useMemo(
    () => (catalog ? buildSubjectWorkspaceData(subject, catalog, batchState.batches) : null),
    [batchState.batches, catalog, subject],
  );
  const familyGroups = useMemo(
    () => workspace?.families.filter((family) => slugForFamily(family.family) === familySlug) ?? [],
    [familySlug, workspace],
  );
  const primaryGroup = workspace ? findFamilyBySlug(workspace.families, familySlug) : undefined;
  const familyLabel = primaryGroup?.family ?? familySlug;
  const familyQuestions = useMemo(
    () => workspace?.questions.filter((item) => slugForFamily(item.family) === familySlug) ?? [],
    [familySlug, workspace],
  );
  const familyBatches = useMemo(
    () => batchState.batches.filter((batch) => slugForFamily(batch.family) === familySlug),
    [batchState.batches, familySlug],
  );

  useDocumentTitle(`${familyLabel} — ${subject}`);

  const counts = useMemo(() => {
    const tally = { frozen: 0, readyForQa: 0, inProgress: 0, remaining: 0 };
    for (const item of familyQuestions) {
      if (item.state === 'frozen') tally.frozen += 1;
      else if (item.state === 'ready-for-qa') tally.readyForQa += 1;
      else if (item.state === 'in-progress') tally.inProgress += 1;
      else tally.remaining += 1;
    }
    return tally;
  }, [familyQuestions]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      </div>
    );
  }

  if (loading || !workspace) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading {subject}…
        </p>
      </div>
    );
  }

  if (familyGroups.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <span className="font-mono">{familySlug}</span> is not a family in {subject}.
        </p>
        <Link
          to={contentBankSubjectPath(subject)}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200"
        >
          Back to {subject}
        </Link>
      </div>
    );
  }

  const taskFormats = [...new Set(familyGroups.map((group) => group.taskFormat))];
  const pools = [...new Set(familyGroups.map((group) => group.poolId).filter((poolId): poolId is string => Boolean(poolId)))];
  const status = familyGroups.length === 1 ? familyGroups[0].status : undefined;

  const onCreated = (batch: RefinementBatch) => {
    setSelectedIds([]);
    navigate(contentBankBatchPath(batch.id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <ContentBankBreadcrumbs
        trail={[
          { label: 'Content Bank', to: CONTENT_BANK_BASE },
          { label: subject, to: contentBankSubjectPath(subject) },
          { label: familyLabel },
        ]}
      />

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{familyLabel}</h1>
          {status && <ProgressBadge status={status} />}
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{subject}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {taskFormats.length === 1 ? 'Task format' : 'Task formats'}
            </dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-slate-900 dark:text-white">{taskFormats.join(', ')}</dd>
          </div>
          {pools.length > 0 && (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {pools.length === 1 ? 'Pool' : 'Pools'}
              </dt>
              <dd className="mt-1 font-mono text-xs font-semibold text-slate-900 dark:text-white">{pools.join(', ')}</dd>
            </div>
          )}
        </dl>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatFigure label="Active" value={familyQuestions.length} />
          <StatFigure label="Frozen" value={counts.frozen} tone="emerald" />
          <StatFigure label="Ready for QA" value={counts.readyForQa} tone="blue" />
          <StatFigure label="In progress" value={counts.inProgress} tone="amber" />
          <StatFigure label="Remaining" value={counts.remaining} />
        </div>
        <div className="mt-4">
          <FrozenProgressBar frozen={counts.frozen} active={familyQuestions.length} />
        </div>
      </header>

      {!batchState.loading && <StoreDegradedNotice state={batchState} />}

      {batchState.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {batchState.error}
        </p>
      )}

      <FamilyQuestionPicker
        questions={familyQuestions}
        selectedIds={selectedIds}
        onChangeSelection={setSelectedIds}
      />

      <CreateBatchPanel
        subject={subject}
        family={familyLabel}
        selectedIds={selectedIds}
        knownQuestionIds={new Set(workspace.questions.map((item) => item.question.id))}
        existingBatches={batchState.batches}
        writeTarget={batchState.writeTarget}
        onCreate={batchState.createBatch}
        onCreated={onCreated}
      />

      <section aria-labelledby="family-batches-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="family-batches-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Batches in this family
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {familyBatches.length} {familyBatches.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>
        {familyBatches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No batches in this family yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {familyBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} showFamily={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ContentBankFamilyPage() {
  const { subjectSlug, familySlug } = useParams<{ subjectSlug: string; familySlug: string }>();
  const subject = subjectFromSlug(subjectSlug ?? '');
  if (!subject || !familySlug) return <Navigate to={CONTENT_BANK_BASE} replace />;
  return <FamilyWorkspace subject={subject} familySlug={familySlug} />;
}
