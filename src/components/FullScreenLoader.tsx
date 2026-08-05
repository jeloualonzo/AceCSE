import React from 'react';

/** Shared full-viewport loading state: route transitions, auth resolution, chunk loads. */
export const FullScreenLoader: React.FC = () => (
  <div
    className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"
    role="status"
    aria-label="Loading"
  >
    <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-emerald-600 animate-spin" />
  </div>
);
