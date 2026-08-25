import type { User } from 'firebase/auth';

/**
 * Profile persistence facade. The Firestore SDK is loaded on first use via
 * dynamic import (see `profileImpl.ts`), keeping it off the critical path.
 */

const impl = () => import('./profileImpl');

/** Create the profile document on first sign-in; refresh identity fields after. */
export async function ensureProfile(user: User): Promise<void> {
  await (await impl()).ensureProfile(user);
}
