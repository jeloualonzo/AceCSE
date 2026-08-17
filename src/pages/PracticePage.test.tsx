// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
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
  it('puts All Subjects first and keeps each card to a title and bottom-aligned icon-bearing Start button', () => {
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

    const cards = [...container.querySelectorAll<HTMLElement>('[data-practice-card]')];
    expect(cards).toHaveLength(6);
    for (const card of cards) {
      expect(card).toHaveClass('flex', 'flex-col');
      const button = within(card).getByRole('button');
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.parentElement).toHaveClass('mt-auto', 'pt-6');
    }
    for (const svg of container.querySelectorAll('[data-practice-card] svg')) {
      expect(svg.closest('button')).not.toBeNull();
    }

    expect(screen.getByRole('heading', { name: 'Start Practice' })).toBeInTheDocument();
    expect(screen.getByText('Choose a subject or mix all five subject areas. Your session grows as you work.')).toBeInTheDocument();
    expect(screen.getByText('Learning Mode')).toBeInTheDocument();
    expect(screen.getByText(/Practice at your own pace\. Answer, skip, revisit, and reveal explanations as you learn\./i)).toBeInTheDocument();
    for (const description of [
      'Mix all five subject areas for a broader learning session.',
      'Build speed with operations, word problems, ratios, data, and series.',
      'Practice logic, syllogisms, patterns, and structured problem solving.',
      'Strengthen vocabulary, grammar, reading comprehension, and organization.',
      'Review filing, spelling, coding, and practical office procedures.',
      'Review constitutional, legal, environmental, and civic knowledge.',
    ]) {
      expect(screen.queryByText(description)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Timed|Untimed/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/question bank|fixed session|select size|question count|available questions|task|pool|category|inventory|description/i);
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
