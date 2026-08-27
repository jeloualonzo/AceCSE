// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, ExamLevel, Question, StructuredExplanationBlock } from '@/types';
import { loadContentCatalog } from '@/data/questionBank';
import { ThemeProvider } from '@/context/ThemeContext';
import { QuestionCard } from './QuestionCard';
import { ResultsScreen } from './ResultsScreen';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';

const stripInlineFormatting = (text: string) => text
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\*([^*]+)\*/g, '$1');

const pilotQuestion: Question = {
  id: 'number-series-renderer-pilot',
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

function assertProductionMath(root: HTMLElement, expectedEquationCount: number) {
  expect(within(root).getByText('Rationale')).toBeInTheDocument();
  expect(root.textContent).not.toContain('\\[');
  expect(root.textContent).not.toContain('\\]');
  expect(root.querySelectorAll('[data-testid="structured-latex-math"]').length).toBeGreaterThan(0);
  const equations = [...root.querySelectorAll('[data-testid="structured-latex-equation"]')]
    .filter((equation) => !equation.closest('[hidden]'));
  expect(equations).toHaveLength(expectedEquationCount);
  expect(equations.every((equation) => equation.getAttribute('role') === 'math')).toBe(true);
  expect(equations.every((equation) => equation.parentElement?.getAttribute('data-testid') === 'structured-latex-math')).toBe(true);
  expect(equations.every((equation) => equation.className.includes('overflow-hidden'))).toBe(true);
  const mathStacks = [...root.querySelectorAll('[data-testid="structured-latex-math"]')]
    .filter((stack) => !stack.closest('[hidden]'));
  expect(mathStacks.every((stack) => stack.className.includes('space-y-3') && stack.className.includes('py-1'))).toBe(true);
  expect(equations.every((equation) => !equation.className.match(/(?:^| )py-/))).toBe(true);
  expect(root.querySelector('.overflow-x-auto')).toBeNull();
  expect(root.querySelector('.overflow-y-auto')).toBeNull();
  expect(root.querySelector('.overflow-y-scroll')).toBeNull();
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
    expect(roots.every((root) => Array.from(root.querySelectorAll('p')).some((paragraph) => paragraph.textContent === 'Correct Answer: B. 24'))).toBe(true);
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
    const legacyQuestion = { ...pilotQuestion, id: 'number-series-legacy-fallback', structuredExplanation: undefined };
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
    expect(Array.from(root.querySelectorAll('p')).some((paragraph) => paragraph.textContent === 'Correct Answer: B. 24')).toBe(true);
    expect(within(root).getByText('What to Notice')).toBeInTheDocument();
    expect(within(root).getByText('Pattern')).toBeInTheDocument();
    expect(within(root).getByText('Apply the Pattern')).toBeInTheDocument();
    expect(within(root).getByText('Rule')).toBeInTheDocument();
    expect(within(root).queryByText(/Step [123]/)).toBeNull();
    expect(screen.queryByText('Legacy explanation remains available as fallback.')).not.toBeInTheDocument();
  });

  it('renders all production Number Series Rationales as vertically stacked equations in Practice and Results', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const targets = [
      ['num-0019', 4],
      ['num-0020', 4],
      ['num-0021', 5],
      ['num-0022', 5],
      ['num-0023', 4],
      ['num-0024', 6],
      ['num-0025', 3],
      ['num-0026', 5],
      ['num-0108', 7],
      ['num-0137', 4],
      ['num-0147', 5],
    ] as const;

    for (const [id, expectedEquationCount] of targets) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      if (!question) continue;

      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );
      await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
      for (const root of screen.getAllByTestId('structured-explanation')) {
        assertProductionMath(root, expectedEquationCount);
      }
      if (id === 'num-0137') {
        const fractionValues = screen.getAllByTestId('fraction-math-value');
        expect(fractionValues).toHaveLength(16);
        expect(fractionValues.filter((value) => value.getAttribute('aria-label') === '1/5')).toHaveLength(5);
        expect(fractionValues.every((value) => value.getAttribute('role') === 'math' && value.querySelector('mfrac'))).toBe(true);
        expect(fractionValues.every((value) => value.className.includes('text-[1.2em]'))).toBe(true);
      } else {
        expect(screen.queryByTestId('fraction-math-value')).toBeNull();
      }
      if (id === 'num-0147') {
        expect(screen.getAllByTestId('structured-explanation').every((root) => Array.from(root.querySelectorAll('p')).some((paragraph) => paragraph.textContent === 'Correct Answer: D. −144'))).toBe(true);
      }

      cleanup();
      const attempt: Attempt = {
        id: `number-series-results-${id}`,
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
        subjects: [{ subject: question.subject, total: 1, correct: 1, answered: 1, unanswered: 0, percentage: 100 }],
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
      assertProductionMath(screen.getByTestId('structured-explanation'), expectedEquationCount);
      if (id === 'num-0137') {
        const fractionValues = screen.getAllByTestId('fraction-math-value');
        expect(fractionValues).toHaveLength(14);
        expect(fractionValues.filter((value) => value.getAttribute('aria-label') === '1/5')).toHaveLength(3);
        expect(fractionValues.every((value) => value.getAttribute('role') === 'math' && value.querySelector('mfrac'))).toBe(true);
        expect(fractionValues.every((value) => value.className.includes('text-[1.2em]'))).toBe(true);
      } else {
        expect(screen.queryByTestId('fraction-math-value')).toBeNull();
      }
      if (id === 'num-0147') {
        expect(Array.from(screen.getByTestId('structured-explanation').querySelectorAll('p')).some((paragraph) => paragraph.textContent === 'Correct Answer: D. −144')).toBe(true);
      }
      cleanup();
    }
  });

  it('renders Age Problems Rationales and optional Mental Shortcuts consistently in Practice and Results', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const targets = [
      ['num-0030', 10, 0],
      ['num-0031', 8, 6],
      ['num-0142', 8, 8],
    ] as const;

    for (const [id, standardEquationCount, shortcutEquationCount] of targets) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      if (!question) continue;

      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );
      await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
      for (const root of screen.getAllByTestId('structured-explanation')) {
        assertProductionMath(root, standardEquationCount);
        expect(root.textContent).toContain(`Correct Answer: ${question.correctOptionId}.`);
        expect(within(root).getByText('Rationale')).toBeInTheDocument();
        expect(root.querySelectorAll('h5')).toHaveLength(1);
        expect(root.textContent).not.toMatch(/Solution|Remember|Exam Tip|Alternative Method|Rule|Step [123]/);
        expect(root.textContent).not.toContain('\\(');
        expect(root.textContent).not.toContain('\\)');

        const shortcutControl = within(root).queryByRole('button', { name: 'Mental Shortcut' });
        if (shortcutEquationCount === 0) {
          expect(shortcutControl).toBeNull();
          expect(within(root).queryByTestId('structured-collapsible')).toBeNull();
          continue;
        }

        expect(shortcutControl).toBeInTheDocument();
        const shortcutContent = within(root).getByTestId('structured-collapsible-content');
        expect(shortcutControl).toHaveAttribute('aria-expanded', 'false');
        expect(shortcutContent).toHaveAttribute('hidden');
        await user.click(shortcutControl!);
        expect(shortcutControl).toHaveAttribute('aria-expanded', 'true');
        expect(shortcutContent).not.toHaveAttribute('hidden');
        const shortcutLead = id === 'num-0142'
          ? /In 5 years, three people gain a total of 15 years/
          : /Both people become 2 years older/;
        expect(within(shortcutContent).getByText(shortcutLead)).toBeVisible();
        assertProductionMath(root, standardEquationCount + shortcutEquationCount);
        await user.click(shortcutControl!);
        expect(shortcutContent).toHaveAttribute('hidden');
      }
      cleanup();

      renderWithTheme(
        <ResultsScreen
          attempt={attemptOver(`age-problems-results-${id}`, 'Professional', [question])}
          questionIndex={new Map([[question.id, question]])}
          onRetake={vi.fn()}
          onReturnToDashboard={vi.fn()}
        />
      );
      const resultsRoot = screen.getByTestId('structured-explanation');
      assertProductionMath(resultsRoot, standardEquationCount);
      expect(resultsRoot.textContent).toContain(`Correct Answer: ${question.correctOptionId}.`);
      expect(within(resultsRoot).getByText('Rationale')).toBeInTheDocument();
      const resultsShortcut = within(resultsRoot).queryByRole('button', { name: 'Mental Shortcut' });
      if (shortcutEquationCount === 0) {
        expect(resultsShortcut).toBeNull();
      } else {
        expect(resultsShortcut).toBeInTheDocument();
        const resultsShortcutContent = within(resultsRoot).getByTestId('structured-collapsible-content');
        expect(resultsShortcutContent).toHaveAttribute('hidden');
        await user.click(resultsShortcut!);
        expect(resultsShortcutContent).not.toHaveAttribute('hidden');
        assertProductionMath(resultsRoot, standardEquationCount + shortcutEquationCount);
      }
      cleanup();
    }
  });

  it('renders the migrated Batch 2–4 production Rationales as one clean section in Practice and Results', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const targets = [
      ['num-0022', 5],
      ['num-0023', 4],
      ['num-0024', 6],
      ['num-0025', 3],
      ['num-0026', 5],
      ['num-0108', 7],
      ['num-0137', 4],
      ['num-0147', 5],
    ] as const;
    const questions = targets.map(([id]) => catalog.questions.get(id)).filter((question): question is Question => Boolean(question));
    expect(questions).toHaveLength(targets.length);

    for (const [id, expectedEquationCount] of targets) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      if (!question) continue;

      renderWithTheme(
        <QuestionCard
          question={question}
          selectedOptionId={question.correctOptionId}
          onSelectOption={vi.fn()}
          instantFeedback
        />
      );
      await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
      for (const root of screen.getAllByTestId('structured-explanation')) {
        assertProductionMath(root, expectedEquationCount);
        expect(within(root).getAllByText('Rationale')).toHaveLength(1);
        expect(root.querySelectorAll('h5')).toHaveLength(1);
        expect(root.textContent).not.toMatch(/Alternative Method|What to Notice|Pattern|Apply the Pattern|Rule|Step [123]/);
      }
      cleanup();
    }

    renderWithTheme(
      <ResultsScreen
        attempt={attemptOver('number-series-migrated-results', 'Professional', questions)}
        questionIndex={new Map(questions.map((question) => [question.id, question]))}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );
    const resultsCards = resultsExplanationCards(questions.map((question) => question.id));
    for (const [id, expectedEquationCount] of targets) {
      const root = resultsCards.get(id)!;
      assertProductionMath(root, expectedEquationCount);
      expect(within(root).getAllByText('Rationale')).toHaveLength(1);
      expect(root.querySelectorAll('h5')).toHaveLength(1);
      expect(root.textContent).not.toMatch(/Alternative Method|What to Notice|Pattern|Apply the Pattern|Rule|Step [123]/);
    }
  });

  it('renders all four Grammar pilot explanations as exact Rationale-only blocks through Practice and Results', async () => {
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
      const blocks = question.structuredExplanation?.blocks ?? [];
      expect(blocks).toHaveLength(2);
      expect(blocks[0]?.type).toBe('correct_answer');
      expect(blocks[1]).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => block.type === 'alternative_solution' || block.type === 'step' || block.type === 'rule')).toBe(false);

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
      expect(practiceRoots.every((root) => root.textContent?.includes(`Correct Answer: ${question.correctOptionId}.`))).toBe(true);
      expect(practiceRoots.every((root) => root.textContent?.includes(answerTexts[id]))).toBe(true);
      expect(practiceRoots.every((root) => within(root).getByText('Rationale'))).toBe(true);
      expect(practiceRoots.every((root) => root.querySelectorAll('h5').length === 1)).toBe(true);
      expect(practiceRoots.every((root) => !/What to Notice|Apply the Rule|Why the other choices fail|Rule|Alternative Method|Pattern|Step [123]/.test(root.textContent ?? ''))).toBe(true);
      expect(practiceRoots.every((root) => root.querySelector('strong, em') !== null)).toBe(true);

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
      expect(resultsRoot.textContent).toContain(`Correct Answer: ${question.correctOptionId}.`);
      expect(resultsRoot.textContent).toContain(answerTexts[id]);
      expect(within(resultsRoot).getByText('Rationale')).toBeInTheDocument();
      expect(resultsRoot.querySelectorAll('h5')).toHaveLength(1);
      expect(/What to Notice|Apply the Rule|Why the other choices fail|Rule|Alternative Method|Pattern|Step [123]/.test(resultsRoot.textContent ?? '')).toBe(false);
      expect(resultsRoot.querySelector('strong, em')).not.toBeNull();
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
    const questions = spellingIds.map((id) => catalog.questions.get(id)!);
    const rationaleText = new Map<string, string>();

    for (const question of questions) {
      const id = question.id;
      const rationaleBlock = question.structuredExplanation?.blocks.find(
        (block) => block.type === 'paragraph' && block.label === 'Rationale'
      );
      if (!rationaleBlock || rationaleBlock.type !== 'paragraph') {
        throw new Error(`${id}: Rationale paragraph is missing`);
      }
      rationaleText.set(id, rationaleBlock.text);
      expect(question.structuredExplanation?.blocks).toHaveLength(2);
      expect(question.structuredExplanation?.blocks[0]?.type).toBe('correct_answer');
      expect(question.structuredExplanation?.blocks[1]).toEqual(rationaleBlock);

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
      expect(practiceRoots.every((root) => within(root).getByText('Rationale'))).toBe(true);
      expect(practiceRoots.every((root) => root.textContent?.includes(stripInlineFormatting(rationaleText.get(id)!)))).toBe(true);
      expect(practiceRoots.every((root) => root.querySelector('strong, em') !== null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText('Correct Spelling') === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Pattern/) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Step [123]/) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText(/Other Choices|corrected alternatives/i) === null)).toBe(true);
      expect(practiceRoots.every((root) => within(root).queryByText('Memory Aid') === null)).toBe(true);
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
      expect(within(resultsRoot).getByText('Rationale')).toBeInTheDocument();
      expect(resultsRoot.textContent).toContain(stripInlineFormatting(rationaleText.get(id)!));
      expect(resultsRoot.querySelector('strong, em')).not.toBeNull();
      expect(within(resultsRoot).queryByText('Correct Spelling')).toBeNull();
      expect(within(resultsRoot).queryByText(/Pattern/)).not.toBeInTheDocument();
      expect(within(resultsRoot).queryByText('Memory Aid')).toBeNull();
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
      'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
      'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
      'cler-0038', 'cler-0039',
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
      'cler-0006': 'Lacsina',
      'cler-0007': 'De la Cruz',
      'cler-0008': 'Salazar',
      'cler-0009': 'Garces',
      'cler-0010': 'unsuffixed name',
      'cler-0011': 'De Jesus',
      'cler-0031': 'Banzon',
      'cler-0032': 'Samson',
      'cler-0033': 'Villamor',
      'seed-cler-001': 'Del Fierro',
      'cler-0036': 'San Pedro',
      'cler-0037': 'Local Government Finance',
      'cler-0038': 'Navarro',
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
      }
    }
  });

  it('renders production num-0024 with only its Rationale in Results', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0024');
    expect(question).toBeTruthy();
    if (!question) return;

    renderWithTheme(
      <ResultsScreen
        attempt={attemptOver('structured-results-num-0024', 'Professional', [question])}
        questionIndex={new Map([[question.id, question]])}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );

    const root = screen.getByTestId('structured-explanation');
    assertProductionMath(root, 6);
    expect(within(root).getAllByText('Rationale')).toHaveLength(1);
    expect(within(root).queryByRole('button', { name: /Alternative Method/ })).toBeNull();
    expect(within(root).queryByTestId('structured-alternative-method')).toBeNull();
    expect(root.querySelectorAll('h5')).toHaveLength(1);
    expect(root.querySelector('.rounded-lg')).toBeNull();
  });
});
