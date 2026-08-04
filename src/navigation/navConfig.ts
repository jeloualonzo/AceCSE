import { LayoutDashboard, BookOpen, History, Settings, LucideIcon } from 'lucide-react';

export interface NavItem {
  id: 'dashboard' | 'practice' | 'history' | 'settings';
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview of study progress, target exam scope, and recent activity.',
  },
  {
    id: 'practice',
    label: 'Practice & Exam',
    icon: BookOpen,
    description: 'Realistic full-length exam simulations and targeted subject practice.',
  },
  {
    id: 'history',
    label: 'Exam History',
    icon: History,
    description: 'Past exam attempts, score progression, and detailed answer review.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Account preferences, target exam level, and notification settings.',
  },
];
