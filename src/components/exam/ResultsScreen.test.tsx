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
    items,
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
  it('shows total, answered, unanswered, incorrect, and answered-only accuracy', () => {
    const { container } = renderResults('practice');
    const text = container.textContent ?? '';

    expect(screen.getByText('Practice Results')).toBeInTheDocument();
    expect(screen.getByText('Accuracy among answered')).toBeInTheDocument();
    expect(screen.getByLabelText('Practice result metrics')).toBeInTheDocument();
    expect(container.querySelector('.max-w-5xl')).not.toBeNull();
    expect(text).toContain('9 / 12 correct');
    expect(text).toContain('Your accuracy is based only on the 12 questions you answered.');
    expect(text).toContain('The 8 unanswered practice items were not counted as incorrect.');
    expect(screen.getByRole('tab', { name: 'Unanswered (8)' })).toBeInTheDocument();
  });

  it('keeps Simulation result language and score denominator unchanged', () => {
    const { container } = renderResults('simulation');
    const text = container.textContent ?? '';

    expect(screen.getByText('Simulation Results')).toBeInTheDocument();
    expect(screen.getByText('Overall Rating')).toBeInTheDocument();
    expect(screen.queryByText('Accuracy among answered')).not.toBeInTheDocument();
    expect(screen.queryByText(/unanswered practice items were not counted as incorrect/i)).not.toBeInTheDocument();
    expect(text).toContain('9 / 20 correct');
  });
});
