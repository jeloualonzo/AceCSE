import {
  collection,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firestore';
import type { Attempt } from '@/types';

/**
 * Firestore-touching implementation, reached only via the dynamic imports in
 * `attempts.ts` so the Firestore SDK stays out of the initial bundle.
 */

const MAX_ATTEMPTS_LOADED = 200;

function attemptsCollection(uid: string) {
  return collection(db, 'users', uid, 'attempts');
}

export async function saveAttempt(uid: string, attempt: Attempt): Promise<void> {
  await setDoc(doc(attemptsCollection(uid), attempt.id), attempt);
}

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
