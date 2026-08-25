import { describe, expect, it } from 'vitest';
import { ADMIN_NAV_ITEMS, ADMIN_NAV_SECTIONS } from './adminNavConfig';
import { NAV_ITEMS } from './navConfig';
import {
  ADMIN_BASE,
  ADMIN_LOGIN_ROUTE,
  EXAM_ROUTE,
  LEARNER_HOME_ROUTE,
  LEARNER_PRACTICE_ROUTE,
  LEARNER_SIMULATION_ROUTE,
  isReturnableAppPath,
} from './appRoutes';
import { CONTENT_BANK_BASE } from './contentBankRoutes';

/**
 * AceCSE is two applications behind one sign-in, and the boundary between them
 * is a product decision, not a styling one: a learner must never see an admin
 * destination, and the admin navigation must never offer the learner's own
 * Practice, Simulation, or History — an admin reaches those only through the
 * explicit View Learner App action, where a run is a real learner attempt.
 *
 * Both navigations are plain data, so the separation can be asserted directly
 * instead of inferred by rendering two shells.
 */
describe('learner and admin navigation are separate', () => {
  it('keeps every learner destination inside the learner tree', () => {
    for (const item of NAV_ITEMS) {
      expect(item.path.startsWith('/app/')).toBe(true);
      expect(item.path.startsWith(ADMIN_BASE)).toBe(false);
    }
  });

  it('offers a learner no admin destination at all', () => {
    const learnerPaths = NAV_ITEMS.map((item) => item.path);
    expect(learnerPaths).not.toContain(CONTENT_BANK_BASE);
    expect(learnerPaths).not.toContain(ADMIN_BASE);
    expect(learnerPaths.some((path) => path.includes('content-bank'))).toBe(false);
    expect(learnerPaths.some((path) => path.includes('admin'))).toBe(false);
  });

  it('keeps every admin destination inside the admin tree', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.path.startsWith(ADMIN_BASE)).toBe(true);
      expect(item.path.startsWith('/app/')).toBe(false);
    }
  });

  /**
   * The admin app has no Practice or Simulation of its own. Listing the learner
   * routes in admin navigation would put a learner run one click from a screen
   * that is not the learner app, blurring exactly the boundary this file exists
   * to hold — and a run started that way is a real recorded attempt.
   */
  it('offers an admin no learner Practice, Simulation, or Dashboard', () => {
    const adminPaths = ADMIN_NAV_ITEMS.map((item) => item.path);
    expect(adminPaths).not.toContain(LEARNER_PRACTICE_ROUTE);
    expect(adminPaths).not.toContain(LEARNER_SIMULATION_ROUTE);
    expect(adminPaths).not.toContain(LEARNER_HOME_ROUTE);
    expect(adminPaths).not.toContain(EXAM_ROUTE);
  });

  it('shares no path between the two navigations', () => {
    const learnerPaths = new Set(NAV_ITEMS.map((item) => item.path));
    for (const item of ADMIN_NAV_ITEMS) {
      expect(learnerPaths.has(item.path)).toBe(false);
    }
  });

  it('gives every admin destination a unique id and a real section', () => {
    const ids = ADMIN_NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ADMIN_NAV_SECTIONS.every((section) => section.items.length > 0)).toBe(true);
    expect(ADMIN_NAV_ITEMS.every((item) => item.description.trim().length > 0)).toBe(true);
  });

  /**
   * `/admin` is a prefix of every admin path, so an Overview link that matched
   * nested paths would stay lit on every single admin screen and stop telling
   * the user anything. Only the Content Bank owns deeper URLs.
   */
  it('matches nested paths only for the item that owns nested URLs', () => {
    const nested = ADMIN_NAV_ITEMS.filter((item) => item.matchNested).map((item) => item.id);
    expect(nested).toEqual(['content-bank']);
  });
});

describe('isReturnableAppPath', () => {
  it('accepts in-app paths from either tree', () => {
    expect(isReturnableAppPath(LEARNER_HOME_ROUTE)).toBe(true);
    expect(isReturnableAppPath(EXAM_ROUTE)).toBe(true);
    expect(isReturnableAppPath(ADMIN_BASE)).toBe(true);
    expect(isReturnableAppPath(CONTENT_BANK_BASE)).toBe(true);
  });

  /** Returning to the sign-in page after signing in would loop forever. */
  it('refuses the admin sign-in page itself', () => {
    expect(isReturnableAppPath(ADMIN_LOGIN_ROUTE)).toBe(false);
    expect(isReturnableAppPath(`${ADMIN_LOGIN_ROUTE}/anything`)).toBe(false);
  });

  it('refuses anything that is not an in-app path', () => {
    for (const path of [
      undefined,
      null,
      '',
      '/',
      '/auth',
      // Our own guards only ever capture a `location.pathname`, so these should
      // not arise — but refusing them here is what makes "a captured `from`
      // cannot send you off-site" a local guarantee rather than a trace.
      'https://evil.example.com',
      '//evil.example.com',
      'app/dashboard',
    ]) {
      expect(isReturnableAppPath(path)).toBe(false);
    }
  });
});
