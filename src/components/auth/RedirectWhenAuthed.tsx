import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';

/**
 * Guest-only route guard for the landing and auth pages. A signed-in user is
 * taken straight into the app — visiting `/`, pressing browser Back into the
 * marketing page, or opening `/auth` while authenticated all land on the
 * dashboard (or the protected page they were originally heading to).
 *
 * During sign-out (`signingOut`) the guarded page renders immediately, so the
 * transition ends on the landing page without bouncing through the app shell.
 */
export const RedirectWhenAuthed: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing, signingOut } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <FullScreenLoader />;
  }

  if (user && !signingOut) {
    const from = (location.state as { from?: string } | null)?.from;
    const destination = from && from.startsWith('/app') ? from : '/app/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
