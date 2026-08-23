// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

function renderGuard(path = '/app/content-bank') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<p>Auth page</p>} />
        <Route
          path="/app/content-bank"
          element={
            <RequireAdmin>
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
    expect(screen.queryByText('Auth page')).not.toBeInTheDocument();
    expect(screen.getByText('someone@example.com')).toBeInTheDocument();
  });

  it('sends a guest to the auth flow rather than the refusal screen', () => {
    setAuth({ user: null, adminResolved: false });
    renderGuard();

    expect(screen.getByText('Auth page')).toBeInTheDocument();
    expect(screen.queryByText('Admin access required')).not.toBeInTheDocument();
  });

  it('re-reads the token on demand and reports honestly when nothing changed', async () => {
    const refreshAdminClaim = vi.fn(async () => false);
    setAuth({ refreshAdminClaim });
    renderGuard();

    // No premature status line: the message only appears after a real check.
    expect(screen.queryByText(/Still no admin claim/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(refreshAdminClaim).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Still no admin claim/)).toBeInTheDocument();
  });
});
