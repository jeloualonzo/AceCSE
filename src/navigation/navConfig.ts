import { LayoutDashboard, ClipboardList, BookOpen, History, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  id: 'dashboard' | 'simulation' | 'practice' | 'history' | 'settings';
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { id: 'simulation', label: 'Simulation', path: '/app/simulation', icon: ClipboardList },
  { id: 'practice', label: 'Practice', path: '/app/practice', icon: BookOpen },
  { id: 'history', label: 'History', path: '/app/history', icon: History },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: Settings },
];
