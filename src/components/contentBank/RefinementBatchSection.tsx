import { PlayCircle } from 'lucide-react';
import type { RefinementBatch } from '@/data/refinementBatches';
import { refinementStatusLabel } from '@/data/refinementBatches';

interface RefinementBatchSectionProps {
  batches: readonly RefinementBatch[];
  onLaunch: (batch: RefinementBatch) => void;
}

function statusClass(status: RefinementBatch['status']): string {
  return status === 'ready-for-qa'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
}

export function RefinementBatchSection({ batches, onLaunch }: RefinementBatchSectionProps) {
  return (
    <section aria-labelledby="refinement-batches-heading" data-testid="refinement-batches-section" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="refinement-batches-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Refinement Batches
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Practice the exact questions reviewed in each internal refinement batch.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{batches.length} batches</span>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {batches.map((batch) => (
          <article
            key={batch.id}
            data-refinement-batch={batch.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{batch.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(batch.status)}`}>
                    {refinementStatusLabel(batch.status)}
                  </span>
                </div>
                <p data-testid={`refinement-count-${batch.id}`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {batch.questionIds.length} questions · {refinementStatusLabel(batch.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onLaunch(batch)}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={`Practice batch ${batch.title}`}
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                <span>Practice Batch</span>
              </button>
            </div>
          </article>
        ))}
      </div>
      {batches.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No refinement batches registered.
        </p>
      )}
    </section>
  );
}
