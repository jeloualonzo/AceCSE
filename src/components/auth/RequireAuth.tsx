import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/** Route guard: unauthenticated visitors are sent to the auth flow. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
