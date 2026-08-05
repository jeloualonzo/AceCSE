import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';

/** Route guard: unauthenticated visitors are sent to the auth flow. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
