import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AppBottomNav } from './AppBottomNav';
import type { ExamLevel } from '@/types';

/**
 * AceCSE currently ships as a Subprofessional reviewer. The Professional
 * level remains fully supported by the engine and data model; when it
 * launches, this becomes a user preference again.
 */
export const ACTIVE_EXAM_LEVEL: ExamLevel = 'Subprofessional';

export interface AppOutletContext {
  examLevel: ExamLevel;
}

export function useAppContext(): AppOutletContext {
  return useOutletContext<AppOutletContext>();
}

/** Authenticated shell: header, sidebar, bottom nav, and the routed page. */
export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <AppHeader />
      <div className="flex-1 flex">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
          <Outlet context={{ examLevel: ACTIVE_EXAM_LEVEL } satisfies AppOutletContext} />
        </main>
      </div>
      <AppBottomNav />
    </div>
  );
};
