// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { HistoryPage } from './HistoryPage';
import type { Attempt, ExamLevel, SessionMode } from '@/types';

const attemptsMock = vi.hoisted(() => vi.fn());

/**
 * The subscription itself is covered where it lives. What matters here is that
 * whatever history exists, both screens show all of it — no level filter, no
 * level selector — which is exactly what a fixed attempt list demonstrates.
 */
vi.mock('@/hooks/useAttempts', () => ({ useAttempts: () => attemptsMock() }));

function attempt(
  id: string,
  examLevel: ExamLevel,
  mode: SessionMode,
  percentage: number,
  completedAt: number
): Attempt {
  return {
    id,
    mode,
    examLevel,
    questionCount: 2,
    correctCount: percentage >= 50 ? 2 : 1,
    answeredCount: 2,
    unansweredCount: 0,
    percentage,
    passed: percentage >= 80,
    durationSeconds: 600,
    startedAt: completedAt - 600_000,
    completedAt,
    subjects: [
      {
        subject: 'Verbal Ability',
        total: 2,
        correct: percentage >= 50 ? 2 : 1,
        answered: 2,
        unanswered: 0,
        percentage,
      },
    ],
    items: [
      {
        questionId: `${id}-a`,
        subject: 'Verbal Ability',
        topic: 'Vocabulary',
        selected: 'A',
        correct: 'A',
        isCorrect: true,
      },
      {
        questionId: `${id}-b`,
        subject: 'Verbal Ability',
        topic: 'Grammar',
        selected: 'B',
        correct: percentage >= 50 ? 'B' : 'C',
        isCorrect: percentage >= 50,
      },
    ],
  };
}

const BOTH_LEVELS: Attempt[] = [
  attempt('pro-sim', 'Professional', 'simulation', 90, Date.parse('2026-08-20T10:00:00Z')),
  attempt('sub-prac', 'Subprofessional', 'practice', 40, Date.parse('2026-08-19T10:00:00Z')),
];

function renderPage(page: React.ReactElement, state: Partial<{ attempts: Attempt[]; loading: boolean; error: string | null }> = {}) {
  attemptsMock.mockReturnValue({ attempts: [], loading: false, error: null, ...state });
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

afterEach(() => {
  cleanup();
  attemptsMock.mockReset();
  localStorage.clear();
});

describe('Dashboard', () => {
  it('has no exam-level selector and never names an active level', () => {
    renderPage(<DashboardPage />, { attempts: BOTH_LEVELS });

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /switch|change.*level|active level/i })
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/active level|current level|switch level/i);
  });

  /**
   * Under the old global level, one of these two attempts was invisible and the
   * headline totals silently described half the history.
   */
  it('counts attempts at both levels in the totals', () => {
    renderPage(<DashboardPage />, { attempts: BOTH_LEVELS });

    const totals = screen.getByText('Total Attempts').parentElement!;
    expect(within(totals).getByText('2')).toBeInTheDocument();
    expect(within(totals).getByText('1 simulations, 1 practice')).toBeInTheDocument();
  });

  it('breaks the figures out per level once both examinations are represented', () => {
    const { container } = renderPage(<DashboardPage />, { attempts: BOTH_LEVELS });

    expect(screen.getByRole('heading', { name: 'By Examination Level' })).toBeInTheDocument();
    expect(
      [...container.querySelectorAll<HTMLElement>('[data-level-stats]')].map((node) => node.dataset.levelStats)
    ).toEqual(['Professional', 'Subprofessional']);
  });

  /**
   * With a single level the headline totals already *are* that level's figures,
   * so repeating them would imply a comparison the data cannot support.
   */
  it('omits the per-level section when only one examination has been sat', () => {
    const { container } = renderPage(<DashboardPage />, { attempts: [BOTH_LEVELS[0]] });

    expect(screen.queryByRole('heading', { name: 'By Examination Level' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-level-stats]')).toHaveLength(0);
  });

  it('labels each recent attempt with the level it was taken at', () => {
    renderPage(<DashboardPage />, { attempts: BOTH_LEVELS });

    const rows = screen.getByRole('heading', { name: 'Recent Attempts' }).closest('div')!
      .parentElement!.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText('Professional')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Subprofessional')).toBeInTheDocument();
  });

  it('keeps an honest empty state rather than inventing figures', () => {
    renderPage(<DashboardPage />, { attempts: [] });

    expect(screen.getByRole('heading', { name: 'No exam history yet' })).toBeInTheDocument();
    expect(screen.queryByText('Total Attempts')).not.toBeInTheDocument();
  });

  it('sends both products to their own page instead of launching a level itself', () => {
    renderPage(<DashboardPage />, { attempts: BOTH_LEVELS });

    expect(screen.getByRole('link', { name: /Exam Simulation/ })).toHaveAttribute(
      'href',
      '/app/simulation'
    );
    expect(screen.getByRole('link', { name: /Practice/ })).toHaveAttribute('href', '/app/practice');
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/app/history');
  });
});

describe('History', () => {
  it('lists every attempt at every level, with no selector and no filtering', () => {
    renderPage(<HistoryPage />, { attempts: BOTH_LEVELS });

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/active level|current level|switch level/i);

    const rows = screen.getAllByRole('button', { expanded: false });
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Professional')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Subprofessional')).toBeInTheDocument();
  });

  it('shows the honest empty state when there is nothing to show', () => {
    renderPage(<HistoryPage />, { attempts: [] });

    expect(screen.getByRole('heading', { name: 'No exam history yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeDisabled();
  });
});
