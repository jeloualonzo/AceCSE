import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import type { FeedbackCategory } from './feedback';

/**
 * Firestore-touching implementation, reached only via the dynamic import in
 * `feedback.ts` so the Firestore SDK stays out of the initial bundle.
 *
 * Documents land in the top-level `feedback` collection (create-only for
 * signed-in users; see firestore.rules).
 */
export async function submitFeedback(input: {
  uid: string;
  email: string | null;
  category: FeedbackCategory;
  message: string;
}): Promise<void> {
  await addDoc(collection(db, 'feedback'), {
    uid: input.uid,
    email: input.email,
    category: input.category,
    message: input.message,
    createdAt: serverTimestamp(),
    appVersion: __APP_VERSION__,
  });
}
