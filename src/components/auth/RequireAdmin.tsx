import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { LEARNER_HOME_ROUTE } from '@/navigation/appRoutes';

interface RequireAdminProps {
  children: React.ReactNode;
  /**
   * Where an unauthenticated visitor is sent. The admin tree points this at the
   * dedicated admin sign-in so a bookmarked `/admin/...` URL never drops someone
   * into the learner sign-up flow.
   */
  signInPath?: string;
}

/**
 * Route guard for the admin app.
 *
 * Three-way decision, in this order: not signed in → the sign-in flow; claim not
 * read yet → wait; claim absent → an honest "no access" screen. The middle case
 * matters — treating "not yet known" as "not an admin" would bounce a real admin
 * on every reload.
 *
 * This is a UI gate, not the security boundary. The boundary is
 * `firestore.rules`, which checks the same `admin` claim on the same signed
 * token, so nothing here has to be trusted for the data to be safe.
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({ children, signInPath = '/auth' }) => {
  const { user, initializing, isAdmin, adminResolved } = useAuth();
  const location = useLocation();

  if (initializing || (user && !adminResolved)) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return <>{children}</>;
};

const AdminAccessDenied: React.FC = () => {
  const { refreshAdminClaim, user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const recheck = async () => {
    setChecking(true);
    setChecked(false);
    try {
      // A claim minted after this session signed in only appears once the ID
      // token is refreshed, so this is the supported way to pick it up without
      // signing out and back in.
      await refreshAdminClaim();
      setChecked(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-slate-900 dark:text-slate-100">Admin access required</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          The AceCSE admin app is limited to accounts that carry the admin claim. Your practice
          history, simulations, and settings are unaffected.
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Signed in as</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{user?.email ?? user?.uid ?? 'Unknown account'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Granting access</dt>
            <dd className="text-slate-700 dark:text-slate-300">
              An existing admin runs <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">npm run admin:grant</code>{' '}
              for this account, then you re-check below. See docs/admin/ADMIN_ACCESS.md.
            </dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={recheck}
            disabled={checking}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check again'}
          </button>
          <Link
            to={LEARNER_HOME_ROUTE}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
        {checked ? (
          <p role="status" className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Still no admin claim on this account&apos;s token.
          </p>
        ) : null}
      </div>
    </main>
  );
};
