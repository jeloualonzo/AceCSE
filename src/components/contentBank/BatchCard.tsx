import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { RefinementBatch } from '@/data/refinementBatches';
import { WorkflowBadge } from '@/components/contentBank/badges';
import { contentBankBatchPath } from '@/navigation/contentBankRoutes';

/**
 * One refinement batch, as a link into its own workspace.
 *
 * Facts only — title, id, status, questions, family, created — stacked
 * label-over-value rather than run together with separators. Which store a batch
 * physically came from is not on the card: when it matters, because writes are
 * falling back to this browser, `StoreDegradedNotice` says so once for the whole
 * page instead of repeating it on every row.
 */

function formatCreatedAt(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString() : value;
}

export function BatchCard({
  batch,
  showFamily = true,
}: {
  batch: RefinementBatch;
  showFamily?: boolean;
}) {
  return (
    <Link
      to={contentBankBatchPath(batch.id)}
      data-refinement-batch={batch.id}
      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{batch.title}</h3>
          <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">{batch.id}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WorkflowBadge status={batch.status} />
          <ArrowRight
            className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-slate-600"
            aria-hidden="true"
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Questions</dt>
          <dd data-testid={`refinement-count-${batch.id}`} className="mt-0.5 font-bold text-slate-900 dark:text-white">
            {batch.questionIds.length}
          </dd>
        </div>
        {showFamily && (
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Family</dt>
            <dd className="mt-0.5 truncate font-semibold text-slate-700 dark:text-slate-200">{batch.family}</dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created</dt>
          <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{formatCreatedAt(batch.createdAt)}</dd>
        </div>
      </dl>
    </Link>
  );
}

export default BatchCard;
