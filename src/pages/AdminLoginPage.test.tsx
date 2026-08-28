// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

/**
 * The admin sign-in page is public: anyone may load it, and most visitors who
 * land here are not administrators. The page must therefore describe itself in
 * user-facing terms only — the out-of-band provisioning of admin accounts is an
 * internal conversation, never page copy.
 */

const authState = vi.hoisted(() => ({
  current: {
    signInWithEmail: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

const { AdminLoginPage } = await import('./AdminLoginPage');

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminLoginPage />
    </MemoryRouter>
  );
}

describe('AdminLoginPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the admin sign-in surface with a way back to the learner app', () => {
    renderPage();

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Sign in to the admin app')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forgot the admin password?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to the learner app' })).toBeInTheDocument();
    expect(
      screen.getByText(/Administrator access is restricted to authorized accounts/),
    ).toBeInTheDocument();
  });

  it('does not expose internal provisioning commands or implementation details', () => {
    renderPage();

    const rendered = document.body.textContent ?? '';
    for (const internal of [
      'npm run',
      'admin:create',
      'admin:grant',
      'ADMIN_ACCESS.md',
      'docs/',
      'claim',
      'minted',
      'Firebase',
      'firestore',
    ]) {
      expect(rendered, `expected the admin sign-in page not to mention "${internal}"`).not.toContain(internal);
    }
  });
});
