import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firestore';
import type { ExamLevel, UserProfile } from '@/types';

/**
 * Firestore-touching implementation, reached only via the dynamic imports in
 * `profile.ts` so the Firestore SDK stays out of the initial bundle.
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
    preferredExamLevel: 'Subprofessional',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProfileFields(
  uid: string,
  fields: Partial<Pick<UserProfile, 'displayName' | 'preferredExamLevel'>>
): Promise<void> {
  await setDoc(profileRef(uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true });
}

export async function savePreferredExamLevel(uid: string, level: ExamLevel): Promise<void> {
  await updateProfileFields(uid, { preferredExamLevel: level });
}
