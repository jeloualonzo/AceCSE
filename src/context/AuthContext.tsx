import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  getIdTokenResult,
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
import { isAdminClaim } from '@/lib/adminClaim';
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
  /**
   * Whether the signed-in user's ID token carries the `admin` custom claim.
   *
   * Read from the signed token, never from client state — see
   * `src/lib/adminClaim.ts`. This gates admin UI only; `firestore.rules` checks
   * the same claim on the same token, so a client that lies about this gets
   * every admin write rejected anyway.
   */
  isAdmin: boolean;
  /**
   * False while the claim is still being read off the token. Guards must wait
   * rather than treat "not yet known" as "not an admin", which would bounce a
   * real admin on every page load.
   */
  adminResolved: boolean;
  /**
   * Force-refreshes the ID token and re-reads the claim, returning the result.
   * Needed because a claim minted after sign-in does not appear until the token
   * is refreshed — this is what the "Check again" action calls.
   */
  refreshAdminClaim: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /**
   * Which sign-in methods exist for an email (e.g. ['google.com'],
   * ['password']). Returns [] when unknown — including on projects with
   * email-enumeration protection enabled, where Firebase intentionally
   * hides this. Callers must treat [] as "undetermined", never "no account".
   */
  getSignInMethods: (email: string) => Promise<string[]>;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminResolved, setAdminResolved] = useState(false);

  /**
   * Reads the claim off `target`'s ID token and applies it, unless a different
   * user has signed in while the read was in flight — a stale resolution must
   * never grant or revoke admin for whoever is signed in now.
   */
  const resolveAdminClaim = useCallback(async (target: User, forceRefresh = false): Promise<boolean> => {
    let granted = false;
    try {
      granted = isAdminClaim((await getIdTokenResult(target, forceRefresh)).claims);
    } catch {
      // Fail closed: a token that cannot be read is not an admin token.
      granted = false;
    }
    if (auth.currentUser?.uid !== target.uid) return granted;
    setIsAdmin(granted);
    setAdminResolved(true);
    return granted;
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setHasPasswordProvider(userHasPasswordProvider(nextUser));
      setInitializing(false);
      // Every auth change invalidates the previous answer. Signed out resolves
      // immediately (nobody is an admin); signed in stays unresolved until the
      // token is actually read.
      setIsAdmin(false);
      setAdminResolved(!nextUser);
      if (nextUser) {
        // Fire-and-forget; profile creation must never block the UI.
        void ensureProfile(nextUser).catch(() => undefined);
        void resolveAdminClaim(nextUser);
      } else {
        setSigningOut(false);
      }
    });
  }, [resolveAdminClaim]);

  const refreshAdminClaim = useCallback(async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) {
      setIsAdmin(false);
      setAdminResolved(true);
      return false;
    }
    // Deliberately does not clear `adminResolved`: the previous answer stays on
    // screen until a fresher one replaces it, so a manual re-check does not
    // unmount the page the admin is looking at.
    return resolveAdminClaim(current, true);
  }, [resolveAdminClaim]);

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

  const getSignInMethods = useCallback(async (email: string): Promise<string[]> => {
    try {
      return await fetchSignInMethodsForEmail(auth, email);
    } catch {
      return [];
    }
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
      isAdmin,
      adminResolved,
      refreshAdminClaim,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      getSignInMethods,
      linkEmailPassword,
      signOutUser,
    }),
    [
      user,
      initializing,
      signingOut,
      hasPasswordProvider,
      isAdmin,
      adminResolved,
      refreshAdminClaim,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      getSignInMethods,
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
