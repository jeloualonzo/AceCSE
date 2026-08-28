// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

/**
 * The guard's job is a three-way decision, and the interesting case is the
 * middle one: while the ID token claim is still being read, an admin must not
 * be shown the refusal screen. Getting that wrong bounces a real admin on every
 * page reload, which looks exactly like a broken permission.
 *
 * This tests the UI gate only. The security boundary is `firestore.rules`
 * checking the same claim on the same token — see docs/admin/ADMIN_ACCESS.md.
 */

type AuthState = {
  user: { uid: string; email: string | null } | null;
  initializing: boolean;
  isAdmin: boolean;
  adminResolved: boolean;
  refreshAdminClaim: () => Promise<boolean>;
};

const authState = vi.hoisted(() => ({ current: null as unknown as AuthState }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

const { RequireAdmin } = await import('./RequireAdmin');
const { ADMIN_LOGIN_ROUTE } = await import('@/navigation/appRoutes');
const { CONTENT_BANK_BASE } = await import('@/navigation/contentBankRoutes');

function setAuth(overrides: Partial<AuthState> = {}) {
  authState.current = {
    user: { uid: 'uid-1', email: 'someone@example.com' },
    initializing: false,
    isAdmin: false,
    adminResolved: true,
    refreshAdminClaim: vi.fn(async () => false),
    ...overrides,
  };
}

/** Echoes the deep link the guard captured, so the redirect can be checked end to end. */
function AdminSignInStub() {
  const { state } = useLocation();
  const from = (state as { from?: string } | null)?.from;
  return (
    <div>
      <p>Admin sign in</p>
      <p>from: {from ?? 'none'}</p>
    </div>
  );
}

/**
 * Mounted at the real Content Bank path, under the admin tree. `signInPath`
 * mirrors how `App.tsx` wires the guard onto `/admin`; the default is exercised
 * separately below.
 */
function renderGuard({
  path = CONTENT_BANK_BASE,
  signInPath = ADMIN_LOGIN_ROUTE,
}: { path?: string; signInPath?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<p>Learner auth page</p>} />
        <Route path={ADMIN_LOGIN_ROUTE} element={<AdminSignInStub />} />
        <Route
          path={CONTENT_BANK_BASE}
          element={
            <RequireAdmin signInPath={signInPath}>
              <p>Content Bank</p>
            </RequireAdmin>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    setAuth();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the admin surface only when the token carries the claim', () => {
    setAuth({ isAdmin: true });
    renderGuard();

    expect(screen.getByText('Content Bank')).toBeInTheDocument();
    expect(screen.queryByText('Admin access required')).not.toBeInTheDocument();
  });

  it('waits instead of refusing while the claim is still unresolved', () => {
    setAuth({ isAdmin: false, adminResolved: false });
    renderGuard();

    // Neither outcome yet: an admin whose token has not been read must not see
    // the refusal, and a non-admin must not see the content.
    expect(screen.queryByText('Content Bank')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin access required')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('refuses a signed-in account with no claim, without redirecting it away', () => {
    renderGuard();

    expect(screen.getByText('Admin access required')).toBeInTheDocument();
    expect(screen.queryByText('Content Bank')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin sign in')).not.toBeInTheDocument();
    expect(screen.getByText('someone@example.com')).toBeInTheDocument();
  });

  /**
   * The refusal screen speaks in user-facing outcomes only. Provisioning is an
   * out-of-band conversation, so the screen must not leak the commands, claim
   * mechanics, or repository documentation behind it.
   */
  it('explains the refusal without exposing internal provisioning details', () => {
    renderGuard();

    expect(
      screen.getByText(/This area is restricted to authorized administrator accounts/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If you believe you should have administrator access, contact the system administrator/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toBeInTheDocument();

    const rendered = document.body.textContent ?? '';
    for (const internal of [
      'npm run',
      'admin:grant',
      'admin:create',
      'ADMIN_ACCESS.md',
      'docs/',
      'claim',
      'minted',
      'token',
      'Firebase',
    ]) {
      expect(rendered, `expected the refusal screen not to mention "${internal}"`).not.toContain(internal);
    }
  });

  /**
   * A bookmarked `/admin/...` URL belongs to the admin sign-in page. Sending a
   * guest to `/auth` instead would offer them Google sign-in and sign-up for an
   * app they are trying to administer.
   */
  it('sends a guest to the admin sign-in, not the learner auth flow', () => {
    setAuth({ user: null, adminResolved: false });
    renderGuard();

    expect(screen.getByText('Admin sign in')).toBeInTheDocument();
    expect(screen.queryByText('Learner auth page')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin access required')).not.toBeInTheDocument();
  });

  /** The captured path is what `RedirectWhenAuthed` later returns the admin to. */
  it('captures the admin path it turned away, so sign-in can return there', () => {
    setAuth({ user: null, adminResolved: false });
    renderGuard();

    expect(screen.getByText(`from: ${CONTENT_BANK_BASE}`)).toBeInTheDocument();
  });

  /**
   * Without `signInPath` the guard still behaves as it did before the admin tree
   * existed, so a guarded learner-tree route keeps working.
   */
  it('falls back to the learner auth flow when no sign-in path is given', () => {
    setAuth({ user: null, adminResolved: false });
    render(
      <MemoryRouter initialEntries={[CONTENT_BANK_BASE]}>
        <Routes>
          <Route path="/auth" element={<p>Learner auth page</p>} />
          <Route
            path={CONTENT_BANK_BASE}
            element={
              <RequireAdmin>
                <p>Content Bank</p>
              </RequireAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Learner auth page')).toBeInTheDocument();
  });

  it('re-reads the token on demand and reports honestly when nothing changed', async () => {
    const refreshAdminClaim = vi.fn(async () => false);
    setAuth({ refreshAdminClaim });
    renderGuard();

    // No premature status line: the message only appears after a real check.
    expect(screen.queryByText(/still does not have administrator access/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(refreshAdminClaim).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/still does not have administrator access/)).toBeInTheDocument();
  });
});
