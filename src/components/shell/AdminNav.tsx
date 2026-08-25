import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { ADMIN_NAV_SECTIONS } from '@/navigation/adminNavConfig';
import { LEARNER_HOME_ROUTE } from '@/navigation/appRoutes';

/**
 * The admin navigation list, shared by the desktop sidebar and the mobile panel
 * so the two can never disagree about what the admin area contains.
 *
 * Sectioned, which is what separates it from the learner's flat nav: the admin
 * app has a hierarchy, and the headings are that hierarchy. Same light surfaces
 * and emerald active state as the learner sidebar.
 */
export const AdminNav: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  return (
    <div className="flex min-h-full flex-col gap-6">
      <nav className="flex-1 space-y-5" aria-label="Admin">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-1.5">
            <h2 className="px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {section.label}
            </h2>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={!item.matchNested}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 min-h-[44px] text-sm transition-colors cursor-pointer text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 ${
                      isActive
                        ? 'border border-emerald-200/80 bg-emerald-50 font-bold text-emerald-900 shadow-2xs dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border border-transparent font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-5 w-5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/*
        The only way from the admin app into the learner app, and it is explicit.
        Admins use the real learner experience rather than a copy of it, which is
        why there is one learner engine and one learner shell.
      */}
      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <Link
          to={LEARNER_HOME_ROUTE}
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-300 px-3.5 py-2.5 min-h-[44px] text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Eye className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span className="truncate">View Learner App</span>
        </Link>
      </div>
    </div>
  );
};
