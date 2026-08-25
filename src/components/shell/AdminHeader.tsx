import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, LogOut, Menu, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_BASE, LEARNER_HOME_ROUTE } from '@/navigation/appRoutes';

/** Id of the mobile nav panel `AdminLayout` renders, for `aria-controls`. */
export const ADMIN_MOBILE_NAV_ID = 'admin-mobile-nav';

function initialsFor(displayName: string | null, email: string | null): string {
  const source = displayName?.trim() || email?.trim() || '';
  if (!source) return '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

interface AdminHeaderProps {
  isNavOpen: boolean;
  onToggleNav: () => void;
}

/**
 * Admin header. Its own component rather than a variant of `AppHeader`, because
 * the two headers lead to different places: this one is rooted at the admin
 * overview and offers the deliberate crossing into the learner app.
 *
 * Same surfaces as the learner header — white, slate borders, emerald accent.
 * What marks this as the admin app is the Admin badge beside the brand and the
 * navigation underneath, not a darker skin.
 */
export const AdminHeader: React.FC<AdminHeaderProps> = ({ isNavOpen, onToggleNav }) => {
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

  const displayName = user?.displayName || user?.email || 'Admin account';

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    // signOutUser flips the `signingOut` flag synchronously, so the guest-only
    // landing page renders immediately instead of bouncing back into the app.
    const signedOut = signOutUser();
    navigate('/', { replace: true });
    await signedOut.catch(() => undefined);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleNav}
          aria-expanded={isNavOpen}
          aria-controls={ADMIN_MOBILE_NAV_ID}
          aria-label="Admin navigation"
          className="-ml-1 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 md:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {isNavOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <Link
          to={ADMIN_BASE}
          className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
          aria-label="AceCSE admin overview"
        >
          <BrandMark className="h-9 w-9 shrink-0" />
          <span className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
            Ace<span className="text-emerald-600 dark:text-emerald-400">CSE</span>
          </span>
          <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            Admin
          </span>
        </Link>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setIsProfileOpen((open) => !open)}
          className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          aria-expanded={isProfileOpen}
          aria-haspopup="menu"
          aria-label="Admin account menu"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-xs font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            {initialsFor(user?.displayName ?? null, user?.email ?? null)}
          </span>
          <span className="hidden max-w-[160px] truncate text-xs font-bold leading-none text-slate-900 sm:inline dark:text-white">
            {displayName}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${isProfileOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isProfileOpen && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{displayName}</p>
              {user?.email && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              )}
            </div>

            <button
              role="menuitem"
              onClick={() => {
                setIsProfileOpen(false);
                navigate(LEARNER_HOME_ROUTE);
              }}
              className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
            >
              <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>View Learner App</span>
            </button>

            <button
              role="menuitem"
              onClick={handleSignOut}
              className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
            >
              <LogOut className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
