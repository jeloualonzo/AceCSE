import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type AuthMode = 'signin' | 'signup' | 'reset';

function errorMessage(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null; // user changed their mind — not an error worth showing
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for this project yet.';
    case 'auth/invalid-email':
      return 'That email address does not look valid.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment, then try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead — if you normally use Google, sign in with Google and add a password from Settings.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/** Official Google "G" mark for the sign-in button. */
const GoogleMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

const inputClasses =
  'w-full min-h-[46px] px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-colors';

const labelClasses = 'block text-xs font-semibold text-slate-600 mb-1.5 text-left';

const MODE_COPY: Record<AuthMode, { title: string; subtitle: string; docTitle: string }> = {
  signin: {
    title: 'Sign in to continue',
    subtitle: 'Your simulations, practice sessions, and history stay saved to your account.',
    docTitle: 'Sign in',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Free forever. Your progress follows you on any device.',
    docTitle: 'Create account',
  },
  reset: {
    title: 'Reset your password',
    subtitle: 'Enter your email and we will send you a reset link.',
    docTitle: 'Reset password',
  },
};

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  useDocumentTitle(MODE_COPY[mode].docTitle);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
  };

  // On success, the auth state updates and the RedirectWhenAuthed guard
  // forwards to the destination (preserving any `from` deep link) — no
  // manual navigation needed here.
  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else if (mode === 'signup') {
        await signUpWithEmail(name, email.trim(), password);
      } else {
        try {
          await resetPassword(email.trim());
        } catch (err) {
          // Do not reveal whether an account exists; only surface real
          // input/infra problems.
          const code = (err as { code?: string })?.code ?? '';
          if (code !== 'auth/user-not-found') throw err;
        }
        setNotice(`If an account exists for ${email.trim()}, a password reset link is on its way.`);
        setBusy(false);
        return;
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const copy = MODE_COPY[mode];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Centered brand above the card */}
          <Link
            to="/"
            className="flex flex-col items-center gap-3 mb-8 focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-4 rounded-xl"
            aria-label="AceCSE home"
          >
            <BrandMark className="w-14 h-14" />
            <span className="text-2xl font-extrabold tracking-tight">
              Ace<span className="text-emerald-600">CSE</span>
            </span>
          </Link>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8 text-center">
            <h1 className="text-xl font-extrabold text-slate-900 mb-2">{copy.title}</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">{copy.subtitle}</p>

            {mode !== 'reset' && (
              <>
                <button
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-3 min-h-[48px] rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-sm font-semibold transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <GoogleMark />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-5" aria-hidden="true">
                  <span className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    or
                  </span>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className={labelClasses}>
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClasses}
                    placeholder="Juan dela Cruz"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className={labelClasses}>
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="you@example.com"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-xs font-semibold text-slate-600">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer focus:outline-none focus-visible:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClasses}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm" className={labelClasses}>
                    Confirm Password
                  </label>
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClasses}
                    placeholder="Repeat your password"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              >
                {busy
                  ? 'Working…'
                  : mode === 'signin'
                    ? 'Sign In'
                    : mode === 'signup'
                      ? 'Create Account'
                      : 'Send Reset Link'}
              </button>
            </form>

            {error && (
              <p
                className="mt-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-left"
                role="alert"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                className="mt-4 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-left"
                role="status"
              >
                {notice}
              </p>
            )}

            <p className="mt-6 text-xs text-slate-500">
              {mode === 'signin' && (
                <>
                  New to AceCSE?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer focus:outline-none focus-visible:underline"
                  >
                    Create an account
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('signin')}
                    className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer focus:outline-none focus-visible:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === 'reset' && (
                <button
                  onClick={() => switchMode('signin')}
                  className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer focus:outline-none focus-visible:underline"
                >
                  Back to sign in
                </button>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
