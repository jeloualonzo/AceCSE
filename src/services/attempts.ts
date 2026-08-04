import {
  collection,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Attempt } from '@/types';

const MAX_ATTEMPTS_LOADED = 200;

function attemptsCollection(uid: string) {
  return collection(db, 'users', uid, 'attempts');
}

/**
 * Persist a completed attempt. Offline-safe: with persistent cache enabled the
 * write queues locally and syncs when connectivity returns.
 */
export async function saveAttempt(uid: string, attempt: Attempt): Promise<void> {
  await setDoc(doc(attemptsCollection(uid), attempt.id), attempt);
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
  const attemptsQuery = query(
    attemptsCollection(uid),
    orderBy('completedAt', 'desc'),
    limitTo(MAX_ATTEMPTS_LOADED)
  );
  return onSnapshot(
    attemptsQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => d.data() as Attempt)),
    (error) => onError?.(error)
  );
}
