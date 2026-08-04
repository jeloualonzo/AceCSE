import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Settings</h1>

      {/* Profile — from the Google account */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Profile
        </h2>
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center border border-emerald-200 shrink-0">
              {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 truncate">
              {user?.displayName || 'Your account'}
            </p>
            {user?.email && <p className="text-sm text-slate-500 truncate">{user.email}</p>}
            <p className="text-xs text-slate-400 mt-0.5">Signed in with Google</p>
          </div>
        </div>
      </section>

      {/* Exam level */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6" aria-labelledby="exam-heading">
        <h2 id="exam-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Examination
        </h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Subprofessional Level</p>
            <p className="text-xs text-slate-500 mt-0.5">
              AceCSE currently covers the Subprofessional examination. Professional level support
              is on the roadmap.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0">
            Active
          </span>
        </div>
      </section>

      {/* Account */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Account
        </h2>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign out
        </button>
      </section>
    </div>
  );
};
