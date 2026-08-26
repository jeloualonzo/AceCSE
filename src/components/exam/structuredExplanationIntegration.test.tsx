// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, ExamLevel, OptionId, Question, StructuredExplanationBlock } from '@/types';
import { loadContentCatalog } from '@/data/questionBank';
import { ThemeProvider } from '@/context/ThemeContext';
import { QuestionCard } from './QuestionCard';
import { ResultsScreen } from './ResultsScreen';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';

const stripInlineFormatting = (text: string) => text
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\*([^*]+)\*/g, '$1');

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

const BATCH4_OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D', 'E'];
const makeChoices = (texts: string[]) => texts.map((text, index) => ({ id: BATCH4_OPTION_IDS[index], text }));

const batch4Questions: Question[] = [
  {
    ...pilotQuestion,
    id: 'num-0108',
    correctOptionId: 'A',
    choices: makeChoices(['96', '86', '72', '98', '101']),
    structuredExplanation: {
      blocks: [
                { type: 'correct_answer', text: 'A — 96' },
        { type: 'paragraph', label: 'What to Notice', text: 'Check the differences between consecutive terms.' },
        { type: 'pattern', expression: '6 − 5 = 1\n10 − 6 = 4\n19 − 10 = 9\n35 − 19 = 16\n60 − 35 = 25' },
        { type: 'paragraph', text: 'The differences are:' },
        { type: 'math', expression: '+1, +4, +9, +16, +25' },
        { type: 'paragraph', text: 'These are consecutive perfect squares:' },
        { type: 'math', expression: '1², 2², 3², 4², 5²' },
        { type: 'solution', expression: '6² = 36\n60 + 36 = 96' },
        { type: 'answer', text: '96', variant: 'final' },
        { type: 'rule', text: 'When the differences are consecutive perfect squares, continue with the next square.' },
      ],
    },
  },
  {
    ...pilotQuestion,
    id: 'num-0137',
    correctOptionId: 'A',
    choices: makeChoices(['1/5', '1/6', '2/5', '3/4', '4/5']),
    structuredExplanation: {
      blocks: [
                { type: 'correct_answer', text: 'A — 1/5' },
        { type: 'paragraph', label: 'What to Notice', text: 'The terms form pairs. In each pair, the second fraction is the simplified form of the first.' },
        { type: 'pattern', expression: '2/4 → 1/2\n2/6 → 1/3\n2/8 → 1/4\n2/10 → ___' },
        { type: 'paragraph', text: 'Each second fraction is the simplified form of the first.' },
        { type: 'solution', expression: '2/10 ÷ 2 = 1/5' },
        { type: 'answer', text: '1/5', variant: 'final' },
        { type: 'rule', text: 'When fractions appear in pairs, check whether the second term is the simplified form of the first.' },
      ],
    },
  },
  {
    ...pilotQuestion,
    id: 'num-0147',
    correctOptionId: 'D',
    choices: makeChoices(['−95', '104', '−130', '−144', '−109']),
    structuredExplanation: {
      blocks: [
                { type: 'correct_answer', text: 'D — −144' },
        { type: 'paragraph', label: 'What to Notice', text: 'The absolute values follow the Fibonacci pattern, while the signs alternate.' },
        { type: 'pattern', label: 'Absolute values', expression: '13, 21, 34, 55, 89' },
        { type: 'pattern', label: 'Fibonacci relationships', expression: '13 + 21 = 34\n21 + 34 = 55\n34 + 55 = 89' },
        { type: 'pattern', label: 'Signs', expression: '+, −, +, −, +' },
        { type: 'paragraph', text: 'The next sign is negative.' },
        { type: 'solution', expression: '55 + 89 = 144\n−144' },
        { type: 'answer', text: '−144', variant: 'final' },
        { type: 'rule', text: 'When signs alternate, check whether the absolute values follow a familiar sequence such as Fibonacci.' },
      ],
    },
  },
];

function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

/**
 * Every section heading the shared renderer emitted, as plain text.
 *
 * All labelled blocks route their heading through the one `SectionLabel`
 * component, so sweeping <h5> yields exactly the card's section headings. That
 * distinction is the whole point: a text search over the card cannot tell a
 * heading from a sentence, and one approved Grammar paragraph is *about* the
 * other choices.
 */
function sectionHeadings(root: HTMLElement): string[] {
  return [...root.querySelectorAll('h5')].map((node) => node.textContent?.trim() ?? '');
}

/**
 * The Grammar pilot's prohibition as `scripts/validate-grammar-pilot.mjs` states
 * it: no `alternative_solution` block, i.e. no dedicated "Other Choices" or
 * "corrected alternatives" section. `alternative_solution` is the only block the
 * renderer turns into a disclosure tagged `structured-alternative-method`, so
 * its absence is the exact assertion, and no section heading may carry one of
 * those titles either — which is what `validate-spelling.mjs` guards on title.
 */
function noAlternativeSection(root: HTMLElement): boolean {
  return (
    within(root).queryByTestId('structured-alternative-method') === null &&
    sectionHeadings(root).every((heading) => !/^(other choices|corrected alternatives)$/i.test(heading))
  );
}

/** The one distractor-paragraph label approved for the Grammar pilot. */
const DISTRACTOR_LABEL = 'Why the other choices fail';

/** The rendered block for {@link DISTRACTOR_LABEL}: its heading plus its prose. */
function distractorParagraph(root: HTMLElement): HTMLElement | null {
  const heading = within(root).queryByText(DISTRACTOR_LABEL);
  return heading === null ? null : (heading.parentElement as HTMLElement | null);
}

/** Distinct choices a distractor paragraph rules out by letter. */
function choicesRuledOut(paragraph: HTMLElement): Set<string> {
  // Read the prose element, not the wrapper: `textContent` on the wrapper glues
  // the section heading onto the first word of the sentence, which destroys the
  // leading word boundary this pattern depends on.
  const prose = paragraph.querySelector('p')?.textContent ?? '';
  return new Set([...prose.matchAll(/\bChoices?\s+([A-E])\b/g)].map((match) => match[1]));
}

/**
 * One Attempt covering a whole set of questions, so a bulk test can mount a
 * single Results screen instead of rebuilding the score header, subject table
 * and filter bar once per question.
 *
 * The items are recorded as answered-and-wrong deliberately. ResultsScreen
 * expands an item's review card by default exactly when it was answered
 * incorrectly (`expanded[id] ?? !item.isCorrect`), so every explanation is on
 * screen after a single render pass with no event simulation at all — whereas
 * clicking N disclosures on one mounted list would re-render the whole list N
 * times, which is slower than the per-question mounts this replaces. What a card
 * shows comes from `question.structuredExplanation` and does not depend on which
 * choice the learner picked; the disclosure click itself stays covered by 'uses
 * the same structured renderer in Results item review' below.
 */
function attemptOver(id: string, examLevel: ExamLevel, questions: Question[]): Attempt {
  return {
    id,
    mode: 'practice',
    examLevel,
    questionCount: questions.length,
    correctCount: 0,
    answeredCount: questions.length,
    unansweredCount: 0,
    percentage: 0,
    passed: false,
    durationSeconds: 12 * questions.length,
    startedAt: 1,
    completedAt: 1 + 12_000 * questions.length,
    subjects: [{
      subject: questions[0].subject,
      total: questions.length,
      correct: 0,
      answered: questions.length,
      unanswered: 0,
      percentage: 0,
    }],
    items: questions.map((question) => ({
      questionId: question.id,
      subject: question.subject,
      topic: question.topic,
      selected: question.choices.find((choice) => choice.id !== question.correctOptionId)!.id,
      correct: question.correctOptionId,
      isCorrect: false,
    })),
  };
}

/**
 * The explanation card belonging to each id on a mounted Results screen.
 *
 * `filteredItems` maps `attempt.items` in order under the default ALL filter and
 * each item renders exactly one explanation card, so the Nth card is the Nth id.
 * The length check keeps that pairing honest — it fails if any authored
 * explanation goes missing — and the per-id assertions that follow re-prove it
 * against text unique to each question.
 */
function resultsExplanationCards(ids: string[]): Map<string, HTMLElement> {
  const cards = screen.getAllByTestId('structured-explanation');
  expect(cards).toHaveLength(ids.length);
  return new Map(ids.map((id, index) => [id, cards[index]]));
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

  it('renders all Batch 4 explanations through the shared Practice and Results renderer', async () => {
    const user = userEvent.setup();

    for (const question of batch4Questions) {
      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );

      await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
      const practiceRoots = screen.getAllByTestId('structured-explanation');
      expect(practiceRoots).toHaveLength(2);
      expect(practiceRoots.every((root) => within(root).getByText('Correct Answer:'))).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByRole('button', { name: /Alternative Method/ }) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Step [123]/) === null)).toBe(true);

      if (question.id === 'num-0137') {
        expect(practiceRoots.every((root) => within(root).getByRole('math', { name: 'Pattern: 2/4 → 1/2; 2/6 → 1/3; 2/8 → 1/4; 2/10 → ___' }))).toBe(true);
      }
      if (question.id === 'num-0147') {
        expect(practiceRoots.every((root) => within(root).getByText('Pattern — Signs'))).toBe(true);
        expect(practiceRoots.every((root) => within(root).getAllByText('−144').length > 0)).toBe(true);
      }

      cleanup();
      const attempt: Attempt = {
        id: `structured-results-${question.id}`,
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
          questionId: question.id,
          subject: question.subject,
          topic: question.topic,
          selected: question.correctOptionId,
          correct: question.correctOptionId,
          isCorrect: true,
        }],
      };

      renderWithTheme(
        <ResultsScreen
          attempt={attempt}
          questionIndex={new Map([[question.id, question]])}
          onRetake={vi.fn()}
          onReturnToDashboard={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Expand question details' }));
      expect(screen.getByTestId('structured-explanation')).toBeInTheDocument();
      cleanup();
    }
  });

  it('renders all four Grammar pilot explanations through Practice and Results in the shared renderer', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Verbal Ability']);
    const grammarIds = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'];
    const answerTexts: Record<string, string> = {
      'verb-0059': 'The panel of judges has announced its decision.',
      'verb-0060': 'Because she arrived late, her application was disqualified.',
      'verb-0061': 'The reason the memorandum was delayed is that the signatory was absent.',
      'verb-0062': 'The commission not only reviewed the budget but also scrutinized the disbursements.',
    };

    for (const id of grammarIds) {
      const question = catalog.questions.get(id)!;
      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );

      await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
      const practiceRoots = screen.getAllByTestId('structured-explanation');
      expect(practiceRoots).toHaveLength(2);
      expect(practiceRoots.every((root) => root.textContent?.includes('Correct Answer:'))).toBe(true);
      expect(practiceRoots.every((root) => root.textContent?.includes(answerTexts[id]))).toBe(true);
      expect(practiceRoots.every((root) => within(root).getByText('What to Notice'))).toBe(true);
      expect(practiceRoots.every((root) => within(root).getByText('Apply the Rule'))).toBe(true);
      expect(practiceRoots.every((root) => within(root).getByText('Rule'))).toBe(true);
      expect(practiceRoots.every((root) => root.querySelector('strong, em') !== null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/^Pattern(?: — .+)?$/) === null)).toBe(true);

      // What the pilot forbids is a *section*, not the word "choices". verb-0059's
      // approved blocks include a "Why the other choices fail" paragraph — the
      // validator ships that exact text as the reference explanation — so assert
      // the real rule, then assert the card carries precisely the distractor
      // paragraph the authored blocks declare, with per-choice reasoning in it.
      expect(practiceRoots.every((root) => noAlternativeSection(root))).toBe(true);
      const authoredDistractor = question.structuredExplanation?.blocks.some(
        (block) => block.type === 'paragraph' && block.label === DISTRACTOR_LABEL
      ) ?? false;
      expect(authoredDistractor).toBe(id === 'verb-0059');
      expect(practiceRoots.every((root) => (distractorParagraph(root) !== null) === authoredDistractor)).toBe(true);
      if (authoredDistractor) {
        expect(practiceRoots.every((root) => choicesRuledOut(distractorParagraph(root)!).size >= 2)).toBe(true);
      }

      cleanup();
      const attempt: Attempt = {
        id: `grammar-structured-results-${id}`,
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
        subjects: [{ subject: 'Verbal Ability', total: 1, correct: 1, answered: 1, unanswered: 0, percentage: 100 }],
        items: [{
          questionId: question.id,
          subject: question.subject,
          topic: question.topic,
          selected: question.correctOptionId,
          correct: question.correctOptionId,
          isCorrect: true,
        }],
      };

      renderWithTheme(
        <ResultsScreen
          attempt={attempt}
          questionIndex={new Map([[question.id, question]])}
          onRetake={vi.fn()}
          onReturnToDashboard={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Expand question details' }));
      const resultsRoot = screen.getByTestId('structured-explanation');
      expect(resultsRoot.textContent).toContain('Correct Answer:');
      expect(resultsRoot.textContent).toContain(answerTexts[id]);
      expect(within(resultsRoot).getByText('What to Notice')).toBeInTheDocument();
      expect(within(resultsRoot).getByText('Apply the Rule')).toBeInTheDocument();
      expect(within(resultsRoot).getByText('Rule')).toBeInTheDocument();
      expect(resultsRoot.querySelector('strong, em')).not.toBeNull();
      expect(within(resultsRoot).queryByText(/^Pattern(?: — .+)?$/)).toBeNull();
      expect(noAlternativeSection(resultsRoot)).toBe(true);
      expect(distractorParagraph(resultsRoot) !== null).toBe(authoredDistractor);
      if (authoredDistractor) {
        expect(choicesRuledOut(distractorParagraph(resultsRoot)!).size).toBeGreaterThanOrEqual(2);
      }
      cleanup();
    }
  });

  /**
   * Proof that the Grammar guard above still bites.
   *
   * The blunt text search it replaced also rejected verb-0059's *approved*
   * distractor paragraph, so the guard had to get more precise — which is only
   * worth anything if it still rejects what the pilot actually prohibits. Both
   * prohibited shapes the validators name are asserted here, against synthetic
   * blocks, so no production content is involved.
   */
  it('still rejects a dedicated Other Choices section, not the approved distractor paragraph', () => {
    const approvedParagraph: StructuredExplanationBlock = {
      type: 'paragraph',
      label: DISTRACTOR_LABEL,
      text: 'Choices A and D use plural **have**. Choice B pairs singular **has** with plural **their**.',
    };
    const firstRoot = () => screen.getAllByTestId('structured-explanation')[0];
    const renderBlocks = (blocks: StructuredExplanationBlock[]) =>
      renderWithTheme(<StructuredExplanationRenderer explanation={{ blocks }} />);

    // The approved paragraph passes, and reads as substantive.
    renderBlocks([approvedParagraph]);
    expect(noAlternativeSection(firstRoot())).toBe(true);
    expect(choicesRuledOut(distractorParagraph(firstRoot())!).size).toBeGreaterThanOrEqual(2);
    cleanup();

    // `alternative_solution` — the block validate-grammar-pilot.mjs fails on.
    renderBlocks([
      approvedParagraph,
      { type: 'alternative_solution', title: 'Other Choices', blocks: [{ type: 'paragraph', text: 'A is wrong.' }] },
    ]);
    expect(noAlternativeSection(firstRoot())).toBe(false);
    cleanup();

    // A prohibited section *heading*, in the other wording the validators name.
    renderBlocks([{ type: 'paragraph', label: 'Corrected Alternatives', text: 'A becomes B.' }]);
    expect(noAlternativeSection(firstRoot())).toBe(false);
  });

  it('renders the 12 approved Spelling explanations through Practice and Results without Number Series sections', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const spellingIds = [
      'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
      'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
    ];
    const memoryAidIds = new Set([
      'cler-0012', 'cler-0013', 'cler-0015',
      'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
    ]);
    const questions = spellingIds.map((id) => catalog.questions.get(id)!);
    const correctSpellingText = new Map<string, string>();
    const memoryAidText = new Map<string, string>();

    for (const question of questions) {
      const id = question.id;
      const correctSpellingBlock = question.structuredExplanation?.blocks.find(
        (block) => block.type === 'paragraph' && block.label === 'Correct Spelling'
      );
      const memoryAidBlock = question.structuredExplanation?.blocks.find(
        (block) => block.type === 'paragraph' && block.label === 'Memory Aid'
      );
      if (!correctSpellingBlock || correctSpellingBlock.type !== 'paragraph') {
        throw new Error(`${id}: Correct Spelling paragraph is missing`);
      }
      correctSpellingText.set(id, correctSpellingBlock.text);
      if (memoryAidIds.has(id)) {
        if (memoryAidBlock?.type !== 'paragraph') {
          throw new Error(`${id}: visible Memory Aid paragraph is missing`);
        }
        memoryAidText.set(id, memoryAidBlock.text);
      } else {
        expect(memoryAidBlock).toBeUndefined();
      }

      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Show Explanation' }));
      const practiceRoots = screen.getAllByTestId('structured-explanation');
      expect(practiceRoots).toHaveLength(2);
      expect(practiceRoots.every((root) => within(root).getByText('Correct Spelling'))).toBe(true);
      expect(practiceRoots.every((root) => root.textContent?.includes(stripInlineFormatting(correctSpellingBlock.text)))).toBe(true);
      expect(practiceRoots.every((root) => root.querySelector('strong, em') !== null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Pattern/) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Step [123]/) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Other Choices|corrected alternatives/i) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByRole('button', { name: /Memory Aid/ }) === null)).toBe(true);
      const aid = memoryAidText.get(id);
      if (aid !== undefined) {
        expect(practiceRoots.every((root) => within(root).getByText('Memory Aid'))).toBe(true);
        expect(practiceRoots.every((root) => root.textContent?.includes(stripInlineFormatting(aid)))).toBe(true);
      }
      cleanup();
    }

    // One Results screen over the whole approved set — see `attemptOver`.
    renderWithTheme(
      <ResultsScreen
        attempt={attemptOver('spelling-structured-results', 'Subprofessional', questions)}
        questionIndex={new Map(questions.map((question) => [question.id, question]))}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );
    const resultsCards = resultsExplanationCards(spellingIds);

    for (const id of spellingIds) {
      const resultsRoot = resultsCards.get(id)!;
      expect(within(resultsRoot).getByText('Correct Spelling')).toBeInTheDocument();
      expect(resultsRoot.textContent).toContain(stripInlineFormatting(correctSpellingText.get(id)!));
      expect(resultsRoot.querySelector('strong, em')).not.toBeNull();
      expect(within(resultsRoot).queryByText(/Pattern/)).not.toBeInTheDocument();
      expect(within(resultsRoot).queryByRole('button', { name: /Memory Aid/ })).toBeNull();
      const aid = memoryAidText.get(id);
      if (aid !== undefined) {
        expect(within(resultsRoot).getByText('Memory Aid')).toBeInTheDocument();
        expect(resultsRoot.textContent).toContain(stripInlineFormatting(aid));
      }
    }
  });

  it('renders all 24 approved Filing explanations through Practice and Results in one card', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const filingIds = [
      'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
      'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
      'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
      'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
      'cler-0038', 'cler-0039',
    ];
    const redesignedFilingIds = new Set([
      'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
      'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
    ]);
    const filingRationaleExamples: Record<string, string> = {
      'cler-0053': 'Abad, Bernardo S.',
      'cler-0054': 'San Juan Development Corporation (The)',
      'cler-0058': 'PERSONNEL',
      'cler-0059': 'Banal',
      'cler-0060': 'Dimaculangan',
      'cler-0001': 'Bartolome',
      'cler-0002': 'Albert',
      'cler-0003': 'A.',
      'cler-0004': 'Fajardo',
      'cler-0005': 'Villalobos',
    };
    const filingOrderExamples: Record<string, string> = {
      'cler-0006': 'Lacsina, Myrna',
      'cler-0007': 'De la Cruz, Maria',
      'cler-0008': 'Salazar, Mila',
      'cler-0009': 'Garces, Tony',
      'cler-0010': 'Mendoza, Roberto (no suffix)',
      'cler-0011': 'De Jesus, Mario',
      'cler-0031': 'Banzon, Felipe',
      'cler-0032': 'Samson, Rafael',
      'cler-0033': 'Villa, Carmen',
      'seed-cler-001': 'De Castro, Pedro',
      'cler-0036': 'San Pedro, Lito',
      'cler-0037': 'Bureau of Customs',
      'cler-0038': 'Navarro, Cecile',
      'cler-0039': 'Ace Hardware Philippines',
    };

    const questions = filingIds.map((id) => catalog.questions.get(id)!);

    for (const question of questions) {
      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Show Explanation' }));
      const practiceRoots = screen.getAllByTestId('structured-explanation');
      expect(practiceRoots.length).toBeGreaterThan(0);
      expect(practiceRoots.every((root) => root.textContent?.includes('Correct Answer:'))).toBe(true);
      expect(practiceRoots.every((root) => root.querySelector('strong, em') !== null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Other Choices|corrected alternatives/i) === null)).toBe(true);
      if (redesignedFilingIds.has(question.id)) {
        expect(practiceRoots.every((root) => within(root).getByText('Rationale'))).toBe(true);
        expect(practiceRoots.every((root) => within(root).queryByText('Filing Order') === null)).toBe(true);
        expect(practiceRoots.every((root) => root.textContent?.includes(filingRationaleExamples[question.id]))).toBe(true);
      } else if (filingOrderExamples[question.id]) {
        expect(practiceRoots.every((root) => within(root).getByText('Filing Order'))).toBe(true);
        expect(practiceRoots.every((root) => root.textContent?.includes(filingOrderExamples[question.id]))).toBe(true);
      }
      cleanup();
    }

    // One Results screen over the whole approved set, instead of 24 rebuilds of
    // the same score header and filter bar around a single item.
    renderWithTheme(
      <ResultsScreen
        attempt={attemptOver('filing-structured-results', 'Subprofessional', questions)}
        questionIndex={new Map(questions.map((question) => [question.id, question]))}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );
    const resultsCards = resultsExplanationCards(filingIds);

    for (const id of filingIds) {
      const resultsRoot = resultsCards.get(id)!;
      expect(resultsRoot.textContent).toContain('Correct Answer:');
      expect(resultsRoot.querySelector('strong, em')).not.toBeNull();
      expect(within(resultsRoot).queryByText(/Other Choices|corrected alternatives/i)).toBeNull();
      if (redesignedFilingIds.has(id)) {
        expect(within(resultsRoot).getByText('Rationale')).toBeInTheDocument();
        expect(within(resultsRoot).queryByText('Filing Order')).toBeNull();
        expect(resultsRoot.textContent).toContain(filingRationaleExamples[id]);
      } else if (filingOrderExamples[id]) {
        expect(within(resultsRoot).getByText('Filing Order')).toBeInTheDocument();
        expect(resultsRoot.textContent).toContain(filingOrderExamples[id]);
      }
    }
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
