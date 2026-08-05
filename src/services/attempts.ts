import type { Attempt } from '@/types';

/**
 * Attempt persistence facade. The Firestore SDK is loaded on first use via
 * dynamic import (see `attemptsImpl.ts`), keeping it off the critical path.
 */

const impl = () => import('./attemptsImpl');

/**
 * Persist a completed attempt. Offline-safe: with persistent cache enabled the
 * write queues locally and syncs when connectivity returns.
 */
export async function saveAttempt(uid: string, attempt: Attempt): Promise<void> {
  await (await impl()).saveAttempt(uid, attempt);
}

/**
 * Live subscription to the user's attempt history, newest first.
 * Returns the unsubscribe function.
 */
export function subscribeToAttempts(
  uid: string,
  onChange: (attempts: Attempt[]) => void,
  onError?: (error: Error) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  impl()
    .then((module) => {
      if (cancelled) return;
      unsubscribe = module.subscribeToAttempts(uid, onChange, onError);
    })
    .catch((error) => {
      if (!cancelled) onError?.(error instanceof Error ? error : new Error(String(error)));
    });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
