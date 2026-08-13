import React, { useState } from 'react';
import { KeyRound, LogOut, MessageSquare, Monitor, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ExamLevel } from '@/types';
import { EXAM_BLUEPRINT, SUBJECTS_BY_LEVEL } from '@/config/exam';
import { formatDuration } from '@/lib/time';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { useAppContext } from '@/components/shell/AppLayout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  submitFeedback,
  type FeedbackCategory,
} from '@/services/feedback';

const EXAM_LEVELS: ExamLevel[] = ['Subprofessional', 'Professional'];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

const fieldClasses =
  'w-full min-h-[44px] px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-colors';

function linkErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/requires-recent-login':
      return 'For security, sign out and sign back in, then add your password right away.';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'That email is already used by another account.';
    case 'auth/provider-already-linked':
      return 'This account already has a password sign-in.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    default:
      return 'Could not add the password sign-in. Please try again.';
  }
}

/**
 * Provider linking: lets a Google-only account add an email/password
 * credential to the SAME Firebase user, so both methods sign in to the
 * same history.
 */
const LinkPasswordForm: React.FC = () => {
  const { user, hasPasswordProvider, linkEmailPassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user) return null;

  if (hasPasswordProvider) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Email &amp; password sign-in is enabled for this account.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2" role="status">
        Password added. You can now sign in with {user.email} and your password, or with Google —
        both reach this same account.
      </p>
    );
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          Add email &amp; password sign-in
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Adds a password to this same account — your history stays in one place.
        </p>
      </div>
    );
  }

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!user.email) {
      setError('This account has no email address to attach a password to.');
      return;
    }
    setBusy(true);
    try {
      await linkEmailPassword(user.email, password);
      setDone(true);
    } catch (err) {
      setError(linkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleLink} className="space-y-3 max-w-sm">
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Email</label>
        <input type="email" value={user.email ?? ''} readOnly disabled className={`${fieldClasses} opacity-70`} />
      </div>
      <div>
        <label htmlFor="link-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Password
        </label>
        <input
          id="link-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={fieldClasses}
          placeholder="At least 6 characters"
        />
      </div>
      <div>
        <label htmlFor="link-confirm" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Confirm Password
        </label>
        <input
          id="link-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className={fieldClasses}
          placeholder="Repeat your password"
        />
      </div>
      {error && (
        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {busy ? 'Adding…' : 'Add Password'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[44px] px-4 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

/** Feedback → Firestore `feedback` collection (create-only). */
const FeedbackSection: React.FC = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const canSubmit = message.trim().length > 0 && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setBusy(true);
    setStatus('idle');
    try {
      await submitFeedback({
        uid: user.uid,
        email: user.email ?? null,
        category,
        message: message.trim().slice(0, FEEDBACK_MESSAGE_MAX),
      });
      setMessage('');
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6" aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
        Feedback
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Help improve AceCSE by reporting bugs or suggesting new features.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Category</legend>
          <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Feedback category">
            {FEEDBACK_CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={category === id}
                onClick={() => setCategory(id)}
                className={`min-h-[40px] px-3.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  category === id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="feedback-message" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Message
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={FEEDBACK_MESSAGE_MAX}
            className={`${fieldClasses} py-2.5 resize-y min-h-[110px]`}
            placeholder={
              category === 'bug'
                ? 'What happened, and what did you expect instead?'
                : category === 'feature'
                  ? 'What would you like AceCSE to do?'
                  : 'Tell us what is on your mind.'
            }
          />
        </div>

        {status === 'sent' && (
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2" role="status">
            Thank you — your feedback was sent.
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-lg px-3 py-2" role="alert">
            Could not send your feedback. Check your connection and try again.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          {busy ? 'Sending…' : 'Submit Feedback'}
        </button>
      </form>
    </section>
  );
};

export const SettingsPage: React.FC = () => {
  useDocumentTitle('Settings');
  const { user, signOutUser } = useAuth();
  const { mode, setMode } = useTheme();
  const { examLevel, setExamLevel } = useAppContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    // signOutUser flips the `signingOut` flag synchronously, so the guest-only
    // landing page renders immediately instead of bouncing back into the app.
    const signedOut = signOutUser();
    navigate('/', { replace: true });
    await signedOut.catch(() => undefined);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Settings</h1>

      {/* Profile — from the Google account */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Profile
        </h2>
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-lg flex items-center justify-center border border-emerald-200 dark:border-emerald-700 shrink-0">
              {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-white truncate">
              {user?.displayName || 'Your account'}
            </p>
            {user?.email && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Signed in with{' '}
              {user?.providerData.some((p) => p.providerId === 'google.com')
                ? user.providerData.some((p) => p.providerId === 'password')
                  ? 'Google or email & password'
                  : 'Google'
                : 'email & password'}
            </p>
          </div>
        </div>
      </section>

      {/* Exam level */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6" aria-labelledby="exam-heading">
        <h2 id="exam-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Examination
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Default examination level">
          {EXAM_LEVELS.map((level) => {
            const isActive = examLevel === level;
            const blueprint = EXAM_BLUEPRINT[level];
            return (
              <button
                key={level}
                role="radio"
                aria-checked={isActive}
                onClick={() => setExamLevel(level)}
                className={`text-left rounded-xl border p-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/30 border-2'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{level} Level</span>
                  {isActive && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {blueprint.totalItems} items in {formatDuration(blueprint.durationMinutes * 60)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  {SUBJECTS_BY_LEVEL[level].join(', ')}
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          This sets your DEFAULT level only, as a convenience. Both levels are always available —
          you can switch levels directly on the Dashboard, Simulation, and Practice pages before
          starting any activity, and a session that has already started keeps its own level.
        </p>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map(({ mode: option, label, icon: Icon }) => (
            <button
              key={option}
              role="radio"
              aria-checked={mode === option}
              onClick={() => setMode(option)}
              className={`flex flex-col items-center gap-1.5 min-h-[64px] justify-center rounded-lg border text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                mode === option
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          System follows your device preference. Your choice is saved on this device.
        </p>
      </section>

      {/* Feedback */}
      <FeedbackSection />

      {/* Account */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Account
        </h2>
        <LinkPasswordForm />
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign out
        </button>
      </section>
    </div>
  );
};
