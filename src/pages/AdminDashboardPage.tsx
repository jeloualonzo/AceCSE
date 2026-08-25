import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRefinementBatches } from '@/hooks/useRefinementBatches';
import { StoreDegradedNotice } from '@/components/contentBank/StoreDegradedNotice';
import { WorkflowBadge } from '@/components/contentBank/badges';
import { buildSubjectDashboardSummaries } from '@/data/contentBankWorkspace';
import {
  REFINEMENT_STATUS_SEQUENCE,
  refinementStatusLabel,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';
import { ADMIN_NAV_SECTIONS } from '@/navigation/adminNavConfig';
import { contentBankSubjectPath } from '@/navigation/contentBankRoutes';

function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

/**
 * Admin Overview — the admin app's own dashboard.
 *
 * Every number here is counted from the loaded refinement stores and the active
 * question catalog. There is no placeholder figure: when the stores have not
 * finished loading, counts read as an em dash rather than a zero, because zero is
 * a claim and "not yet known" is not.
 */
export const AdminDashboardPage: React.FC = () => {
  useDocumentTitle('Admin');
  const { user } = useAuth();
  const state = useRefinementBatches();

  const summaries = useMemo(() => buildSubjectDashboardSummaries(state.batches), [state.batches]);

  const statusCounts = useMemo(() => {
    const counts = new Map<RefinementBatchStatus, number>(
      REFINEMENT_STATUS_SEQUENCE.map((status) => [status, 0]),
    );
    for (const batch of state.batches) {
      counts.set(batch.status, (counts.get(batch.status) ?? 0) + 1);
    }
    return counts;
  }, [state.batches]);

  const totals = useMemo(
    () =>
      summaries.reduce(
        (running, summary) => ({
          active: running.active + summary.activeQuestionCount,
          frozen: running.frozen + summary.frozenQuestionCount,
          readyForQa: running.readyForQa + summary.readyForQaQuestionCount,
          inProgress: running.inProgress + summary.inProgressQuestionCount,
          remaining: running.remaining + summary.remainingQuestionCount,
        }),
        { active: 0, frozen: 0, readyForQa: 0, inProgress: 0, remaining: 0 },
      ),
    [summaries],
  );

  const destinations = ADMIN_NAV_SECTIONS.flatMap((section) =>
    section.items.filter((item) => item.id !== 'overview').map((item) => ({ section, item })),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Admin Overview</h1>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <Fact label="Signed in as" value={user?.email ?? user?.displayName ?? 'Unknown account'} />
          <Fact
            label="Refinement batches"
            value={state.loading ? '—' : formatCount(state.batches.length)}
          />
        </dl>
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

      <section aria-labelledby="admin-pipeline-heading" className="space-y-3">
        <h2
          id="admin-pipeline-heading"
          className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Refinement pipeline
        </h2>
        {state.loading ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-8 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading refinement batches…
          </p>
        ) : state.batches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No refinement batches yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {REFINEMENT_STATUS_SEQUENCE.map((status) => (
              <div
                key={status}
                data-testid={`admin-status-count-${status}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <WorkflowBadge status={status} />
                <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatCount(statusCounts.get(status) ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {(statusCounts.get(status) ?? 0) === 1 ? 'batch' : 'batches'} in{' '}
                  {refinementStatusLabel(status)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="admin-supply-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="admin-supply-heading"
            className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Question supply by subject
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatCount(totals.active)} active questions
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-xs">
              <caption className="sr-only">
                Active, frozen, ready-for-QA, in-progress, and remaining question counts per subject
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Subject
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
                  <th scope="col" className="px-4 py-3 font-bold">
                    <span className="sr-only">Open workspace</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summaries.map((summary) => (
                  <tr
                    key={summary.subject}
                    data-testid={`admin-supply-row-${summary.subject}`}
                    className="text-slate-700 dark:text-slate-300"
                  >
                    <th scope="row" className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {summary.subject}
                    </th>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatCount(summary.activeQuestionCount)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCount(summary.frozenQuestionCount)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatCount(summary.readyForQaQuestionCount)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatCount(summary.inProgressQuestionCount)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatCount(summary.remainingQuestionCount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={contentBankSubjectPath(summary.subject)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-emerald-700 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 text-xs dark:border-slate-800 dark:bg-slate-950">
                <tr className="font-bold text-slate-900 dark:text-white">
                  <th scope="row" className="px-4 py-3 text-left">
                    All subjects
                  </th>
                  <td className="px-3 py-3 text-right">{formatCount(totals.active)}</td>
                  <td className="px-3 py-3 text-right text-emerald-700 dark:text-emerald-400">
                    {formatCount(totals.frozen)}
                  </td>
                  <td className="px-3 py-3 text-right">{formatCount(totals.readyForQa)}</td>
                  <td className="px-3 py-3 text-right">{formatCount(totals.inProgress)}</td>
                  <td className="px-3 py-3 text-right">{formatCount(totals.remaining)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="admin-destinations-heading" className="space-y-3">
        <h2
          id="admin-destinations-heading"
          className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Admin workspaces
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {destinations.map(({ section, item }) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                data-testid={`admin-destination-${item.id}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {section.label}
                </p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{item.label}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
