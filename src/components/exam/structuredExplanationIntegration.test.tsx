// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, Question } from '@/types';
import { ThemeProvider } from '@/context/ThemeContext';
import { QuestionCard } from './QuestionCard';
import { ResultsScreen } from './ResultsScreen';

const pilotQuestion: Question = {
  id: 'num-0019',
  examLevel: 'Both',
  subject: 'Numerical Reasoning',
  topic: 'Number Series',
  subtopic: 'Arithmetic Sequence',
  difficulty: 'Easy',
  question: 'What is the next number in the series: 4, 9, 14, 19, ___?',
  choices: [
    { id: 'A', text: '25' },
    { id: 'B', text: '24' },
    { id: 'C', text: '22' },
    { id: 'D', text: '26' },
    { id: 'E', text: '29' },
  ],
  correctOptionId: 'B',
  explanation: 'Legacy explanation remains available as fallback.',
  tags: ['number-series'],
  structuredExplanation: {
    blocks: [
      { type: 'heading', text: 'Solution' },
      { type: 'correct_answer', text: 'B — 24' },
      { type: 'paragraph', label: 'What to Notice', text: 'Check the difference between consecutive terms.' },
      { type: 'pattern', expression: '4 + 5 = 9\n9 + 5 = 14\n14 + 5 = 19' },
      { type: 'paragraph', text: 'The same operation is repeated: +5.' },
      { type: 'solution', expression: '19 + 5 = 24' },
      { type: 'answer', text: '24', variant: 'final' },
      { type: 'rule', text: 'Arithmetic sequence: consecutive terms have a constant difference.' },
    ],
  },
};

function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
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

describe('structured explanation Practice/Results integration V3', () => {
  it('preserves Practice Show/Hide behavior around the one-card structured renderer', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <QuestionCard
        question={pilotQuestion}
        selectedOptionId="B"
        onSelectOption={vi.fn()}
        instantFeedback
      />
    );

    expect(screen.getByRole('button', { name: 'Show Explanation' })).toBeInTheDocument();
    expect(screen.queryByTestId('structured-explanation')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show Explanation' }));

    const roots = screen.getAllByTestId('structured-explanation');
    expect(roots).toHaveLength(2);
    expect(roots.every((root) => within(root).getByText('Correct Answer:'))).toBe(true);
    expect(roots.every((root) => within(root).getByText('B — 24'))).toBe(true);
    expect(roots.every((root) => within(root).getByText('What to Notice'))).toBe(true);
    expect(roots.every((root) => within(root).getByText('Pattern'))).toBe(true);
    expect(roots.every((root) => within(root).getByText('Apply the Pattern'))).toBe(true);
    expect(roots.every((root) => within(root).getByText('Rule'))).toBe(true);
    expect(roots.every((root) => within(root).queryByText(/Step [123]/) === null)).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Hide Explanation' }));
    expect(screen.queryByTestId('structured-explanation')).not.toBeInTheDocument();
  });

  it('falls back to legacy explanation when structured data is absent', async () => {
    const user = userEvent.setup();
    const legacyQuestion = { ...pilotQuestion, id: 'num-0022', structuredExplanation: undefined };
    renderWithTheme(
      <QuestionCard
        question={legacyQuestion}
        selectedOptionId="B"
        onSelectOption={vi.fn()}
        instantFeedback
      />
    );

    await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
    expect(screen.getAllByText('Legacy explanation remains available as fallback.')).toHaveLength(2);
    expect(screen.queryByTestId('structured-explanation')).not.toBeInTheDocument();
  });

  it('uses the same structured renderer in Results item review', async () => {
    const attempt: Attempt = {
      id: 'structured-results',
      mode: 'practice',
      examLevel: 'Professional',
      questionCount: 1,
      correctCount: 1,
      answeredCount: 1,
      unansweredCount: 0,
      percentage: 100,
      passed: false,
      durationSeconds: 12,
      startedAt: 1,
      completedAt: 12_001,
      subjects: [{ subject: 'Numerical Reasoning', total: 1, correct: 1, answered: 1, unanswered: 0, percentage: 100 }],
      items: [{
        questionId: pilotQuestion.id,
        subject: pilotQuestion.subject,
        topic: pilotQuestion.topic,
        selected: 'B',
        correct: 'B',
        isCorrect: true,
      }],
    };

    const user = userEvent.setup();
    renderWithTheme(
      <ResultsScreen
        attempt={attempt}
        questionIndex={new Map([[pilotQuestion.id, pilotQuestion]])}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand question details' }));
    const root = screen.getByTestId('structured-explanation');
    expect(within(root).getByText('Correct Answer:')).toBeInTheDocument();
    expect(within(root).getByText('B — 24')).toBeInTheDocument();
    expect(within(root).getByText('What to Notice')).toBeInTheDocument();
    expect(within(root).getByText('Pattern')).toBeInTheDocument();
    expect(within(root).getByText('Apply the Pattern')).toBeInTheDocument();
    expect(within(root).getByText('Rule')).toBeInTheDocument();
    expect(within(root).queryByText(/Step [123]/)).toBeNull();
    expect(screen.queryByText('Legacy explanation remains available as fallback.')).not.toBeInTheDocument();
  });
});
