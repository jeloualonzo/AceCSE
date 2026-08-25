/**
 * The app's top-level URLs, and the learner/admin boundary, written down once.
 *
 * AceCSE is two experiences behind one sign-in: the learner app at `/app/*` and
 * the admin app at `/admin/*`. Each has its own shell, navigation, and
 * post-login destination. Keeping the paths here stops the route tree, the
 * sidebars, and the guards from drifting apart — and makes the boundary
 * something a test can assert on rather than something spelled out in five
 * files.
 *
 * Segments are exported alongside the absolute paths because the route tree
 * nests: `App.tsx` mounts children by segment, while links and redirects need
 * the absolute form.
 */

export const ADMIN_BASE = '/admin';

/**
 * Dedicated admin sign-in. Email/password only, no self sign-up. Registered as
 * an absolute path (outside the guarded `/admin` shell), so no segment constant
 * is needed for it.
 */
export const ADMIN_LOGIN_ROUTE = `${ADMIN_BASE}/login`;

export const CONTENT_BANK_SEGMENT = 'content-bank';

/** Where the learner app starts — the default post-login home for learners. */
export const LEARNER_HOME_ROUTE = '/app/dashboard';

/** Learner launchers, used as the fallback exits from a learner exam run. */
export const LEARNER_SIMULATION_ROUTE = '/app/simulation';
export const LEARNER_PRACTICE_ROUTE = '/app/practice';

/** The learner's own attempt history — every attempt, at either level. */
export const LEARNER_HISTORY_ROUTE = '/app/history';

/**
 * The shared focus-mode exam route. Focus mode has no shell, so it sits outside
 * both trees — and outside the learner layout, which is why nothing on it reads
 * a shell context.
 */
export const EXAM_ROUTE = '/app/exam';

/**
 * Whether a captured `from` path may be redirected back to after sign-in.
 *
 * Only in-app paths qualify, and the admin sign-in page itself never does —
 * returning to it after signing in would loop.
 */
export function isReturnableAppPath(path: string | undefined | null): path is string {
  if (!path || !path.startsWith('/')) return false;
  if (path === ADMIN_LOGIN_ROUTE || path.startsWith(`${ADMIN_LOGIN_ROUTE}/`)) return false;
  return path.startsWith('/app') || path.startsWith(ADMIN_BASE);
}
