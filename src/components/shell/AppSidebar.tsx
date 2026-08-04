import React from 'react';
import { NAV_ITEMS, NavItem } from '../../navigation/navConfig';

interface AppSidebarProps {
  currentTab: NavItem['id'];
  onSelectTab: (tab: NavItem['id']) => void;
  examLevel: 'Professional' | 'Subprofessional';
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0">
      {/* Navigation Items List */}
      <nav className="space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors cursor-pointer text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

