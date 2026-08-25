// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { PracticePage, PRACTICE_ALL_SUBJECTS, PRACTICE_SUBJECT_DESCRIPTORS } from './PracticePage';
import type { Subject } from '@/types';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(() => cleanup());
beforeEach(() => navigateMock.mockReset());

const expectedOrder: Subject[] = [
  'Verbal Ability',
  'Numerical Reasoning',
  'General Information',
  'Clerical Ability',
  'Analytical Reasoning',
];

const sharedSubjects: Subject[] = ['Verbal Ability', 'Numerical Reasoning', 'General Information'];

function card(container: HTMLElement, subject: Subject): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-practice-card="${subject}"]`)!;
}

describe('Practice subject landing page', () => {
  it('shows only the five actual subjects in the requested order with exact descriptors', () => {
    const { container } = render(<PracticePage />);

    expect(PRACTICE_ALL_SUBJECTS).toEqual(expectedOrder);
    expect([...container.querySelectorAll<HTMLElement>('[data-practice-card]')].map((item) => item.dataset.practiceCard)).toEqual(expectedOrder);
    expect(container.querySelectorAll('[data-practice-card]')).toHaveLength(5);
    expect(screen.queryByText('Mixed Practice')).not.toBeInTheDocument();
    expect(screen.queryByText('Start Mixed Practice')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose a subject, or mix the subject areas of one examination level.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Start Practice' })).toBeInTheDocument();

    for (const subject of expectedOrder) {
      const subjectCard = card(container, subject);
      const descriptor = within(subjectCard).getByTestId(`practice-descriptor-${subject}`);
      expect(descriptor).toHaveTextContent(PRACTICE_SUBJECT_DESCRIPTORS[subject]);
      expect(descriptor.tagName).toBe('DIV');
      expect(descriptor).toHaveClass('text-xs', 'text-slate-500');
      expect(within(subjectCard).getByRole('button')).toBeInTheDocument();
    }
  });

  it('keeps descriptors visually subordinate and does not reintroduce long card copy', () => {
    const { container } = render(<PracticePage />);

    const cards = [...container.querySelectorAll<HTMLElement>('[data-practice-card]')];
    for (const subjectCard of cards) {
      const descriptor = within(subjectCard).getByTestId(`practice-descriptor-${subjectCard.dataset.practiceCard}`);
      expect(descriptor).not.toHaveClass('text-sm', 'text-base', 'font-bold');
      expect(within(subjectCard).queryByRole('tooltip')).not.toBeInTheDocument();
      expect(subjectCard.querySelectorAll('p')).toHaveLength(0);
    }
    expect(document.body.textContent).not.toMatch(/question bank|fixed session|select size|question count|available questions|inventory|broader learning session/i);
    expect(screen.getByText(/Practice at your own pace\. Answer, skip, revisit, and reveal explanations as you learn\./i)).toBeInTheDocument();
  });

  it('derives subject-level actions from current configuration without a global level selector', () => {
    const { container } = render(<PracticePage />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch|change.*level|active level/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/active level|current selected level|professional\/subprofessional global/i);

    // Shared subjects use one pool authored for both levels, so a single action
    // is shown and no artificial level label is presented.
    for (const subject of sharedSubjects) {
      const scope = within(card(container, subject));
      expect(scope.getAllByRole('button')).toHaveLength(1);
      expect(scope.getByRole('button', { name: `Start ${subject} Practice` })).toBeInTheDocument();
      expect(card(container, subject).textContent).not.toMatch(/Professional|Subprofessional/);
    }

    // These subjects genuinely exist at one level only in SUBJECTS_BY_LEVEL;
    // the level is shown as a fact, while the action remains a single Start.
    const analytical = within(card(container, 'Analytical Reasoning'));
    expect(analytical.getAllByRole('button')).toHaveLength(1);
    expect(analytical.getByText('Professional')).toBeInTheDocument();
    expect(SUBJECTS_BY_LEVEL.Professional).toContain('Analytical Reasoning');
    expect(SUBJECTS_BY_LEVEL.Subprofessional).not.toContain('Analytical Reasoning');

    const clerical = within(card(container, 'Clerical Ability'));
    expect(clerical.getAllByRole('button')).toHaveLength(1);
    expect(clerical.getByText('Subprofessional')).toBeInTheDocument();
    expect(SUBJECTS_BY_LEVEL.Subprofessional).toContain('Clerical Ability');
    expect(SUBJECTS_BY_LEVEL.Professional).not.toContain('Clerical Ability');
  });

  it('launches a shared subject with progressive metadata and no Practice timing mode', async () => {
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

  it('launches a single-level subject at its configured level', async () => {
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

  it('keeps all five subjects reachable without creating mixed-subject launch options', async () => {
    const user = userEvent.setup();
    render(<PracticePage />);

    for (const subject of expectedOrder) {
      await user.click(screen.getByRole('button', { name: `Start ${subject} Practice` }));
    }

    expect(navigateMock).toHaveBeenCalledTimes(5);
    expect(navigateMock.mock.calls.map(([path]) => path)).toEqual(expectedOrder.map(() => '/app/exam'));
    expect(navigateMock.mock.calls.every(([, options]) => {
      const subjects = (options as { state: { launch: { subjects: Subject[] } } }).state.launch.subjects;
      return subjects.length === 1 && expectedOrder.includes(subjects[0]);
    })).toBe(true);
  });
});
