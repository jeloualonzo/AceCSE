// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { PracticePage, PRACTICE_ALL_SUBJECTS } from './PracticePage';

const navigateMock = vi.hoisted(() => vi.fn());

/**
 * No shell-context mock: `PracticePage` reads no app-wide examination level.
 * Every card derives its own level(s) from the subject/level configuration and
 * the build-time supply, so the page can be mounted and asserted directly.
 */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(() => cleanup());
beforeEach(() => navigateMock.mockReset());

describe('Practice progressive landing page', () => {
  it('puts the mixed card first and keeps each card to a title and bottom-aligned icon-bearing Start buttons', () => {
    const { container } = render(<PracticePage />);

    expect(container.querySelector('.max-w-7xl')).not.toBeNull();
    const cardLabels = [...container.querySelectorAll<HTMLElement>('[data-practice-card]')]
      .map((card) => card.dataset.practiceCard);
    expect(cardLabels).toEqual([
      'Mixed Practice',
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
      const buttons = within(card).getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.querySelector('svg')).not.toBeNull();
        expect(button.parentElement).toHaveClass('mt-auto', 'pt-6');
      }
    }
    for (const svg of container.querySelectorAll('[data-practice-card] svg')) {
      expect(svg.closest('button')).not.toBeNull();
    }

    expect(screen.getByRole('heading', { name: 'Start Practice' })).toBeInTheDocument();
    expect(
      screen.getByText('Choose a subject, or mix the subject areas of one examination level.')
    ).toBeInTheDocument();
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

  /**
   * The whole point of removing the global level switch: nothing on this page
   * may be a level *selector*. Practice shows every subject at once, and a
   * level appears only where the configuration makes it a real distinction.
   */
  it('has no exam-level switch and offers a level only where the content differs', () => {
    const { container } = render(<PracticePage />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch|change.*level|active level/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/active level|current level/i);

    const card = (label: string) =>
      container.querySelector<HTMLElement>(`[data-practice-card="${label}"]`)!;

    // Tested at both levels, but every question is authored for both, so the
    // two levels would draw the same pool: one action, and no level named.
    for (const shared of ['Numerical Reasoning', 'Verbal Ability', 'General Information']) {
      const scope = within(card(shared));
      expect(scope.getAllByRole('button')).toHaveLength(1);
      expect(scope.getByRole('button', { name: `Start ${shared} Practice` })).toBeInTheDocument();
      expect(card(shared).textContent).not.toMatch(/Professional/);
    }

    // Tested at one level only: one action, and the level shown as a fact.
    const analytical = within(card('Analytical Reasoning'));
    expect(analytical.getAllByRole('button')).toHaveLength(1);
    expect(analytical.getByText('Professional')).toBeInTheDocument();
    const clerical = within(card('Clerical Ability'));
    expect(clerical.getAllByRole('button')).toHaveLength(1);
    expect(clerical.getByText('Subprofessional')).toBeInTheDocument();

    // The levels genuinely test different subject sets, so the mix has two.
    const mixed = within(card('Mixed Practice'));
    expect(mixed.getAllByRole('button')).toHaveLength(2);
    expect(mixed.getByRole('button', { name: 'Start Professional Mixed Practice' })).toBeInTheDocument();
    expect(mixed.getByRole('button', { name: 'Start Subprofessional Mixed Practice' })).toBeInTheDocument();
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

  /**
   * Clerical Ability is a Subprofessional subject. Under a global level switch
   * set to Professional, its card launched a Professional session and the
   * engine then filtered every Clerical question out of the pool. Deriving the
   * level from the subject is what makes the card mean what it says.
   */
  it('launches a single-level subject at its own level, not a selected one', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start Clerical Ability Practice' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Subprofessional',
          questionCount: 0,
          subjects: ['Clerical Ability'],
          progressive: true,
        },
      },
    });
  });

  it('launches each mixed option with exactly the subjects that level tests', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    await user.click(screen.getByRole('button', { name: 'Start Professional Mixed Practice' }));
    expect(navigateMock).toHaveBeenLastCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Professional',
          questionCount: 0,
          subjects: [...SUBJECTS_BY_LEVEL.Professional],
          progressive: true,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Start Subprofessional Mixed Practice' }));
    expect(navigateMock).toHaveBeenLastCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'practice',
          examLevel: 'Subprofessional',
          questionCount: 0,
          subjects: [...SUBJECTS_BY_LEVEL.Subprofessional],
          progressive: true,
        },
      },
    });

    // Every subject identity is still reachable from this page — the union of
    // the two mixes is all five, even though neither level contains all five.
    expect(
      new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional])
    ).toEqual(new Set(PRACTICE_ALL_SUBJECTS));
  });
});
