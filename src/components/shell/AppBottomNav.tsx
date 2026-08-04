import React from 'react';
import { NAV_ITEMS, NavItem } from '../../navigation/navConfig';

interface AppBottomNavProps {
  currentTab: NavItem['id'];
  onSelectTab: (tab: NavItem['id']) => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-md">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-1 active:bg-slate-100/60 ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-md ${isActive ? 'bg-emerald-100/70' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-700 stroke-[2.2]' : 'text-slate-500'}`} />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
