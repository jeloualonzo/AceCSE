import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AppBottomNav } from './AppBottomNav';
import type { ExamLevel } from '@/types';
import { useExamLevel } from '@/hooks/useExamLevel';

export interface AppOutletContext {
  /** The active examination level; every page derives its view from this. */
  examLevel: ExamLevel;
  /** Switch levels (persists locally and to the account profile). */
  setExamLevel: (level: ExamLevel) => void;
}

export function useAppContext(): AppOutletContext {
  return useOutletContext<AppOutletContext>();
}

/** Authenticated shell: header, sidebar, bottom nav, and the routed page. */
export const AppLayout: React.FC = () => {
  const { examLevel, setExamLevel } = useExamLevel();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      <AppHeader />
      <div className="flex-1 flex">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
          <Outlet context={{ examLevel, setExamLevel } satisfies AppOutletContext} />
        </main>
      </div>
      <AppBottomNav />
    </div>
  );
};
