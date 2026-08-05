import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Firebase app + Auth only. Firestore is intentionally NOT initialized here —
 * it lives in `src/lib/firestore.ts`, which is only ever loaded via dynamic
 * import (see `src/services/*`). That keeps the large Firestore SDK out of
 * the critical path: the landing/auth pages need auth state, not a database.
 */

function requiredEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Copy .env.example to .env.local and fill in your Firebase web config.`
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requiredEnv('VITE_FIREBASE_APP_ID'),
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
