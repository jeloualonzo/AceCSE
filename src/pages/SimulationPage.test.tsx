// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXAM_FRAMEWORK, SIMULATION_TIERS, SUBJECTS_BY_LEVEL } from '@/config/exam';
import { SimulationPage } from './SimulationPage';

const navigateMock = vi.hoisted(() => vi.fn());

/**
 * No shell-context mock: the page reads no app-wide examination level. Both
 * examinations are on screen at once, so it mounts standalone.
 */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(() => cleanup());
beforeEach(() => navigateMock.mockReset());

describe('Exam Simulation landing page', () => {
  it('offers exactly the two CSC examinations, each as its own card', () => {
    const { container } = render(<SimulationPage />);

    const cards = [...container.querySelectorAll<HTMLElement>('[data-simulation-exam]')];
    expect(cards.map((card) => card.dataset.simulationExam)).toEqual([
      'Professional',
      'Subprofessional',
    ]);

    expect(screen.getByRole('heading', { name: 'Professional Exam', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subprofessional Exam', level: 2 })).toBeInTheDocument();
  });

  /**
   * The point of Part 5: a level is not something the learner switches, and a
   * shortened simulation is not a simulation. Both used to be on this page.
   */
  it('has no level switch and no shortened tiers', () => {
    render(<SimulationPage />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch|change.*level|active level/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/active level|current level|switch level/i);

    // 20 / 50 / 100 are still the configured tiers, and still unreachable here.
    expect(SIMULATION_TIERS.length).toBeGreaterThan(0);
    for (const tier of SIMULATION_TIERS) {
      expect(
        screen.queryByRole('button', { name: new RegExp(`\\b${tier}\\b`) })
      ).not.toBeInTheDocument();
    }
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveAccessibleName(/^Start (Professional|Subprofessional) Exam Simulation$/);
    }
  });

  it('states each examination’s real framework figures, not a chosen size', () => {
    const { container } = render(<SimulationPage />);

    for (const level of ['Professional', 'Subprofessional'] as const) {
      const framework = EXAM_FRAMEWORK[level];
      const card = within(container.querySelector<HTMLElement>(`[data-simulation-exam="${level}"]`)!);
      expect(card.getByText(String(framework.scoredItems))).toBeInTheDocument();
      expect(
        card.getByText(
          `+ ${framework.edqItems} EDQ items (not scored) — ${framework.presentedItems} presented`
        )
      ).toBeInTheDocument();
      expect(card.getByText(SUBJECTS_BY_LEVEL[level].join(', '))).toBeInTheDocument();
    }
  });

  it('launches the full scored length of the examination whose card was pressed', async () => {
    const user = userEvent.setup();
    render(<SimulationPage />);

    await user.click(screen.getByRole('button', { name: 'Start Professional Exam Simulation' }));
    expect(navigateMock).toHaveBeenLastCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'simulation',
          examLevel: 'Professional',
          questionCount: EXAM_FRAMEWORK.Professional.scoredItems,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Start Subprofessional Exam Simulation' }));
    expect(navigateMock).toHaveBeenLastCalledWith('/app/exam', {
      state: {
        launch: {
          kind: 'simulation',
          examLevel: 'Subprofessional',
          questionCount: EXAM_FRAMEWORK.Subprofessional.scoredItems,
        },
      },
    });
  });
});
