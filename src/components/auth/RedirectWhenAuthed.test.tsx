// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

/**
 * Post-login routing is role-aware, and the case that breaks it is timing.
 *
 * The destination depends on the `admin` claim, which is read asynchronously off
 * the ID token. Redirecting before it resolves sends every admin to the learner
 * dashboard on a cold load — indistinguishable from having lost admin access.
 * So the guard must wait on `adminResolved` rather than read "not yet known" as
 * "not an admin".
 *
 * This is routing, not authorization: nothing here decides what an account may
 * do. `RequireAdmin` gates the admin shell and `firestore.rules` enforces the
 * same claim server-side (docs/admin/ADMIN_ACCESS.md).
 */

type AuthState = {
  user: { uid: string; email: string | null } | null;
  initializing: boolean;
  signingOut: boolean;
  isAdmin: boolean;
  adminResolved: boolean;
};

const authState = vi.hoisted(() => ({ current: null as unknown as AuthState }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

const { RedirectWhenAuthed } = await import('./RedirectWhenAuthed');
const { ADMIN_BASE, ADMIN_LOGIN_ROUTE, LEARNER_HOME_ROUTE } = await import('@/navigation/appRoutes');
const { CONTENT_BANK_BASE } = await import('@/navigation/contentBankRoutes');

function setAuth(overrides: Partial<AuthState> = {}) {
  authState.current = {
    user: { uid: 'uid-1', email: 'someone@example.com' },
    initializing: false,
    signingOut: false,
    isAdmin: false,
    adminResolved: true,
    ...overrides,
  };
}

/**
 * Mounts the guest-only page at `entry` alongside stand-ins for every
 * destination it could redirect to, so the assertion is "where did it land",
 * not "what did it intend".
 */
function renderGuard(
  entry: { pathname: string; state?: { from?: string } } = { pathname: '/auth' },
  fallback?: string
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/auth"
          element={
            <RedirectWhenAuthed fallback={fallback}>
              <p>Learner sign in</p>
            </RedirectWhenAuthed>
          }
        />
        <Route
          path={ADMIN_LOGIN_ROUTE}
          element={
            <RedirectWhenAuthed fallback={fallback}>
              <p>Admin sign in</p>
            </RedirectWhenAuthed>
          }
        />
        <Route
          path="/"
          element={
            <RedirectWhenAuthed fallback={fallback}>
              <p>Landing</p>
            </RedirectWhenAuthed>
          }
        />
        <Route path={LEARNER_HOME_ROUTE} element={<p>Learner dashboard</p>} />
        <Route path="/app/history" element={<p>Learner history</p>} />
        <Route path={ADMIN_BASE} element={<p>Admin overview</p>} />
        <Route path={CONTENT_BANK_BASE} element={<p>Content Bank</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RedirectWhenAuthed', () => {
  beforeEach(() => setAuth());
  afterEach(() => cleanup());

  it('leaves the page alone for a guest', () => {
    setAuth({ user: null, adminResolved: false });
    renderGuard();

    expect(screen.getByText('Learner sign in')).toBeInTheDocument();
  });

  it('sends a learner to the learner dashboard', () => {
    renderGuard();

    expect(screen.getByText('Learner dashboard')).toBeInTheDocument();
  });

  it('sends an admin to the admin app, not the learner dashboard', () => {
    setAuth({ isAdmin: true });
    renderGuard();

    expect(screen.getByText('Admin overview')).toBeInTheDocument();
    expect(screen.queryByText('Learner dashboard')).not.toBeInTheDocument();
  });

  /**
   * The regression this file exists for. With `adminResolved: false` the role is
   * unknown, so committing to either dashboard would be a guess — and the wrong
   * guess is the common one, because the claim resolves a moment after the user.
   */
  it('waits instead of guessing while the claim is unresolved', () => {
    setAuth({ isAdmin: false, adminResolved: false });
    renderGuard();

    expect(screen.queryByText('Learner dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Learner sign in')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('waits while auth itself is still initializing', () => {
    setAuth({ initializing: true, adminResolved: false });
    renderGuard();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Learner sign in')).not.toBeInTheDocument();
  });

  /**
   * Sign-out renders the guest page immediately. Without this the user would be
   * bounced back into the app shell for the moment between pressing Sign out and
   * Firebase clearing the user.
   */
  it('renders the landing page during sign-out rather than bouncing back', () => {
    setAuth({ signingOut: true });
    renderGuard({ pathname: '/' });

    expect(screen.getByText('Landing')).toBeInTheDocument();
  });

  it('honors a captured learner deep link', () => {
    renderGuard({ pathname: '/auth', state: { from: '/app/history' } });

    expect(screen.getByText('Learner history')).toBeInTheDocument();
  });

  it('honors a captured admin deep link for an admin', () => {
    setAuth({ isAdmin: true });
    renderGuard({ pathname: ADMIN_LOGIN_ROUTE, state: { from: CONTENT_BANK_BASE } });

    expect(screen.getByText('Content Bank')).toBeInTheDocument();
  });

  /**
   * A non-admin who somehow arrives with an admin deep link goes home instead.
   * Following it would only land them on the refusal screen, which reads like a
   * broken app rather than a place they were never meant to be.
   */
  it('drops an admin deep link for a non-admin and sends them home', () => {
    renderGuard({ pathname: '/auth', state: { from: CONTENT_BANK_BASE } });

    expect(screen.getByText('Learner dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Content Bank')).not.toBeInTheDocument();
  });

  it('ignores a `from` that is not an in-app path', () => {
    renderGuard({ pathname: '/auth', state: { from: 'https://evil.example.com' } });

    expect(screen.getByText('Learner dashboard')).toBeInTheDocument();
  });

  /**
   * The admin sign-in page passes `fallback`, so someone who signs in there is
   * taken to the admin app rather than the learner dashboard. It is only a
   * destination: the claim still decides what they can reach once they arrive.
   */
  it('uses the caller fallback ahead of the role default', () => {
    renderGuard({ pathname: ADMIN_LOGIN_ROUTE }, ADMIN_BASE);

    expect(screen.getByText('Admin overview')).toBeInTheDocument();
  });
});
