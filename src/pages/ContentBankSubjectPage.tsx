import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  buildSubjectWorkspaceData,
  slugForFamily,
  subjectFromSlug,
} from '@/data/contentBankWorkspace';
import { useContentCatalog } from '@/hooks/useContentCatalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRefinementBatches } from '@/hooks/useRefinementBatches';
import { ContentBankBreadcrumbs } from '@/components/contentBank/ContentBankBreadcrumbs';
import { BatchCard } from '@/components/contentBank/BatchCard';
import { FrozenProgressBar, ProgressBadge, StatFigure } from '@/components/contentBank/badges';
import {
  CONTENT_BANK_BASE,
  contentBankFamilyPath,
} from '@/navigation/contentBankRoutes';
import type { Subject } from '@/types';

/**
 * Subject Workspace — the list of families in one subject.
 *
 * Deliberately does no batch building of its own. The workflow is family-first:
 * a batch belongs to exactly one family, so the only way to create one is from
 * inside a Family Workspace, which cannot mix families by construction.
 */
function SubjectWorkspace({ subject }: { subject: Subject }) {
  useDocumentTitle(`${subject} — Content Bank`);
  const { catalog, error, loading } = useContentCatalog([subject]);
  const batchState = useRefinementBatches();

  const workspace = useMemo(
    () => (catalog ? buildSubjectWorkspaceData(subject, catalog, batchState.batches) : null),
    [batchState.batches, catalog, subject],
  );
  const subjectBatches = useMemo(() => {
    if (!workspace) return [];
    const activeIds = new Set(workspace.questions.map((item) => item.question.id));
    return workspace.batches.filter((batch) => batch.questionIds.some((id) => activeIds.has(id)));
  }, [workspace]);

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <ContentBankBreadcrumbs trail={[{ label: 'Content Bank', to: CONTENT_BANK_BASE }, { label: subject }]} />

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{subject}</h1>
          <ProgressBadge status={workspace.status} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatFigure label="Active" value={workspace.activeQuestionCount} />
          <StatFigure label="Frozen" value={workspace.frozenQuestionIds.length} tone="emerald" />
          <StatFigure label="Ready for QA" value={workspace.readyForQaQuestionIds.length} tone="blue" />
          <StatFigure label="In progress" value={workspace.inProgressQuestionIds.length} tone="amber" />
          <StatFigure label="Remaining" value={workspace.remainingQuestionIds.length} />
        </div>
        <div className="mt-4">
          <FrozenProgressBar frozen={workspace.frozenQuestionIds.length} active={workspace.activeQuestionCount} />
        </div>
      </header>

      {workspace.invalidBatchReferences.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <strong>Some batches reference questions that are not in the active catalog.</strong>
          <ul className="mt-1 list-disc pl-4">
            {workspace.invalidBatchReferences.map((entry) => (
              <li key={entry.batchId}>
                Batch <span className="font-mono">{entry.batchId}</span> references{' '}
                <span className="font-mono">{entry.missingQuestionIds.join(', ')}</span>.
              </li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="families-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="families-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Families
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {workspace.families.length} {workspace.families.length === 1 ? 'family' : 'families'}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-xs">
              <caption className="sr-only">Refinement progress by family for {subject}</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Family
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Active
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Frozen
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Ready for QA
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    In progress
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Remaining
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">
                    <span className="sr-only">Open family workspace</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {workspace.families.map((family) => {
                  const familyPath = contentBankFamilyPath(subject, family.family);
                  const hasRemaining = family.remainingQuestionIds.length > 0;
                  // The row highlights on hover, so every part of it that looks
                  // clickable is clickable: the name cell is a block link, and the
                  // last column names what opening the family lets you do next.
                  // A bare onClick on the <tr> would look the same and be
                  // unreachable by keyboard, so both remain real links.
                  return (
                    <tr
                      key={family.key}
                      data-family-row={slugForFamily(family.family)}
                      className="text-slate-700 hover:bg-emerald-50/40 dark:text-slate-300 dark:hover:bg-emerald-950/20"
                    >
                      <th scope="row" className="p-0 text-left font-normal">
                        <Link
                          to={familyPath}
                          className="block rounded px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                        >
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{family.family}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{family.taskFormat}</span>
                        </Link>
                      </th>
                      <td className="px-3 py-3 text-right font-semibold">{family.activeQuestionIds.length}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                        {family.frozenQuestionIds.length}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-blue-700 dark:text-blue-400">
                        {family.readyForQaQuestionIds.length}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-amber-700 dark:text-amber-400">
                        {family.inProgressQuestionIds.length}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{family.remainingQuestionIds.length}</td>
                      <td className="px-4 py-3 text-right">
                        <ProgressBadge status={family.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={familyPath}
                          aria-label={
                            hasRemaining
                              ? `Select questions in ${family.family} (${family.remainingQuestionIds.length} remaining)`
                              : `Review ${family.family}`
                          }
                          className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-slate-300 px-3 text-[11px] font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400"
                        >
                          {hasRemaining ? `Select questions (${family.remainingQuestionIds.length})` : 'Review family'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {workspace.families.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No classified content is available for this subject.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="subject-batches-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="subject-batches-heading"
            className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Batches in this subject
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {subjectBatches.length} {subjectBatches.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>
        {subjectBatches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No batch includes active questions from this subject yet. Open a family to create the first one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {subjectBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ContentBankSubjectPage() {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const subject = subjectFromSlug(subjectSlug ?? '');
  return subject ? <SubjectWorkspace subject={subject} /> : <Navigate to={CONTENT_BANK_BASE} replace />;
}
