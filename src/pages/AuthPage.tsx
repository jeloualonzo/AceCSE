import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type AuthView = 'signin' | 'signup' | 'reset';

function firebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'That email is already registered — sign in instead.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for this project yet.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export const AuthPage: React.FC = () => {
  const { user, initializing, continueAsGuest, signInWithEmail, signUpWithEmail, resetPassword } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/app/dashboard';

  const [view, setView] = useState<AuthView>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'guest' | 'form' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!initializing && user) navigate(destination, { replace: true });
  }, [initializing, user, navigate, destination]);

  const handleGuest = async () => {
    setError(null);
    setBusy('guest');
    try {
      await continueAsGuest();
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setBusy(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy('form');
    try {
      if (view === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else if (view === 'signup') {
        await signUpWithEmail(name, email.trim(), password);
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
        setBusy(null);
        return;
      }
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setBusy(null);
    }
  };

  const switchView = (next: AuthView) => {
    setView(next);
    setError(null);
    setResetSent(false);
  };

  const inputClass =
    'w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

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
        <div className="w-full max-w-md space-y-5">
          {/* Guest fast path */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
              Start practicing in seconds
            </h1>
            <p className="text-sm text-slate-500 mb-5">
              No signup required. Your progress is saved to a guest account you can make permanent
              anytime.
            </p>
            <button
              onClick={handleGuest}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm sm:text-base font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            >
              <UserRound className="w-5 h-5" aria-hidden="true" />
              {busy === 'guest' ? 'Starting…' : 'Continue as Guest'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Email auth */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <div className="flex items-center gap-1.5 mb-5" role="tablist" aria-label="Authentication options">
              <button
                role="tab"
                aria-selected={view === 'signin'}
                onClick={() => switchView('signin')}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  view === 'signin' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sign In
              </button>
              <button
                role="tab"
                aria-selected={view === 'signup'}
                onClick={() => switchView('signup')}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  view === 'signup' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Create Account
              </button>
            </div>

            {view === 'reset' && resetSent ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-700" role="status">
                  If an account exists for <strong>{email}</strong>, a password reset link is on
                  its way.
                </p>
                <button
                  onClick={() => switchView('signin')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer focus:outline-none focus-visible:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {view === 'signup' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      maxLength={60}
                      className={inputClass}
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                {view !== 'reset' && (
                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={view === 'signup' ? 'At least 6 characters' : 'Your password'}
                      className={inputClass}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy !== null}
                  className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                >
                  {busy === 'form'
                    ? 'Please wait…'
                    : view === 'signin'
                      ? 'Sign In'
                      : view === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Link'}
                </button>

                {view === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchView('reset')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer focus:outline-none focus-visible:underline"
                  >
                    <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                    Forgot password?
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
