import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import {
  allowedNextRefinementStatuses,
  refinementStatusLabel,
  REFINEMENT_STATUS_SEQUENCE,
  type RefinementBatch,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';

/**
 * The only way a batch's workflow status changes.
 *
 * Two rules are enforced here rather than trusted to the operator:
 *
 * - Status is never typed. The controls are buttons generated from
 *   `allowedNextRefinementStatuses`, so an illegal move has no affordance at
 *   all — there is no text field to put a wrong value into.
 * - The whole pipeline stays visible, current step marked, so it is obvious
 *   where a batch sits and what comes next rather than only what is clickable.
 *
 * The transition rules themselves live in `src/data/refinementBatches.ts`; this
 * component renders them and does not decide them.
 */
export function WorkflowStatusControl({
  batch,
  onTransition,
  disabled = false,
}: {
  batch: RefinementBatch;
  onTransition: (batch: RefinementBatch, status: RefinementBatchStatus) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState<RefinementBatchStatus | null>(null);
  const currentIndex = REFINEMENT_STATUS_SEQUENCE.indexOf(batch.status);
  const nextStatuses = allowedNextRefinementStatuses(batch.status);

  const move = async (status: RefinementBatchStatus) => {
    setPending(status);
    try {
      await onTransition(batch, status);
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="workflow-status-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 id="workflow-status-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Workflow status
      </h2>

      <ol className="mt-4 flex flex-wrap gap-2">
        {REFINEMENT_STATUS_SEQUENCE.map((status, index) => {
          const isCurrent = status === batch.status;
          const isPast = index < currentIndex;
          return (
            <li key={status}>
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${
                  isCurrent
                    ? 'bg-emerald-600 text-white'
                    : isPast
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isPast && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {refinementStatusLabel(status)}
                {isCurrent && <span className="sr-only">(current)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
        {nextStatuses.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {refinementStatusLabel(batch.status)} is a terminal status. There is nowhere further to move this batch.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Allowed moves from {refinementStatusLabel(batch.status)}:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {nextStatuses.map((status) => {
                const isForward = REFINEMENT_STATUS_SEQUENCE.indexOf(status) > currentIndex;
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={disabled || pending !== null}
                    onClick={() => void move(status)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isForward
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {pending === status ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ArrowRight className={`h-3.5 w-3.5 ${isForward ? '' : 'rotate-180'}`} aria-hidden="true" />
                    )}
                    {isForward ? 'Advance to' : 'Send back to'} {refinementStatusLabel(status)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default WorkflowStatusControl;
