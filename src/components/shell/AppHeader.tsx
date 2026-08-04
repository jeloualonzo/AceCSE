import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function initialsFor(displayName: string | null, email: string | null): string {
  const source = displayName?.trim() || email?.trim() || '';
  if (!source) return '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export const AppHeader: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  const displayName = user?.displayName || user?.email || 'Account';

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    await signOutUser();
    navigate('/', { replace: true });
  };

  const avatar = user?.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
      {initialsFor(user?.displayName ?? null, user?.email ?? null)}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      <Link
        to="/app/dashboard"
        className="flex items-center gap-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 rounded-lg"
        aria-label="AceCSE dashboard"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
        </div>
        <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          Ace<span className="text-emerald-600">CSE</span>
        </span>
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsProfileOpen((open) => !open)}
          className="flex items-center gap-2.5 px-2 py-1.5 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
          aria-expanded={isProfileOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          {avatar}
          <span className="hidden sm:inline text-xs font-bold text-slate-900 leading-none max-w-[160px] truncate">
            {displayName}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isProfileOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50"
          >
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
              {user?.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
            </div>

            <button
              role="menuitem"
              onClick={() => {
                setIsProfileOpen(false);
                navigate('/app/settings');
              }}
              className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:bg-slate-100"
            >
              <Settings className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Settings</span>
            </button>

            <button
              role="menuitem"
              onClick={handleSignOut}
              className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:bg-slate-100"
            >
              <LogOut className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
