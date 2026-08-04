import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AppBottomNav } from './AppBottomNav';
import { useAuth } from '@/context/AuthContext';
import { fetchProfile, savePreferredExamLevel } from '@/services/profile';
import type { ExamLevel } from '@/types';

export interface AppOutletContext {
  examLevel: ExamLevel;
  setExamLevel: (level: ExamLevel) => void;
}

export function useAppContext(): AppOutletContext {
  return useOutletContext<AppOutletContext>();
}

/** Authenticated shell: header, sidebar, bottom nav, and the routed page. */
export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [examLevel, setExamLevelState] = useState<ExamLevel>('Professional');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchProfile(user.uid).then((profile) => {
      if (!cancelled && profile?.preferredExamLevel) {
        setExamLevelState(profile.preferredExamLevel);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setExamLevel = useCallback(
    (level: ExamLevel) => {
      setExamLevelState(level);
      if (user) void savePreferredExamLevel(user.uid, level).catch(() => undefined);
    },
    [user]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <AppHeader examLevel={examLevel} onToggleExamLevel={setExamLevel} />
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
