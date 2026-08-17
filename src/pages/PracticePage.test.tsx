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
  it('puts All Subjects first and keeps each card to title, description, and one icon-bearing Start button', () => {
    const { container } = render(<PracticePage />);

    expect(container.querySelector('.max-w-7xl')).not.toBeNull();
    const cardLabels = [...container.querySelectorAll<HTMLElement>('[data-practice-card]')]
      .map((card) => card.dataset.practiceCard);
    expect(cardLabels).toEqual([
      'All Subjects',
      'Numerical Reasoning',
      'Analytical Reasoning',
      'Verbal Ability',
      'Clerical Ability',
      'General Information',
    ]);

    const startButtons = screen.getAllByRole('button', { name: /^Start .*Practice$/ });
    expect(startButtons).toHaveLength(6);
    for (const button of startButtons) {
      expect(button.querySelector('svg')).not.toBeNull();
    }
    for (const svg of container.querySelectorAll('[data-practice-card] svg')) {
      expect(svg.closest('button')).not.toBeNull();
    }

    expect(screen.queryByText(/Timed|Untimed/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/question bank|fixed session|select size|question count|available questions|task|pool|category|inventory/i);
  });

  it('launches a single subject with progressive metadata and no Practice timing mode', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start Numerical Reasoning Practice' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Professional',
          questionCount: 0,
          subjects: ['Numerical Reasoning'],
          progressive: true,
        },
      },
    });
  });

  it('launches All Subjects with all five subject identities and no timing-mode metadata', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start Mixed Practice' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Professional',
          questionCount: 0,
          subjects: PRACTICE_ALL_SUBJECTS,
          progressive: true,
        },
      },
    });
  });
});
