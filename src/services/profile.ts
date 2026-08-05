import type { User } from 'firebase/auth';
import type { ExamLevel } from '@/types';

/**
 * Profile persistence facade. The Firestore SDK is loaded on first use via
 * dynamic import (see `profileImpl.ts`), keeping it off the critical path.
 */

const impl = () => import('./profileImpl');

/** Create the profile document on first sign-in; refresh identity fields after. */
export async function ensureProfile(user: User): Promise<void> {
  await (await impl()).ensureProfile(user);
}

/** The account's saved examination level, or null when unset/invalid. */
export async function fetchPreferredExamLevel(uid: string): Promise<ExamLevel | null> {
  return (await impl()).fetchPreferredExamLevel(uid);
}

/** Persist the examination level to the account profile. */
export async function savePreferredExamLevel(uid: string, level: ExamLevel): Promise<void> {
  await (await impl()).savePreferredExamLevel(uid, level);
}
