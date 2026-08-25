import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { ADMIN_BASE, LEARNER_HOME_ROUTE, isReturnableAppPath } from '@/navigation/appRoutes';

interface RedirectWhenAuthedProps {
  children: React.ReactNode;
  /**
   * Where to land when there is no `from` deep link. Defaults to role-aware:
   * admins get the admin app, learners get the learner dashboard. The admin
   * sign-in page passes `ADMIN_BASE` so an admin signing in there never lands in
   * the learner shell.
   */
  fallback?: string;
}

/**
 * Guest-only route guard for the landing, auth, and admin sign-in pages. A
 * signed-in user is taken straight into the app they belong to — visiting `/`,
 * pressing browser Back into the marketing page, or opening `/auth` while
 * authenticated all land on the right dashboard (or the protected page they were
 * originally heading to).
 *
 * The wait on `adminResolved` is the important part: the role decides the
 * destination, so redirecting before the claim is read would send every admin to
 * the learner dashboard on a cold load. "Not yet known" is not "not an admin".
 *
 * During sign-out (`signingOut`) the guarded page renders immediately, so the
 * transition ends on the landing page without bouncing through the app shell.
 */
export const RedirectWhenAuthed: React.FC<RedirectWhenAuthedProps> = ({ children, fallback }) => {
  const { user, initializing, signingOut, isAdmin, adminResolved } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <FullScreenLoader />;
  }

  if (user && !signingOut) {
    if (!adminResolved) {
      return <FullScreenLoader />;
    }
    const from = (location.state as { from?: string } | null)?.from;
    const home = fallback ?? (isAdmin ? ADMIN_BASE : LEARNER_HOME_ROUTE);
    // An admin deep link is only honored for an actual admin; anyone else lands
    // on their own home rather than on a screen that would deny them.
    const honorFrom =
      isReturnableAppPath(from) && (isAdmin || !from.startsWith(ADMIN_BASE)) ? from : null;
    return <Navigate to={honorFrom ?? home} replace />;
  }

  return <>{children}</>;
};
