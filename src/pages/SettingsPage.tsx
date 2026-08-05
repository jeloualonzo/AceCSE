import React from 'react';
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ExamLevel } from '@/types';
import { EXAM_BLUEPRINT, SUBJECTS_BY_LEVEL } from '@/config/exam';
import { formatDuration } from '@/lib/time';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { useAppContext } from '@/components/shell/AppLayout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const EXAM_LEVELS: ExamLevel[] = ['Subprofessional', 'Professional'];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

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
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Signed in with Google</p>
          </div>
        </div>
      </section>

      {/* Exam level */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6" aria-labelledby="exam-heading">
        <h2 id="exam-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Examination
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Examination level">
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
          Simulation blueprints, practice subjects, and your dashboard follow the level you select.
          Your choice is saved to your account.
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

      {/* Account */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Account
        </h2>
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
