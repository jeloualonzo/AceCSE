// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, Question } from '@/types';
import { ThemeProvider } from '@/context/ThemeContext';
import { ResultsScreen } from './ResultsScreen';

const questionIndex = new Map<string, Question>(
  Array.from({ length: 20 }, (_, index) => {
    const id = `q-${index + 1}`;
    return [id, {
      id,
      examLevel: 'Both',
      subject: 'Verbal Ability',
      topic: 'Grammar & Usage',
      difficulty: 'Easy',
      question: `Question ${index + 1}`,
      choices: [
        { id: 'A', text: 'Correct' },
        { id: 'B', text: 'Incorrect' },
      ],
      correctOptionId: 'A',
      explanation: 'The correct answer is A.',
      tags: ['test'],
    } satisfies Question];
  })
);

const items = [
  ...Array.from({ length: 9 }, (_, index) => ({
    questionId: `q-${index + 1}`,
    subject: 'Verbal Ability' as const,
    topic: 'Grammar & Usage',
    selected: 'A' as const,
    correct: 'A' as const,
    isCorrect: true,
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    questionId: `q-${index + 10}`,
    subject: 'Verbal Ability' as const,
    topic: 'Grammar & Usage',
    selected: 'B' as const,
    correct: 'A' as const,
    isCorrect: false,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    questionId: `q-${index + 13}`,
    subject: 'Verbal Ability' as const,
    topic: 'Grammar & Usage',
    selected: null,
    correct: 'A' as const,
    isCorrect: false,
  })),
];

function attempt(mode: 'practice' | 'simulation'): Attempt {
  return {
    id: `${mode}-results-test`,
    mode,
    examLevel: 'Professional',
    questionCount: 20,
    correctCount: 9,
    answeredCount: 12,
    unansweredCount: 8,
    percentage: mode === 'practice' ? 75 : 45,
    passed: false,
    durationSeconds: 600,
    startedAt: 1_000,
    completedAt: 601_000,
    subjects: [{
      subject: 'Verbal Ability',
      total: 20,
      answered: 12,
      unanswered: 8,
      correct: 9,
      percentage: mode === 'practice' ? 75 : 45,
    }],
    items: items.map((item, index) => (
      index === 0 ? { ...item, timeSpentMs: 24_000 }
        : index === 9 ? { ...item, timeSpentMs: 78_000 }
          : index === 12 ? { ...item, timeSpentMs: 9_000 }
            : item
    )),
    taskTimeSpentMs: { 'task-spelling': 31_000 },
  };
}

function renderResults(mode: 'practice' | 'simulation') {
  return render(createElement(
    ThemeProvider,
    null,
    createElement(ResultsScreen, {
      attempt: attempt(mode),
      questionIndex,
      onRetake: vi.fn(),
      onReturnToDashboard: vi.fn(),
    })
  ));
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => cleanup());

describe('ResultsScreen Practice metrics', () => {
  it('shows answered, correct, incorrect, skipped, and answered-only accuracy', () => {
    const { container } = renderResults('practice');
    const text = container.textContent ?? '';

    expect(screen.getByText('Practice Results')).toBeInTheDocument();
    expect(screen.getByText('Accuracy among answered')).toBeInTheDocument();
    expect(screen.getByLabelText('Practice result metrics')).toBeInTheDocument();
    expect(container.querySelector('.max-w-5xl')).not.toBeNull();
    expect(text).toContain('12 Questions Answered');
    expect(text).toContain('9 Correct · 3 Incorrect · 8 Skipped');
    expect(text).toContain('Accuracy is based only on answered questions. Skipped questions were not counted as incorrect.');
    expect(text).not.toContain('of 20');
    expect(screen.getByRole('tab', { name: 'Unanswered (8)' })).toBeInTheDocument();
  });

  it('shows per-question time for correct, incorrect, and skipped Practice items', () => {
    renderResults('practice');

    expect(screen.getByText('Time spent: 00:24')).toBeInTheDocument();
    expect(screen.getByText('Time spent: 01:18')).toBeInTheDocument();
    expect(screen.getByText('Time spent: 00:09')).toBeInTheDocument();
  });

  it('shows task/directions time separately from question time', () => {
    renderResults('practice');

    expect(screen.getByRole('region', { name: 'Task and directions timing' })).toBeInTheDocument();
    expect(screen.getByText('Task / Directions Time')).toBeInTheDocument();
    expect(screen.getByText('00:31')).toBeInTheDocument();
    expect(screen.getByText('Time spent: 00:24')).toBeInTheDocument();
  });

  it('keeps Simulation result language and score denominator unchanged', () => {
    const { container } = renderResults('simulation');
    const text = container.textContent ?? '';

    expect(screen.getByText('Simulation Results')).toBeInTheDocument();
    expect(screen.getByText('Overall Rating')).toBeInTheDocument();
    expect(screen.queryByText('Accuracy among answered')).not.toBeInTheDocument();
    expect(screen.queryByText(/unanswered practice items were not counted as incorrect/i)).not.toBeInTheDocument();
    expect(text).toContain('9 / 20 correct');
    expect(screen.getByText('Time spent: 00:24')).toBeInTheDocument();
  });
});
