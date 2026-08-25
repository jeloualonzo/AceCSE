import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firestore';

/**
 * Firestore-touching implementation, reached only via the dynamic imports in
 * `profile.ts` so the Firestore SDK stays out of the initial bundle.
 *
 * The profile stores identity only. It holds no examination level: both
 * examinations are always available to every account, and the level of a run is
 * recorded on the attempt it belongs to.
 */

function profileRef(uid: string) {
  return doc(db, 'users', uid);
}

/** Create the profile document on first sign-in; refresh identity fields after. */
export async function ensureProfile(user: User): Promise<void> {
  const ref = profileRef(user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    await setDoc(
      ref,
      {
        displayName: user.displayName ?? snapshot.get('displayName') ?? null,
        email: user.email ?? snapshot.get('email') ?? null,
        isAnonymous: user.isAnonymous,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }
  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    isAnonymous: user.isAnonymous,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
