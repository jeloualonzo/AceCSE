import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  /**
   * True from the moment sign-out is requested until the auth state clears.
   * Guest-only routes use this to render immediately during the transition
   * instead of bouncing the user back into the app for a few frames.
   */
  signingOut: boolean;
  /** Whether the signed-in user already has an email/password credential. */
  hasPasswordProvider: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /**
   * Provider linking: attach an email/password credential to the CURRENT
   * Firebase account (e.g. an existing Google user adding a password login).
   * Both providers then sign in to the same uid — history is preserved.
   */
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function userHasPasswordProvider(user: User | null): boolean {
  return !!user?.providerData.some((p) => p.providerId === 'password');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setHasPasswordProvider(userHasPasswordProvider(nextUser));
      setInitializing(false);
      if (nextUser) {
        // Fire-and-forget; profile creation must never block the UI.
        void ensureProfile(nextUser).catch(() => undefined);
      } else {
        setSigningOut(false);
      }
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const trimmed = name.trim();
    if (trimmed) {
      await updateProfile(credential.user, { displayName: trimmed });
      // onAuthStateChanged already fired before the display name landed —
      // refresh the profile document so it carries the name.
      void ensureProfile(credential.user).catch(() => undefined);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const linkEmailPassword = useCallback(async (email: string, password: string) => {
    if (!auth.currentUser) throw new Error('No signed-in user to link.');
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(auth.currentUser, credential);
    setHasPasswordProvider(userHasPasswordProvider(auth.currentUser));
  }, []);

  const signOutUser = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch (error) {
      setSigningOut(false);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      signingOut,
      hasPasswordProvider,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      linkEmailPassword,
      signOutUser,
    }),
    [
      user,
      initializing,
      signingOut,
      hasPasswordProvider,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      linkEmailPassword,
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
