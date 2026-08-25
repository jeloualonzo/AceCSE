import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AppBottomNav } from './AppBottomNav';

/**
 * The learner shell: header, sidebar, bottom nav, and the routed page.
 *
 * Learner-only by construction — no admin surface is reachable from here, and
 * every Practice/Simulation run started inside this shell is a real learner
 * attempt.
 *
 * The shell holds no examination level. Both examinations are always on the
 * page; the level is fixed by the individual session a learner starts, not by
 * anything stored here.
 */
export const AppLayout: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
    <AppHeader />
    <div className="flex-1 flex">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
    <AppBottomNav />
  </div>
);
