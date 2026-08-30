// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, Question } from '@/types';
import { loadContentCatalog } from '@/data/questionBank';
import { ThemeProvider } from '@/context/ThemeContext';
import { QuestionCard } from './QuestionCard';
import { ResultsScreen } from './ResultsScreen';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';
import { MathValue } from './MathValue';
import { MathText, formatLatexForAria } from './mathText';

function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

function mathLabels(testId: string, root: ParentNode): string[] {
  return [...root.querySelectorAll(`[data-testid="${testId}"]`)]
    .map((node) => node.getAttribute('aria-label') ?? '');
}

/** Every single stacked value on screen, read the way a screen reader would read it. */
function fractionLabels(root: ParentNode = document.body): string[] {
  return mathLabels('fraction-math-value', root);
}

/** Every grouped expression — a fraction with operators, fences, or a whole part. */
function expressionLabels(root: ParentNode = document.body): string[] {
  return mathLabels('math-expression', root);
}

/**
 * Stem math only: everything outside the choice list. The stem has no test id of
 * its own, and inventing one would change production markup for the sake of the
 * test — the radiogroup boundary is already an honest divider.
 */
function outsideChoices(testId: string): string[] {
  const choices = document.querySelector('[role="radiogroup"]');
  return [...document.querySelectorAll(`[data-testid="${testId}"]`)]
    .filter((node) => choices === null || !choices.contains(node))
    .map((node) => node.getAttribute('aria-label') ?? '');
}

const stemFractionLabels = () => outsideChoices('fraction-math-value');
const stemExpressionLabels = () => outsideChoices('math-expression');

/**
 * No LaTeX source may survive into the rendered page. A stray backslash or brace
 * is the exact symptom of a macro the tokenizer failed to consume.
 */
function assertNoLatexLeak(root: HTMLElement) {
  for (const raw of ['\\cancel', '\\cancelto', '\\frac', '\\times', '\\[', '\\]', '\\(', '\\)']) {
    expect(root.innerHTML, raw).not.toContain(raw);
  }
  expect(root.textContent).not.toMatch(/[\\{}]/);
}

/** One graded attempt over a single question, recorded as answered-and-wrong. */
function attemptOver(question: Question): Attempt {
  return {
    id: `math-text-${question.id}`,
    mode: 'practice',
    examLevel: 'Professional',
    questionCount: 1,
    correctCount: 0,
    answeredCount: 1,
    unansweredCount: 0,
    percentage: 0,
    passed: false,
    durationSeconds: 12,
    startedAt: 1,
    completedAt: 12_001,
    subjects: [{ subject: question.subject, total: 1, correct: 0, answered: 1, unanswered: 0, percentage: 0 }],
    items: [{
      questionId: question.id,
      subject: question.subject,
      topic: question.topic,
      selected: question.choices.find((choice) => choice.id !== question.correctOptionId)!.id,
      correct: question.correctOptionId,
      isCorrect: false,
    }],
  };
}

/**
 * A stem and choices whose every slash is ordinary prose. Synthetic on purpose:
 * no authored question contains these strings, and inventing content to prove a
 * guard would be the wrong way round. Each case is one the shared pattern must
 * refuse — a URL, a date, a conjunction, and a variant label.
 */
const slashProseQuestion: Question = {
  id: 'math-text-slash-guard',
  examLevel: 'Both',
  subject: 'General Information',
  topic: 'Civil Service Rules',
  difficulty: 'Easy',
  question: 'Read https://csc.gov.ph/faq before the 08/30/2026 deadline. Does it cover a permanent and/or temporary appointee, and is 1/2 of the fee refundable?',
  choices: [
    { id: 'A', text: 'Yes, for a permanent and/or temporary appointee' },
    { id: 'B', text: 'Only what A/B testing of the portal showed' },
    { id: 'C', text: 'See https://csc.gov.ph/faq' },
    { id: 'D', text: 'Only on 08/30/2026' },
  ],
  correctOptionId: 'A',
  explanation: 'Not exercised by this test.',
  tags: ['renderer-guard'],
};

/** Cancellation notation, exercised through the real structured-explanation path. */
const cancellationExplanation = {
  blocks: [
    { type: 'correct_answer' as const, text: 'A — 2' },
    {
      type: 'paragraph' as const,
      label: 'Rationale' as const,
      text: 'Cancel the common factor:\n\n\\[\n\\frac{\\cancelto{1}{13}}{12}\\times\\frac{24}{\\cancelto{1}{13}}\n\\]\n\nA lone factor cancels outright:\n\n\\[\n\\frac{\\cancel{5}}{\\cancel{5}}=1\n\\]',
    },
  ],
};

describe('shared math text renderer', () => {
  afterEach(cleanup);

  beforeEach(() => {
    // ThemeProvider resolves 'system' through matchMedia, which jsdom lacks.
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

  it('renders a stem sum as ONE expression, not two fraction fragments in prose', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0001');
    expect(question?.question).toBe('What is 3/8 + 5/12?');
    if (!question) return;

    renderWithTheme(
      <QuestionCard question={question} selectedOptionId={null} onSelectOption={vi.fn()} />
    );

    // `3/8 + 5/12` is one mathematical statement, so it is one `<math>` element —
    // not two stacked values with a prose-sized `+` stranded between them.
    expect(stemExpressionLabels()).toEqual(['3/8+5/12']);
    expect(stemFractionLabels()).toEqual([]);
    const stem = screen.getByTestId('math-expression');
    expect(stem.querySelectorAll('mfrac')).toHaveLength(2);
    expect([...stem.querySelectorAll('mo')].map((operator) => operator.textContent)).toEqual(['+']);
    // The wording around the math is preserved character for character.
    const stemBlock = stem.parentElement!;
    expect(stemBlock.textContent?.startsWith('What is ')).toBe(true);
    expect(stemBlock.textContent?.endsWith('?')).toBe(true);

    // Choice A is `1/2`; all five choices are single values, so all five stack.
    const choices = screen.getAllByRole('radio');
    expect(choices).toHaveLength(5);
    expect(choices.map((choice) => fractionLabels(choice))).toEqual([
      ['1/2'], ['8/20'], ['7/12'], ['11/24'], ['19/24'],
    ]);
    expect(choices[0].textContent).toContain('A');

    assertNoLatexLeak(document.body as HTMLElement);
  });

  it('keeps parentheses inside the same math presentation as the fractions they hold', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0006');
    expect(question?.question).toBe('What is (2/3) × (9/14)?');
    if (!question) return;

    renderWithTheme(
      <QuestionCard question={question} selectedOptionId={null} onSelectOption={vi.fn()} />
    );
    expect(stemExpressionLabels()).toEqual(['(2/3) × (9/14)']);
    expect(stemFractionLabels()).toEqual([]);

    const stem = screen.getByTestId('math-expression');
    expect(stem.querySelectorAll('mfrac')).toHaveLength(2);
    expect([...stem.querySelectorAll('mo')].map((operator) => operator.textContent)).toEqual(
      ['(', ')', '×', '(', ')']
    );
    // The fence and its contents share one `mrow`. That is the whole fix: MathML
    // only stretches a parenthesis to the height of what it encloses when the two
    // sit in the same row, so the parens are fraction-tall instead of prose-tall.
    for (const fence of [...stem.querySelectorAll('mo')].filter((node) => node.textContent === '(')) {
      expect(fence.parentElement?.nodeName.toLowerCase()).toBe('mrow');
      expect(fence.parentElement?.querySelector('mfrac')).not.toBeNull();
    }
    // Both operands and the operator hang off one row — one expression, not three.
    expect(stem.querySelector('mfrac')?.closest('math')).toBe(stem);

    const stemBlock = stem.parentElement!;
    expect(stemBlock.textContent?.startsWith('What is ')).toBe(true);
    expect(stemBlock.textContent?.endsWith('?')).toBe(true);
    assertNoLatexLeak(document.body as HTMLElement);
  });

  it('reads a mixed number as a whole part beside a real fraction, in stem and choice alike', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0004');
    // The stem uses vulgar-fraction characters; the choices use `4 3/8` form.
    expect(question?.question).toBe('What is 7¾ – 3⅝?');
    expect(question?.choices[0].text).toBe('4 3/8');
    if (!question) return;

    renderWithTheme(
      <QuestionCard question={question} selectedOptionId={null} onSelectOption={vi.fn()} />
    );
    // Authored text is unchanged — `¾` is read as a fraction rather than rewritten.
    expect(stemExpressionLabels()).toEqual(['7 3/4−3 5/8']);
    expect(stemFractionLabels()).toEqual([]);
    expect(document.querySelector('[data-testid="math-expression"]')?.querySelectorAll('mfrac')).toHaveLength(2);

    const choices = screen.getAllByRole('radio');
    expect(expressionLabels(choices[0])).toEqual(['4 3/8']);
    expect(fractionLabels(choices[0])).toEqual([]);
    const choiceMath = choices[0].querySelector('[data-testid="math-expression"]')!;
    // The whole number is a number in the same expression, not text beside it.
    expect(choiceMath.querySelector('mn')?.textContent).toBe('4');
    expect(choiceMath.querySelectorAll('mfrac')).toHaveLength(1);
    // The choice letter stays ordinary text outside the math.
    expect(choices[0].querySelector('[data-testid="math-expression"]')?.textContent).not.toContain('A');
    expect(choices[0].textContent).toContain('A');
    assertNoLatexLeak(document.body as HTMLElement);
  });

  it('adds no wrapper element around a stem — the math sits directly in the stem block', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0001');
    if (!question) return;

    renderWithTheme(
      <QuestionCard question={question} selectedOptionId={null} onSelectOption={vi.fn()} />
    );
    const stem = document.querySelector('[data-testid="math-expression"]')!.parentElement!;
    expect(stem.className).toContain('whitespace-pre-line');
    expect([...stem.childNodes].every((node) => node.nodeType === Node.TEXT_NODE || node.nodeName.toLowerCase() === 'math')).toBe(true);
    // Math must not introduce a scroll container into the question surface.
    expect(stem.querySelector('.overflow-x-auto')).toBeNull();
    expect(stem.querySelector('.overflow-y-auto')).toBeNull();
  });

  it('renders the same stem expression and stacked choices in Results item review', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0001');
    if (!question) return;

    renderWithTheme(
      <ResultsScreen
        attempt={attemptOver(question)}
        questionIndex={new Map([[question.id, question]])}
        onRetake={vi.fn()}
        onReturnToDashboard={vi.fn()}
      />
    );
    // A wrong answer opens its own review card, so stem and choices are both shown.
    // `11/24`, `8/20`, `7/12` and `1/2` appear nowhere but the choice list, so
    // finding them proves the choices stack; the stem is the grouped sum.
    expect(fractionLabels()).toEqual(
      expect.arrayContaining(['1/2', '8/20', '7/12', '11/24', '19/24'])
    );
    expect(expressionLabels()).toContain('3/8+5/12');
    await user.click(screen.getByRole('button', { name: 'Collapse question details' }));
    // Collapsed, the stem still renders as math: it lives outside the disclosure.
    expect(expressionLabels()).toEqual(['3/8+5/12']);
    expect(fractionLabels()).toEqual([]);
    assertNoLatexLeak(document.body as HTMLElement);
  });

  it('leaves ordinary slash text alone in stems and choices', () => {
    renderWithTheme(
      <QuestionCard question={slashProseQuestion} selectedOptionId={null} onSelectOption={vi.fn()} />
    );

    // The stem's only fraction is the genuine one; URL, date and conjunction stay
    // prose, and none of them is dragged into a grouped expression either.
    expect(stemFractionLabels()).toEqual(['1/2']);
    expect(stemExpressionLabels()).toEqual([]);
    const stem = screen.getByText(/Read https/);
    expect(stem.textContent).toContain('https://csc.gov.ph/faq');
    expect(stem.textContent).toContain('08/30/2026');
    expect(stem.textContent).toContain('and/or');

    // No choice contains math at all.
    for (const choice of screen.getAllByRole('radio')) {
      expect(fractionLabels(choice)).toEqual([]);
      expect(expressionLabels(choice)).toEqual([]);
    }
    expect(screen.getByText(/A\/B testing/)).toBeInTheDocument();
    expect(screen.getByText('Only on 08/30/2026')).toBeInTheDocument();
    expect(screen.getByText('See https://csc.gov.ph/faq')).toBeInTheDocument();
  });

  it('renders a lone value through the value renderer it replaced, byte for byte', () => {
    for (const value of ['3/8', '7/4', '5/8', '1/2']) {
      const { container: valueOnly } = render(<MathValue value={value} />);
      const { container: viaMathText } = render(<MathText text={value} keyPrefix="choice-A" />);
      expect(viaMathText.innerHTML, value).toBe(valueOnly.innerHTML);
      cleanup();
    }
  });

  it('groups every authored expression shape into one sized, spaced math element', () => {
    const cases: Array<[string, string, number]> = [
      ['3/8 + 5/12', '3/8+5/12', 2],
      ['(2/3) × (9/14)', '(2/3) × (9/14)', 2],
      ['4/5 ÷ 2/3', '4/5 ÷ 2/3', 2],
      ['2⅔ × 1½', '2 2/3 × 1 1/2', 2],
      ['7¾ – 3⅝', '7 3/4−3 5/8', 2],
      ['(5/6 + 1/4) ÷ (7/8 – 1/3)', '(5/6+1/4) ÷ (7/8−1/3)', 4],
      ['2⅔ × 1½ – (4/5 ÷ 2/3)', '2 2/3 × 1 1/2−(4/5 ÷ 2/3)', 4],
      ['4 3/8', '4 3/8', 1],
      ['7 1/3', '7 1/3', 1],
      ['132 5/8', '132 5/8', 1],
    ];
    for (const [source, label, fractionCount] of cases) {
      const { container } = render(<MathText text={source} keyPrefix="case" />);
      const math = container.querySelectorAll('[data-testid="math-expression"]');
      expect(math, source).toHaveLength(1);
      expect(math[0].getAttribute('aria-label'), source).toBe(label);
      expect(math[0].getAttribute('role')).toBe('math');
      // One element means one font size for fractions, operators, and fences.
      expect(math[0].getAttribute('class')).toContain('text-[1.2em]');
      expect(math[0].querySelectorAll('mfrac'), source).toHaveLength(fractionCount);
      expect(container.querySelectorAll('[data-testid="fraction-math-value"]'), source).toHaveLength(0);
      assertNoLatexLeak(container);
      cleanup();
    }
  });

  it('renders a lone fraction as a single stacked value, not a grouped expression', () => {
    for (const source of ['3/8', '7/4', '5/8', '4/3', '22/7']) {
      const { container } = render(<MathText text={source} keyPrefix="case" />);
      expect(fractionLabels(container), source).toEqual([source]);
      expect(expressionLabels(container), source).toEqual([]);
      expect(container.querySelectorAll('mfrac'), source).toHaveLength(1);
      cleanup();
    }
  });

  it('reads a fraction that closes a sentence or a clause, punctuation and all', () => {
    // The boundary guard used to refuse every following dot, so an authored stem
    // ending `One of the numbers is 4/3.` printed a flat slash while the very
    // same fraction stacked mid-sentence. Sentence punctuation is not a
    // continuation of the number, so it no longer suppresses the fraction.
    for (const [text, value] of [
      ['One of the numbers is 4/3.', '4/3'],
      ['Use 5/8, of the total.', '5/8'],
      ['The value is 3/4;', '3/4'],
      ['The ratio is 7/9:', '7/9'],
      ['Is the answer 1/2?', '1/2'],
      ['The remainder is 9/16 (exactly).', '9/16'],
    ] as const) {
      const { container } = render(<MathText text={text} keyPrefix="sentence" />);
      expect(fractionLabels(container), text).toEqual([value]);
      expect(expressionLabels(container), text).toEqual([]);
      expect(container.querySelectorAll('mfrac'), text).toHaveLength(1);
      // Only the slash moves into the math; every other character, the closing
      // punctuation included, is still ordinary prose in its original place.
      expect(container.textContent, text).toBe(text.replace(value, value.replace('/', '')));
      cleanup();
    }

    // A grouped expression that closes a sentence stays one grouped expression.
    const { container } = render(<MathText text="Compute (2/3) × (9/14)." keyPrefix="sentence-group" />);
    expect(expressionLabels(container)).toEqual(['(2/3) × (9/14)']);
    expect(fractionLabels(container)).toEqual([]);
    expect(container.querySelectorAll('mfrac')).toHaveLength(2);
    expect(container.textContent?.startsWith('Compute ')).toBe(true);
    expect(container.textContent?.endsWith('.')).toBe(true);
    assertNoLatexLeak(container);
  });

  it('still refuses a thousands separator and a dot that continues the token', () => {
    // The price of allowing sentence punctuation is that two boundaries have to
    // be exact. A comma three digits from the slash is a grouped whole number —
    // `1,061/8` is sixty-one eighths only to a parser that ignores the prose it
    // sits in — and a dot followed by a word character or a slash is a decimal,
    // a file extension, or another path segment, never an end of sentence.
    for (const text of [
      '1,061/8',
      'The improper form is 1,061/8.',
      'Total is 5,305/16 in all.',
      'The file 3/4.html was renamed.',
      'Open reports/2/5.csv today.',
    ]) {
      const { container } = render(<MathText text={text} keyPrefix="boundary" />);
      expect(container.querySelectorAll('math'), text).toHaveLength(0);
      expect(container.textContent, text).toBe(text);
      cleanup();
    }
  });

  it('stacks the fraction ending the num-0139 stem, with its mixed-number choices', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0139');
    expect(question?.question).toBe(
      'The product of two numbers is 8. One of the numbers is 4/3. What is the sum of the two numbers?'
    );
    if (!question) return;

    renderWithTheme(
      <QuestionCard question={question} selectedOptionId={null} onSelectOption={vi.fn()} />
    );

    // `4/3.` stacks; the `8.` that ends the sentence before it is a bare number
    // and stays prose, which is the whole distinction the guard has to keep.
    expect(stemFractionLabels()).toEqual(['4/3']);
    expect(stemExpressionLabels()).toEqual([]);
    const stem = screen.getByTestId('fraction-math-value').parentElement!;
    expect(stem.textContent).toContain('The product of two numbers is 8.');
    expect(stem.textContent).toContain('. What is the sum of the two numbers?');

    const choices = screen.getAllByRole('radio');
    expect(choices.map((choice) => expressionLabels(choice))).toEqual([
      ['7 1/3'], ['9 1/3'], [], ['6 3/4'], ['5 1/3'],
    ]);
    expect(choices[2].textContent).toContain('8');
    assertNoLatexLeak(document.body as HTMLElement);
  });

  it('renders ordinary prose as ordinary text, converting nothing', () => {
    const prose = [
      'The office received 360 folders.',
      'The answer is 135.',
      'There are 12 people.',
      '08/30/2026',
      'https://csc.gov.ph/faq',
      'and/or',
      'A/B testing',
      'Filed on 08/30/2026 under and/or rules, per https://csc.gov.ph/faq.',
      'Section 12 of Rule 4 covers 24 offices.',
      'A total of 1,250 forms — 360 of them audited — were logged.',
    ];
    for (const text of prose) {
      const { container } = render(<MathText text={text} keyPrefix="prose" />);
      expect(container.querySelectorAll('math'), text).toHaveLength(0);
      expect(container.textContent, text).toBe(text);
      cleanup();
    }
  });

  it('keeps a comma-separated run of fractions a list of values, not one expression', () => {
    // A number series is a sequence of separate terms. Joining them with a comma
    // into a single expression would misrepresent what the item is asking.
    const { container } = render(<MathText text="2/4, 1/2, 2/6, 1/3, 2/8, 1/4, 2/10, ___" keyPrefix="series" />);
    expect(fractionLabels(container)).toEqual(['2/4', '1/2', '2/6', '1/3', '2/8', '1/4', '2/10']);
    expect(expressionLabels(container)).toEqual([]);
    expect(container.textContent).toContain(', ');
    expect(container.textContent).toContain('___');
  });

  it('keeps a fraction beside a dash or a bare number out of a false expression', () => {
    // The operator only binds when a real operand follows it, and a bare number
    // never seeds math on its own.
    for (const [text, fractions] of [
      ['The rate — 3/4 of the fee — applies.', ['3/4']],
      ['Only 1/5 of the 360 folders were audited.', ['1/5']],
      ['Use π ≈ 22/7 for the estimate.', ['22/7']],
      ['A number increased by 4/5 of itself equals 90.', ['4/5']],
    ] as const) {
      const { container } = render(<MathText text={text} keyPrefix="guard" />);
      expect(fractionLabels(container), text).toEqual([...fractions]);
      expect(expressionLabels(container), text).toEqual([]);
      cleanup();
    }
  });

  it('renders plain numeric roots and caret powers as MathML, without requiring duplicate LaTex', () => {
    const { container } = render(
      <MathText text="√0.0081, ∛8, (2/3)^2, 10^-3, and x^2" keyPrefix="plain-notation" />,
    );

    const maths = [...container.querySelectorAll('math')];
    expect(maths.some((math) => math.querySelector('msqrt')?.textContent === '0.0081')).toBe(true);
    expect(maths.some((math) => math.querySelector('mroot')?.textContent === '83')).toBe(true);
    expect(maths.filter((math) => math.querySelector('msup')).length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).not.toContain('^2');
    expect(container.textContent).not.toContain('^-3');
  });

  it('draws a cancellation as a struck value carrying what it becomes', () => {
    const { container } = render(
      <StructuredExplanationRenderer explanation={cancellationExplanation} theme="light" />
    );

    const marks = [...container.querySelectorAll('[data-testid="math-cancel"]')];
    expect(marks).toHaveLength(4);

    // `\cancelto{1}{13}`: 13 struck through, with the 1 it reduces to beside it.
    const cancelTo = marks.slice(0, 2);
    for (const mark of cancelTo) {
      const from = mark.querySelector('[data-cancel="from"]');
      const to = mark.querySelector('[data-cancel="to"]');
      expect(from?.textContent).toBe('13');
      expect(from?.getAttribute('class')).toContain('line-through');
      expect(to?.textContent).toBe('1');
    }

    // `\cancel{5}`: struck, with no replacement value to show.
    for (const mark of marks.slice(2)) {
      expect(mark.getAttribute('data-cancel')).toBe('from');
      expect(mark.textContent).toBe('5');
      expect(mark.getAttribute('class')).toContain('line-through');
    }

    const equations = [...container.querySelectorAll('[data-testid="structured-latex-equation"]')];
    expect(equations.map((equation) => equation.getAttribute('aria-label'))).toEqual([
      '13 (cancels to 1)/12 × 24/13 (cancels to 1)',
      '5 (cancels)/5 (cancels)=1',
    ]);

    // The cancellation is real MathML, not styled text.
    expect(marks[0].closest('math')).not.toBeNull();
    expect(marks[0].nodeName.toLowerCase()).toBe('msup');
    assertNoLatexLeak(container);
  });

  it('reads cancellation macros honestly for assistive technology', () => {
    expect(formatLatexForAria('\\cancel{5}')).toBe('5 (cancels)');
    expect(formatLatexForAria('\\cancelto{1}{13}')).toBe('13 (cancels to 1)');
    expect(formatLatexForAria('\\frac{\\cancelto{1}{13}}{12}\\times\\frac{24}{\\cancelto{1}{13}}'))
      .toBe('13 (cancels to 1)/12 × 24/13 (cancels to 1)');
    // Cancellation resolves inside a fraction regardless of nesting order.
    expect(formatLatexForAria('\\cancel{\\frac{2}{4}}')).toBe('2/4 (cancels)');
  });

  it('leaves existing explanation prose rendering unchanged', () => {
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [{
            type: 'paragraph',
            text: 'The answer is **19/24**, documented at docs/1/5 and unrelated to A/B testing.',
          }],
        }}
        theme="light"
      />
    );
    // A bare fraction in prose still stacks; a path segment and a variant label do not.
    expect(fractionLabels(container)).toEqual(['19/24']);
    expect(expressionLabels(container)).toEqual([]);
    expect(container.textContent).toContain('docs/1/5');
    expect(container.textContent).toContain('A/B testing');
    expect(container.querySelector('strong')).not.toBeNull();
  });
});
