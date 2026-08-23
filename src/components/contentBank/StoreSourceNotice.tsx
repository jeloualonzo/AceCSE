import { Cloud, HardDrive, RefreshCw } from 'lucide-react';
import type { RefinementBatchesState } from '@/hooks/useRefinementBatches';

/**
 * Says out loud where refinement batches are being read from and written to.
 *
 * Firestore may be unreachable for an ordinary, fixable reason — most often
 * `firestore.rules` not deployed yet — and in that case the Content Bank keeps
 * working against the shipped seed plus browser-local storage. That is useful,
 * but only if the admin knows: work saved in one browser is invisible to
 * everyone else. So the fallback is stated, with the underlying reason kept
 * verbatim instead of flattened into "something went wrong".
 */
export function StoreSourceNotice({ state }: { state: RefinementBatchesState }) {
  const onFirestore = state.writeTarget === 'firestore';

  return (
    <div
      role="status"
      className={`rounded-xl border p-4 text-xs leading-5 ${
        onFirestore
          ? 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {onFirestore ? (
          <Cloud className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <HardDrive className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="font-bold">
          {onFirestore ? 'Saving to Firestore' : 'Saving to this browser only'}
        </span>
        <button
          type="button"
          onClick={state.reload}
          className="ml-auto inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Reload
        </button>
      </div>

      {onFirestore ? (
        <p className="mt-2">
          Batch metadata and question IDs are stored in the <span className="font-mono">refinementBatches</span>{' '}
          collection, shared across devices. Question content itself stays in the repository.
        </p>
      ) : (
        <>
          <p className="mt-2">
            Firestore did not answer, so batches you create or advance here are stored in this browser and no one else
            can see them. The shipped registry still loads normally.
          </p>
          <p className="mt-2">
            Reported reason: <span className="font-mono">{state.degradedReason ?? 'unknown'}</span>
          </p>
          <p className="mt-1">
            If that mentions permissions, deploy the rules with{' '}
            <span className="font-mono">firebase deploy --only firestore:rules</span> and reload.
          </p>
        </>
      )}

      {state.skippedIds.length > 0 && (
        <p className="mt-2">
          Skipped {state.skippedIds.length} stored {state.skippedIds.length === 1 ? 'document' : 'documents'} that
          failed validation: <span className="font-mono">{state.skippedIds.join(', ')}</span>.
        </p>
      )}
    </div>
  );
}

export default StoreSourceNotice;
