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

const alternativeQuestion: Question = {
  ...pilotQuestion,
  id: 'num-0024',
  question: 'What number comes next: 1, 4, 9, 16, 25, ___?',
  choices: [
    { id: 'A', text: '36' },
    { id: 'B', text: '30' },
    { id: 'C', text: '34' },
    { id: 'D', text: '35' },
    { id: 'E', text: '37' },
  ],
  correctOptionId: 'A',
  structuredExplanation: {
    blocks: [
      { type: 'heading', text: 'Solution' },
      { type: 'correct_answer', text: 'A — 36' },
      { type: 'paragraph', label: 'What to Notice', text: 'Check the differences between consecutive terms.' },
      { type: 'pattern', expression: '4 − 1 = 3\n9 − 4 = 5\n16 − 9 = 7\n25 − 16 = 9' },
      { type: 'paragraph', text: 'The differences increase by 2:' },
      { type: 'math', expression: '+3, +5, +7, +9, +11' },
      { type: 'solution', expression: '25 + 11 = 36' },
      { type: 'answer', text: '36', variant: 'final' },
      { type: 'rule', text: 'The differences between consecutive perfect squares increase by consecutive odd numbers.' },
      {
        type: 'alternative_solution',
        title: 'Alternative Method',
        blocks: [
          { type: 'paragraph', text: 'Recognize the perfect squares.' },
          { type: 'math', expression: '1²\n2²\n3²\n4²\n5²' },
          { type: 'paragraph', text: 'The next term is:' },
          { type: 'math', expression: '6² = 36' },
          { type: 'answer', text: '36', variant: 'final' },
        ],
      },
    ],
  },
};

const interleavedQuestion: Question = {
  ...pilotQuestion,
  id: 'num-0025',
  question: 'What is the missing number: 3, 7, 4, 10, 5, 13, 6, ___?',
  choices: [
    { id: 'A', text: '7' },
    { id: 'B', text: '14' },
    { id: 'C', text: '16' },
    { id: 'D', text: '15' },
    { id: 'E', text: '17' },
  ],
  correctOptionId: 'C',
  structuredExplanation: {
    blocks: [
      { type: 'heading', text: 'Solution' },
      { type: 'correct_answer', text: 'C — 16' },
      { type: 'paragraph', label: 'What to Notice', text: 'The terms alternate between two sequences.' },
      { type: 'pattern', label: 'Odd positions', expression: '3 → 4 → 5 → 6\n+1, +1, +1' },
      { type: 'pattern', label: 'Even positions', expression: '7 → 10 → 13 → ___\n+3, +3, +3' },
      { type: 'paragraph', text: 'The missing term is in the 8th position, so it belongs to the even-position sequence.' },
      { type: 'solution', expression: '13 + 3 = 16' },
      { type: 'answer', text: '16', variant: 'final' },
      { type: 'rule', text: 'When a series does not follow one consistent pattern, separate the odd- and even-position terms and check each sequence independently.' },
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

  it('renders num-0025 labeled subsequences through the shared Practice and Results renderer', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <QuestionCard
        question={interleavedQuestion}
        selectedOptionId="C"
        onSelectOption={vi.fn()}
        instantFeedback
      />
    );

    await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
    const practiceRoots = screen.getAllByTestId('structured-explanation');
    expect(practiceRoots).toHaveLength(2);
    expect(practiceRoots.every((root) => within(root).getByText('Pattern — Odd positions'))).toBeTruthy();
    expect(practiceRoots.every((root) => within(root).getByText('Pattern — Even positions'))).toBeTruthy();
    expect(practiceRoots.every((root) => within(root).queryByRole('button', { name: /Alternative Method/ }) === null)).toBe(true);
    expect(practiceRoots.every((root) => within(root).queryByText(/Step [123]/) === null)).toBe(true);

    cleanup();
    const attempt: Attempt = {
      id: 'structured-results-interleaved',
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
        questionId: interleavedQuestion.id,
        subject: interleavedQuestion.subject,
        topic: interleavedQuestion.topic,
        selected: 'C',
        correct: 'C',
        isCorrect: true,
      }],
    };

    renderWithTheme(
      <ResultsScreen
        attempt={attempt}
        questionIndex={new Map([[interleavedQuestion.id, interleavedQuestion]])}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Expand question details' }));
    const resultsRoot = screen.getByTestId('structured-explanation');
    expect(within(resultsRoot).getByText('Pattern — Odd positions')).toBeInTheDocument();
    expect(within(resultsRoot).getByText('Pattern — Even positions')).toBeInTheDocument();
    expect(within(resultsRoot).getByRole('math', { name: 'Pattern, Even positions: 7 → 10 → 13 → ___; +3, +3, +3' })).toBeInTheDocument();
  });

  it('keeps num-0024 primary and alternative methods in one Results explanation card', async () => {
    const attempt: Attempt = {
      id: 'structured-results-alternative',
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
        questionId: alternativeQuestion.id,
        subject: alternativeQuestion.subject,
        topic: alternativeQuestion.topic,
        selected: 'A',
        correct: 'A',
        isCorrect: true,
      }],
    };

    const user = userEvent.setup();
    renderWithTheme(
      <ResultsScreen
        attempt={attempt}
        questionIndex={new Map([[alternativeQuestion.id, alternativeQuestion]])}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand question details' }));
    const root = screen.getByTestId('structured-explanation');
    const control = within(root).getByRole('button', { name: /Alternative Method/ });
    const content = within(root).getByTestId('structured-alternative-content');

    expect(within(root).getByText('Apply the Pattern')).toBeInTheDocument();
    expect(within(root).getByRole('math', { name: 'Apply the Pattern: 25 + 11 = 36' })).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveAttribute('hidden');

    await user.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(content).not.toHaveAttribute('hidden');
    expect(within(content).getByText('Recognize the perfect squares.')).toBeVisible();
    expect(within(content).getByRole('math', { name: '6² = 36' })).toBeVisible();
    expect(root.querySelector('.rounded-lg')).toBeNull();
  });
});
