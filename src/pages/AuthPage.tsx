import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
      return 'Google sign-in is not enabled for this project yet.';
    default:
      return 'Sign-in failed. Please try again.';
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

export const AuthPage: React.FC = () => {
  const { user, initializing, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/app/dashboard';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initializing && user) navigate(destination, { replace: true });
  }, [initializing, user, navigate, destination]);

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="h-16 px-4 sm:px-6 flex items-center">
        <Link
          to="/"
          className="flex items-center gap-2.5 focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 rounded-lg"
          aria-label="AceCSE home"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-4.5 h-4.5 stroke-[2.2]" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Ace<span className="text-emerald-600">CSE</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8 text-center">
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">Sign in to AceCSE</h1>
          <p className="text-sm text-slate-500 mb-7 leading-relaxed">
            Your simulations, practice sessions, and history stay saved to your account.
          </p>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-3 min-h-[52px] rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-sm sm:text-base font-semibold transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <GoogleMark />
            {busy ? 'Signing in…' : 'Continue with Google'}
          </button>

          {error && (
            <p
              className="mt-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-left"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};
