import React, { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { KeyRound, LogOut, Save, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { updateProfileFields } from '@/services/profile';
import { useAppContext } from '@/components/shell/AppLayout';
import type { ExamLevel } from '@/types';

function firebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Sign out and sign in with it instead.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/credential-already-in-use':
      return 'That email is already linked to another account.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export const SettingsPage: React.FC = () => {
  const { user, signOutUser, linkGuestToEmail, resetPassword } = useAuth();
  const { examLevel, setExamLevel } = useAppContext();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [upgradeName, setUpgradeName] = useState('');
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgradeStatus, setUpgradeStatus] = useState<'idle' | 'busy' | 'done'>('idle');
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const [resetStatus, setResetStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const isGuest = user?.isAnonymous ?? true;

  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setNameStatus('saving');
    try {
      await updateProfile(user, { displayName: displayName.trim() || null });
      await updateProfileFields(user.uid, { displayName: displayName.trim() || null });
      setNameStatus('saved');
      setTimeout(() => setNameStatus('idle'), 2500);
    } catch {
      setNameStatus('error');
    }
  };

  const handleUpgrade = async (event: React.FormEvent) => {
    event.preventDefault();
    setUpgradeError(null);
    setUpgradeStatus('busy');
    try {
      await linkGuestToEmail(upgradeName, upgradeEmail.trim(), upgradePassword);
      setUpgradeStatus('done');
    } catch (error) {
      setUpgradeStatus('idle');
      setUpgradeError(firebaseErrorMessage(error));
    }
  };

  const handleReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      setResetStatus('sent');
    } catch {
      setResetStatus('error');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/', { replace: true });
  };

  const inputClass =
    'w-full min-h-[44px] px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Account, preferences, and exam target.</p>
      </div>

      {/* Exam level */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3" aria-labelledby="level-heading">
        <h2 id="level-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Target Exam Level
        </h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Target exam level">
          {(['Professional', 'Subprofessional'] as ExamLevel[]).map((level) => (
            <button
              key={level}
              role="radio"
              aria-checked={examLevel === level}
              onClick={() => setExamLevel(level)}
              className={`min-h-[48px] rounded-lg border text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                examLevel === level
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Determines which subjects and simulations you see. Saved to your account.
        </p>
      </section>

      {/* Profile */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Profile
        </h2>
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label htmlFor="display-name" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className={inputClass}
            />
          </div>
          {!isGuest && (
            <div>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Email</span>
              <p className="text-sm text-slate-800">{user?.email}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={nameStatus === 'saving'}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {nameStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {nameStatus === 'saved' && (
              <span className="text-xs font-semibold text-emerald-700" role="status">
                Saved.
              </span>
            )}
            {nameStatus === 'error' && (
              <span className="text-xs font-semibold text-rose-700" role="alert">
                Could not save — try again.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Account */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Account
        </h2>

        {isGuest && upgradeStatus !== 'done' && (
          <form onSubmit={handleUpgrade} className="space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs sm:text-sm text-emerald-900 leading-relaxed">
              You are using a <strong>guest session</strong>. Create a permanent account to keep
              your history and settings if you clear this browser or switch devices — all existing
              data carries over.
            </div>
            <div>
              <label htmlFor="upgrade-name" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Name
              </label>
              <input
                id="upgrade-name"
                type="text"
                value={upgradeName}
                onChange={(e) => setUpgradeName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="upgrade-email" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email
              </label>
              <input
                id="upgrade-email"
                type="email"
                required
                value={upgradeEmail}
                onChange={(e) => setUpgradeEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="upgrade-password" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Password
              </label>
              <input
                id="upgrade-password"
                type="password"
                required
                minLength={6}
                value={upgradePassword}
                onChange={(e) => setUpgradePassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputClass}
              />
            </div>
            {upgradeError && (
              <p className="text-xs font-semibold text-rose-700" role="alert">
                {upgradeError}
              </p>
            )}
            <button
              type="submit"
              disabled={upgradeStatus === 'busy'}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              {upgradeStatus === 'busy' ? 'Creating account…' : 'Create Permanent Account'}
            </button>
          </form>
        )}

        {(upgradeStatus === 'done' || !isGuest) && !user?.isAnonymous && (
          <div className="space-y-3">
            {upgradeStatus === 'done' && (
              <p className="text-sm font-semibold text-emerald-700" role="status">
                Your account is now permanent. All data has been kept.
              </p>
            )}
            {user?.email && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  Send password reset email
                </button>
                {resetStatus === 'sent' && (
                  <span className="text-xs font-semibold text-emerald-700" role="status">
                    Reset email sent to {user.email}.
                  </span>
                )}
                {resetStatus === 'error' && (
                  <span className="text-xs font-semibold text-rose-700" role="alert">
                    Could not send the email — try again.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sign out
          </button>
          {isGuest && (
            <p className="text-xs text-slate-400 mt-1.5">
              Signing out of a guest session means you may not be able to return to this data.
              Create a permanent account first if you want to keep it.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
