import { HardDrive, RefreshCw } from 'lucide-react';
import type { RefinementBatchesState } from '@/hooks/useRefinementBatches';

/**
 * Speaks up only when the refinement store is not behaving.
 *
 * A healthy store renders nothing: it is the expected case and does not need
 * narrating on every screen. The two unhealthy cases do need saying, because
 * silence about either would be a quiet inaccuracy — work saved to one browser
 * is invisible to everyone else, and a stored document dropped for failing
 * validation is a batch the admin cannot see.
 */
export function StoreDegradedNotice({ state }: { state: RefinementBatchesState }) {
  const onFirestore = state.writeTarget === 'firestore';
  const skipped = state.skippedIds.length;

  if (onFirestore && skipped === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"
    >
      {!onFirestore && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <HardDrive className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-bold">Saving to this browser only</span>
            <button
              type="button"
              onClick={state.reload}
              className="ml-auto inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reload
            </button>
          </div>
          <p className="mt-2">
            Batches you create or advance here are visible in this browser only. Reported reason:{' '}
            <span className="font-mono">{state.degradedReason ?? 'unknown'}</span>
          </p>
          <p className="mt-1">
            If that mentions permissions, deploy the rules with{' '}
            <span className="font-mono">firebase deploy --only firestore:rules</span> and reload.
          </p>
        </>
      )}

      {skipped > 0 && (
        <p className={onFirestore ? '' : 'mt-2'}>
          Skipped {skipped} stored {skipped === 1 ? 'document' : 'documents'} that failed
          validation: <span className="font-mono">{state.skippedIds.join(', ')}</span>.
        </p>
      )}
    </div>
  );
}

export default StoreDegradedNotice;
