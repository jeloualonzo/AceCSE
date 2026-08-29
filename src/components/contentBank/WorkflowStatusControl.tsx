import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  isRefinementBatchStatus,
  refinementStatusLabel,
  REFINEMENT_STATUS_SEQUENCE,
  type RefinementBatch,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';

/**
 * The single workflow-status control for an admin batch.
 *
 * Renders as a bare control, with no heading and no instructions, because it
 * sits inside the batch card header beside the Practice action. The select is
 * controlled by the persisted `batch.status`, not by an optimistic local value.
 * A failed write therefore leaves the old status selected while the page-level
 * persistence error remains visible. Options are drawn from the typed status
 * sequence, and the change handler rejects anything outside that enum before it
 * can reach persistence.
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
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const changeStatus = async (value: string) => {
    if (!isRefinementBatchStatus(value) || value === batch.status) return;
    setTransitionError(null);
    setPending(value);
    try {
      const saved = await onTransition(batch, value);
      if (!saved) setTransitionError('Could not save this status. Please try again.');
    } catch {
      setTransitionError('Could not save this status. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div aria-busy={pending !== null} className="flex flex-col items-stretch gap-1.5">
      <div className="relative">
        <select
          id="workflow-status-select"
          aria-label="Batch status"
          value={batch.status}
          disabled={disabled || pending !== null}
          onChange={(event) => void changeStatus(event.target.value)}
          className="min-h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
        >
          {REFINEMENT_STATUS_SEQUENCE.map((status) => (
            <option key={status} value={status}>
              {refinementStatusLabel(status)}
            </option>
          ))}
        </select>
        {pending !== null ? (
          <Loader2 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        )}
      </div>

      {transitionError && (
        <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-300">
          {transitionError}
        </p>
      )}

      {pending !== null && (
        <p role="status" className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Saving status as {refinementStatusLabel(pending)}…
        </p>
      )}
    </div>
  );
}

export default WorkflowStatusControl;
