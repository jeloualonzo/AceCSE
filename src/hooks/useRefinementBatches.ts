import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadRefinementBatches,
  migrateRefinementBatches,
  saveRefinementBatch,
  saveRefinementBatchStatus,
  type RefinementBatchSourceKind,
} from '@/data/refinementBatchSource';
import type { RefinementBatch, RefinementBatchStatus } from '@/data/refinementBatches';
import { useAuth } from '@/context/AuthContext';

/**
 * The Content Bank's single reader and writer of refinement batches.
 *
 * Every admin page shares this hook so they cannot disagree about which store
 * won or where a write went. It deliberately reports the store it is using
 * rather than hiding a fallback: a batch that exists only in one browser is a
 * materially different thing from one the team can see, and pretending
 * otherwise is exactly the kind of quiet lie this project refuses.
 *
 * Migration of `content/qa/refinement-batches.json` runs once per mount, is
 * create-only, and is skipped entirely when Firestore is unreachable.
 */

export interface RefinementBatchesState {
  batches: RefinementBatch[];
  sourceById: Record<string, RefinementBatchSourceKind>;
  writeTarget: 'firestore' | 'local';
  /** Why Firestore is not in use. `null` when it is. */
  degradedReason: string | null;
  /** Stored documents that failed validation and were left out. */
  skippedIds: string[];
  /** Batches the seed/browser holds that Firestore has not stored. */
  unseededIds: string[];
  loading: boolean;
  /** A failed create or transition, kept until the next attempt. */
  error: string | null;
  /** Where the last successful write landed, for an honest confirmation. */
  lastWrite: { batchId: string; target: 'firestore' | 'local'; fallbackReason: string | null } | null;
  reload: () => void;
  createBatch: (batch: RefinementBatch) => Promise<boolean>;
  transitionBatch: (batch: RefinementBatch, status: RefinementBatchStatus) => Promise<boolean>;
}

const EMPTY: Omit<RefinementBatchesState, 'reload' | 'createBatch' | 'transitionBatch'> = {
  batches: [],
  sourceById: {},
  writeTarget: 'local',
  degradedReason: null,
  skippedIds: [],
  unseededIds: [],
  loading: true,
  error: null,
  lastWrite: null,
};

export function useRefinementBatches(): RefinementBatchesState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState(EMPTY);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true }));

    void (async () => {
      // Migrate first, then read, so the read reflects what was just seeded and
      // the page does not briefly show batches as unseeded that no longer are.
      try {
        await migrateRefinementBatches(uid);
      } catch {
        // A refused migration is not fatal — loadRefinementBatches falls back to
        // the shipped seed and reports the reason from its own attempt.
      }
      const load = await loadRefinementBatches();
      if (!active) return;
      setState({ ...load, loading: false, error: null, lastWrite: null });
    })();

    return () => {
      active = false;
    };
  }, [uid, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const createBatch = useCallback(
    async (batch: RefinementBatch) => {
      try {
        const placement = await saveRefinementBatch(batch, uid, state.writeTarget);
        setState((current) => ({ ...current, error: null, lastWrite: { batchId: batch.id, ...placement } }));
        reload();
        return true;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Could not save this batch.',
        }));
        return false;
      }
    },
    [reload, state.writeTarget, uid],
  );

  const transitionBatch = useCallback(
    async (batch: RefinementBatch, status: RefinementBatchStatus) => {
      try {
        const placement = await saveRefinementBatchStatus(
          batch,
          status,
          uid,
          state.writeTarget,
          new Date().toISOString(),
        );
        setState((current) => ({ ...current, error: null, lastWrite: { batchId: batch.id, ...placement } }));
        reload();
        return true;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Could not change this status.',
        }));
        return false;
      }
    },
    [reload, state.writeTarget, uid],
  );

  return useMemo(
    () => ({ ...state, reload, createBatch, transitionBatch }),
    [createBatch, reload, state, transitionBatch],
  );
}
