// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticePage } from './PracticePage';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/shell/AppLayout', () => ({
  useAppContext: () => ({
    examLevel: 'Professional',
    setExamLevel: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(() => cleanup());
beforeEach(() => navigateMock.mockReset());

describe('Practice progressive landing page', () => {
  it('shows subject and All Subjects Start actions without inventory or fixed-size language', () => {
    render(<PracticePage />);

    expect(screen.getByRole('button', { name: 'Start Numerical Reasoning Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Analytical Reasoning Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start All Subjects Practice' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Start .*Practice/ })).toHaveLength(5);
    expect(document.body.textContent).not.toMatch(/\b\d+\s+(available|questions)\b/i);
    expect(document.body.textContent).not.toMatch(/question bank|fixed session|select size/i);
  });

  it('launches All Subjects with progressive Practice metadata and no learner size', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start All Subjects Practice' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Professional',
          questionCount: 0,
          subjects: ['Numerical Reasoning', 'Analytical Reasoning', 'Verbal Ability', 'General Information'],
          timed: false,
          progressive: true,
        },
      },
    });
  });
});
