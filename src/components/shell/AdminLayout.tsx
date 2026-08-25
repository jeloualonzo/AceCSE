import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminHeader, ADMIN_MOBILE_NAV_ID } from './AdminHeader';
import { AdminNav } from './AdminNav';
import { AdminSidebar } from './AdminSidebar';

/**
 * The admin shell: its own header, its own navigation, its own dashboard beneath.
 *
 * Admin is distinguished from the learner app by structure — a separate login, a
 * separate sidebar, a separate hierarchy — not by a darker skin. It uses the same
 * light AceCSE surfaces so the two apps read as one product.
 *
 * The shell holds no examination level: every admin screen shows all content at
 * both levels, and level is item metadata where it matters. The admin app also
 * has no Practice or Simulation of its own — the only way to reach those is the
 * explicit View Learner App action, which opens the real learner app.
 */
export const AdminLayout: React.FC = () => {
  const { pathname } = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <AdminHeader isNavOpen={isNavOpen} onToggleNav={() => setIsNavOpen((open) => !open)} />

      {isNavOpen && (
        <div
          id={ADMIN_MOBILE_NAV_ID}
          className="border-b border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-900"
        >
          <AdminNav onNavigate={() => setIsNavOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
