// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticePage, PRACTICE_ALL_SUBJECTS } from './PracticePage';

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
  it('restores broad layout, shows five subject choices with Timed/Untimed controls, and hides inventory language', () => {
    const { container } = render(<PracticePage />);

    expect(container.querySelector('.max-w-7xl')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Start Numerical Reasoning Practice — Timed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Numerical Reasoning Practice — Untimed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start All Subjects Practice — Timed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start All Subjects Practice — Untimed' })).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /Practice timing/ })).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: /Start .*Practice/ })).toHaveLength(10);
    expect(document.body.textContent).not.toMatch(/\b\d+\s+(available|questions)\b/i);
    expect(document.body.textContent).not.toMatch(/question bank|fixed session|select size|question count/i);
  });

  it('launches a single subject with progressive Timed Practice metadata', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start Numerical Reasoning Practice — Timed' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Professional',
          questionCount: 0,
          subjects: ['Numerical Reasoning'],
          timed: true,
          progressive: true,
        },
      },
    });
  });

  it('launches All Subjects with all five subject identities and progressive Untimed metadata', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start All Subjects Practice — Untimed' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Professional',
          questionCount: 0,
          subjects: PRACTICE_ALL_SUBJECTS,
          timed: false,
          progressive: true,
        },
      },
    });
  });
});
