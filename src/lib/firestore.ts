import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { app } from './firebase';

/**
 * Firestore with offline persistence: attempt history reads work offline and
 * writes queue until connectivity returns.
 *
 * IMPORTANT: never import this module statically from application code — the
 * Firestore SDK is by far the heaviest dependency in the app. It is reached
 * only through the dynamic imports in `src/services/*`, so the browser
 * downloads it after first paint (and never on the public landing page).
 */

const databaseId = (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || undefined;

export const db = initializeFirestore(
  app,
  { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
  databaseId
);
