import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
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
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
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
    () => ({ user, initializing, signingOut, signInWithGoogle, signOutUser }),
    [user, initializing, signingOut, signInWithGoogle, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
