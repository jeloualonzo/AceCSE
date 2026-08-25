import { Gauge, Library, type LucideIcon } from 'lucide-react';
import { ADMIN_BASE } from '@/navigation/appRoutes';
import { CONTENT_BANK_BASE } from '@/navigation/contentBankRoutes';

/**
 * The admin app's own navigation.
 *
 * Deliberately separate from `navConfig.ts`: the admin experience is not the
 * learner shell with the Content Bank bolted on, so the two navigations share no
 * items and no hierarchy. Learner navigation must never gain an admin entry, and
 * this list must never gain Practice, Simulation, or History — those are the
 * learner's own surfaces, reached only through the explicit View Learner App
 * action, where a run is a real learner attempt.
 *
 * Grouped into sections because the admin area has genuinely different kinds of
 * work in it, which a flat list of links hides.
 */

export type AdminNavItemId = 'overview' | 'content-bank';

export interface AdminNavItem {
  id: AdminNavItemId;
  label: string;
  path: string;
  icon: LucideIcon;
  /**
   * Whether nested paths keep this item active. The Content Bank owns four
   * levels of URL, so it stays lit inside a Subject, Family, or Batch Workspace.
   * Flat items match exactly — `/admin` is a prefix of every admin path, so
   * Overview would otherwise never switch off.
   */
  matchNested: boolean;
  /** One line of what the surface is for. Reused on the admin dashboard. */
  description: string;
}

export interface AdminNavSection {
  id: 'workspace' | 'content';
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'workspace',
    label: 'Admin',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        path: ADMIN_BASE,
        icon: Gauge,
        matchNested: false,
        description: 'Refinement pipeline and question supply at a glance.',
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      {
        id: 'content-bank',
        label: 'Content Bank',
        path: CONTENT_BANK_BASE,
        icon: Library,
        matchNested: true,
        description: 'Subject and Family Workspaces, refinement batches, review and export.',
      },
    ],
  },
];

/** Flat view of every admin destination, for links and tests. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);
