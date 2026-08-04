import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ensureProfile } from '@/services/profile';

interface AuthContextValue {
  user: User | null;
  /** True until the first auth state resolves — gate routing on this. */
  initializing: boolean;
  continueAsGuest: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Upgrade an anonymous account to a permanent email account, keeping all data. */
  linkGuestToEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
      if (nextUser) {
        // Fire-and-forget; profile creation must never block the UI.
        void ensureProfile(nextUser).catch(() => undefined);
      }
    });
  }, []);

  const continueAsGuest = useCallback(async () => {
    await signInAnonymously(auth);
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
    await ensureProfile(credential.user);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const linkGuestToEmail = useCallback(
    async (name: string, email: string, password: string) => {
      if (!auth.currentUser || !auth.currentUser.isAnonymous) {
        throw new Error('No guest session to upgrade.');
      }
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(auth.currentUser, credential);
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      await ensureProfile(result.user);
      // Refresh local state so isAnonymous/email reflect the upgrade.
      setUser(auth.currentUser);
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      continueAsGuest,
      signUpWithEmail,
      signInWithEmail,
      linkGuestToEmail,
      resetPassword,
      signOutUser,
    }),
    [
      user,
      initializing,
      continueAsGuest,
      signUpWithEmail,
      signInWithEmail,
      linkGuestToEmail,
      resetPassword,
      signOutUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
