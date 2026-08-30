// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { ADMIN_BASE } from '@/navigation/appRoutes';
import { ADMIN_NAV_ITEMS } from '@/navigation/adminNavConfig';
import { NAV_ITEMS } from '@/navigation/navConfig';
import {
  CONTENT_BANK_BASE,
  CONTENT_BANK_QA_ROUTE,
  CONTENT_BANK_QA_SEGMENT,
} from '@/navigation/contentBankRoutes';
import { MATH_RENDERING_FIXTURE_ID, getQaFixture } from '@/dev/qaFixtures';
import ContentBankQaPage from './ContentBankQaPage';

/**
 * The development QA workspace, asserted through the REAL learner DOM.
 *
 * Every assertion below deliberately queries learner markup — the booklet's own
 * `data-focus-type="question"` sections, its `radiogroup`s, its `Show
 * Explanation` disclosure, the shared renderer's `math-expression` /
 * `fraction-math-value` / `math-cancel` test ids, and `ResultsScreen`'s own
 * controls. That is the point of the page: a bespoke preview card would render
 * its own markup and could pass a test while a learner still saw the bug. If
 * these queries stop matching, the page has stopped reusing the learner UI.
 *
 * The fixture is loaded, never invented, so the notation under test is exactly
 * the authored `content/qa/math-rendering-test.json`.
 */

const saveAttemptMock = vi.hoisted(() =>
  vi.fn((_uid: string, _attempt: unknown) => Promise.resolve()),
);

vi.mock('@/services/attempts', () => ({
  saveAttempt: (uid: string, attempt: unknown) => saveAttemptMock(uid, attempt),
  subscribeToAttempts: () => () => undefined,
}));

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { uid: 'admin-uid', displayName: 'Admin', email: 'admin@example.com', isAnonymous: false },
    initializing: false,
    signingOut: false,
    hasPasswordProvider: true,
    isAdmin: true,
    adminResolved: true,
  }),
}));

const FIXTURE = getQaFixture(MATH_RENDERING_FIXTURE_ID)!;
/** Q1 is the notation catalogue; Q2–Q4 are the realistic math stems. */
const [Q1, Q2, Q3, Q4] = FIXTURE.questions;

/** Macros the tokenizer claims to consume. None may reach the learner as text. */
const SUPPORTED_MACROS = [
  '\\frac', '\\sqrt', '\\cancelto', '\\cancel', '\\times', '\\div', '\\cdot',
  '\\approx', '\\leq', '\\geq', '\\neq', '\\le', '\\ge', '\\pm',
  '\\lvert', '\\rvert', '\\lbrace', '\\rbrace', '\\left', '\\right',
  '\\text{', '\\quad', '\\rightarrow',
];

beforeEach(() => {
  saveAttemptMock.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  // @ts-expect-error -- minimal IntersectionObserver stand-in for jsdom
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * The real Content Bank route shape, minus `RequireAdmin`.
 *
 * `qa` and `:subjectSlug` are mounted together on purpose: that is what pins
 * React Router's static-first ranking, so a regression that let `qa` be read as
 * a subject slug fails here instead of in the browser.
 */
function renderQaWorkspace(initialPath: string = CONTENT_BANK_QA_ROUTE) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={CONTENT_BANK_BASE} element={<div data-testid="content-bank-page" />} />
          <Route path={`${CONTENT_BANK_BASE}/${CONTENT_BANK_QA_SEGMENT}`} element={<ContentBankQaPage />} />
          <Route path={`${CONTENT_BANK_BASE}/:subjectSlug`} element={<div data-testid="subject-page" />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** The learner surface — everything below the QA indicator. */
const learnerSurface = () => screen.getByTestId('qa-learner-surface');

/** One question's own booklet section, queried by the id the booklet stamps. */
function questionSection(questionId: string): HTMLElement {
  const section = document.querySelector(`[data-question-id="${questionId}"]`);
  expect(section, `no booklet section for ${questionId}`).not.toBeNull();
  return section as HTMLElement;
}

/** Answer an option through the real radio, the way a learner does. */
async function answer(
  user: ReturnType<typeof userEvent.setup>,
  questionId: string,
  optionId: string,
) {
  const section = questionSection(questionId);
  const group = within(section).getByRole('radiogroup');
  const radio = within(group)
    .getAllByRole('radio')
    .find((option) => option.textContent?.trim().startsWith(optionId));
  expect(radio, `no choice ${optionId} on ${questionId}`).toBeTruthy();
  await user.click(radio!);
  return section;
}

/** Open the real `Show Explanation` disclosure inside one question. */
async function openExplanation(
  user: ReturnType<typeof userEvent.setup>,
  section: HTMLElement,
): Promise<HTMLButtonElement> {
  const toggle = within(section).getByRole('button', { name: /show explanation/i });
  await user.click(toggle);
  return toggle as HTMLButtonElement;
}

/** MathML descendants of a root, ignoring collapsed (`hidden`) subtrees. */
function mathml(root: ParentNode, tag: string): Element[] {
  return [...root.querySelectorAll(tag)].filter((node) => !node.closest('[hidden]'));
}

describe('development QA workspace — admin route', () => {
  it('is an admin Content Bank route, not a root-level or learner one', () => {
    expect(CONTENT_BANK_QA_ROUTE).toBe('/admin/content-bank/qa');
    expect(CONTENT_BANK_QA_ROUTE.startsWith(`${ADMIN_BASE}/`)).toBe(true);
    expect(CONTENT_BANK_QA_ROUTE.startsWith(`${CONTENT_BANK_BASE}/`)).toBe(true);
    // The old root-level route must not come back.
    expect(CONTENT_BANK_QA_ROUTE).not.toBe('/math-rendering-test');
  });

  it('is available in development', () => {
    expect(import.meta.env.DEV).toBe(true);
    renderQaWorkspace();
    expect(screen.getByTestId('qa-indicator')).toBeInTheDocument();
    expect(screen.queryByTestId('subject-page')).toBeNull();
  });

  it('never appears in learner navigation', () => {
    for (const item of NAV_ITEMS) {
      expect(item.path.startsWith('/app/')).toBe(true);
      expect(item.path).not.toContain(CONTENT_BANK_QA_SEGMENT);
      expect(item.path).not.toBe(CONTENT_BANK_QA_ROUTE);
    }
    // Nor is it a top-level admin destination — it is a Content Bank child.
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.path).not.toBe(CONTENT_BANK_QA_ROUTE);
    }
  });
});

describe('development QA workspace — control area', () => {
  it('labels itself, names the fixture, and says the run is not recorded', () => {
    renderQaWorkspace();
    const indicator = screen.getByTestId('qa-indicator');
    expect(within(indicator).getByRole('heading', { name: /development qa/i })).toBeInTheDocument();
    expect(indicator.textContent).toContain(MATH_RENDERING_FIXTURE_ID);
    expect(indicator.textContent).toContain('content/qa/math-rendering-test.json');
    expect(indicator.textContent).toMatch(/not recorded/i);
    expect(indicator.textContent).toMatch(/never writes|not an attempt/i);
  });

  it('offers Practice and Results as the two views', () => {
    renderQaWorkspace();
    const group = screen.getByRole('group', { name: /development qa view/i });
    const practice = within(group).getByRole('button', { name: 'Practice' });
    const results = within(group).getByRole('button', { name: 'Results' });
    expect(practice).toHaveAttribute('aria-pressed', 'true');
    expect(results).toHaveAttribute('aria-pressed', 'false');
  });

  /**
   * The indicator is the ONLY non-learner element on the page, and it has to sit
   * outside the learner surface — inside it, it would change what is being
   * tested.
   */
  it('keeps the development indicator outside the learner surface', () => {
    renderQaWorkspace();
    const indicator = screen.getByTestId('qa-indicator');
    expect(learnerSurface().contains(indicator)).toBe(false);
    expect(indicator.contains(learnerSurface())).toBe(false);
  });
});

describe('development QA workspace — renders through the real Practice UI', () => {
  it('renders the fixture with the real booklet, one section per subject', () => {
    renderQaWorkspace();
    const surface = learnerSurface();

    // The booklet's own chrome, not a QA imitation of it.
    expect(within(surface).getByRole('button', { name: /exit practice/i })).toBeInTheDocument();
    expect(within(surface).getByRole('button', { name: /submit practice/i })).toBeInTheDocument();

    // Every fixture question renders as a real booklet question section.
    for (const question of FIXTURE.questions) {
      const section = questionSection(question.id);
      expect(surface.contains(section)).toBe(true);
      expect(section).toHaveAttribute('data-focus-type', 'question');
      expect(within(section).getByRole('radiogroup')).toBeInTheDocument();
      expect(section.textContent).toContain(question.subject);
    }
  });

  it('adds no QA question card of its own — the learner card is the only card', () => {
    renderQaWorkspace();
    const surface = learnerSurface();
    const sections = surface.querySelectorAll('[data-focus-type="question"]');
    expect(sections).toHaveLength(FIXTURE.questions.length);
    // No element on the page claims to be a QA-specific preview of a question.
    expect(document.querySelector('[data-testid="qa-question-preview"]')).toBeNull();
    expect(document.querySelector('[data-testid="qa-question-card"]')).toBeNull();
  });

  it('renders every choice through the real radio markup', () => {
    renderQaWorkspace();
    for (const question of FIXTURE.questions) {
      const group = within(questionSection(question.id)).getByRole('radiogroup');
      const radios = within(group).getAllByRole('radio');
      expect(radios).toHaveLength(question.choices.length);
      for (const [index, choice] of question.choices.entries()) {
        expect(radios[index].textContent).toContain(choice.id);
        expect(radios[index]).toHaveAttribute('aria-checked', 'false');
      }
    }
  });

  it('records a selection in the real radio state', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q2.id, 'B');
    const chosen = within(section)
      .getAllByRole('radio')
      .find((radio) => radio.getAttribute('aria-checked') === 'true');
    expect(chosen?.textContent).toContain('B');
  });
});

describe('development QA workspace — mathematics in the question stem', () => {
  /**
   * The stem is everything in the question section outside the choice list. The
   * original bug lived exactly here: notation that drew correctly inside an
   * explanation and not in the stem, so the stem is queried on its own.
   */
  function stemOf(questionId: string): HTMLElement {
    const section = questionSection(questionId);
    const stem = [...section.querySelectorAll('p')].find(
      (paragraph) => !paragraph.closest('[role="radiogroup"]'),
    );
    expect(stem, `no stem paragraph for ${questionId}`).toBeTruthy();
    return stem as HTMLElement;
  }

  it('renders a real radical for the authored root in the stem', () => {
    renderQaWorkspace();
    const stem = stemOf(Q2.id);
    const radicals = mathml(stem, 'msqrt');
    expect(radicals.length).toBeGreaterThan(0);
    // The radical covers the whole radicand — a bar over nothing would misstate
    // the question.
    expect(radicals.some((radical) => radical.textContent === '0.0081')).toBe(true);
    expect(stem.textContent).toContain('What is');
  });

  it('renders stacked fractions in the stem', () => {
    renderQaWorkspace();
    const stem = stemOf(Q3.id);
    expect(mathml(stem, 'mfrac').length).toBeGreaterThanOrEqual(2);
  });

  it('renders exponents as superscripts in the stem', () => {
    renderQaWorkspace();
    const stem = stemOf(Q4.id);
    expect(mathml(stem, 'msup').length).toBeGreaterThan(0);
  });

  /**
   * A grouped product must be ONE mathematical statement, with its parentheses
   * inside the same `<math>` element as the fractions they hold — parentheses
   * left outside would sit beside the fraction instead of scaling around it.
   */
  it('keeps a grouped product and its parentheses in one math element', () => {
    renderQaWorkspace();
    const stem = stemOf(Q3.id);
    const grouped = [...stem.querySelectorAll('[data-testid="math-expression"]')].find(
      (math) => math.querySelectorAll('mfrac').length >= 2,
    );
    expect(grouped).toBeTruthy();
    const fences = [...grouped!.querySelectorAll('mo')].filter(
      (operator) => operator.textContent === '(' || operator.textContent === ')',
    );
    for (const fence of fences) {
      expect(fence.closest('math')).toBe(grouped);
    }
    expect(grouped!.querySelector('mfrac')?.closest('math')).toBe(grouped);
  });

  it('renders the notation catalogue stem as real math, including an indexed root', () => {
    renderQaWorkspace();
    const stem = stemOf(Q1.id);
    expect(mathml(stem, 'mfrac').length).toBeGreaterThan(0);
    expect(mathml(stem, 'msqrt').length).toBeGreaterThan(0);
    expect(mathml(stem, 'msup').length).toBeGreaterThan(0);
    // `\sqrt[3]{8}` becomes an `mroot`; its children are (radicand, index).
    const indexed = mathml(stem, 'mroot');
    expect(indexed.length).toBeGreaterThan(0);
    expect(indexed[0].textContent).toContain('8');
    expect(indexed[0].textContent).toContain('3');
  });

  it('leaves the stem wording intact around the mathematics', () => {
    renderQaWorkspace();
    expect(stemOf(Q3.id).textContent).toContain('Evaluate');
    expect(stemOf(Q2.id).textContent?.trimEnd().endsWith('explanation.')).toBe(true);
  });
});

describe('development QA workspace — mathematics in the choices', () => {
  it('renders choice mathematics through the shared renderer', () => {
    renderQaWorkspace();
    const group = within(questionSection(Q1.id)).getByRole('radiogroup');
    const radios = within(group).getAllByRole('radio');
    // `1/2` and `3/4` are plain-text fractions; both must stack.
    const stacked = radios.filter(
      (radio) => radio.querySelectorAll('[data-testid="fraction-math-value"]').length > 0,
    );
    expect(stacked.length).toBeGreaterThan(0);
    expect(mathml(group, 'mfrac').length).toBeGreaterThan(0);
  });

  it('renders grouped sums, products, roots and powers across one question\'s choices', () => {
    renderQaWorkspace();
    const group = within(questionSection(FIXTURE.questions[4].id)).getByRole('radiogroup');
    expect(mathml(group, 'mfrac').length).toBeGreaterThan(0);
    expect(mathml(group, 'msqrt').length).toBeGreaterThan(0);
    expect(mathml(group, 'msup').length).toBeGreaterThan(0);
  });

  /**
   * The choice letter is chrome, not mathematics. It has to stay ordinary text
   * outside the `<math>` element, or a screen reader would read it as an operand.
   */
  it('keeps the choice label outside the mathematical expression', () => {
    renderQaWorkspace();
    const group = within(questionSection(FIXTURE.questions[4].id)).getByRole('radiogroup');
    const radios = within(group).getAllByRole('radio');
    for (const [index, radio] of radios.entries()) {
      const label = FIXTURE.questions[4].choices[index].id;
      expect(radio.textContent).toContain(label);
      for (const math of radio.querySelectorAll('math')) {
        expect(math.textContent).not.toContain(label);
      }
    }
  });
});

describe('development QA workspace — the real Show Explanation behaviour', () => {
  it('offers no explanation before the question is answered', () => {
    renderQaWorkspace();
    const section = questionSection(Q1.id);
    expect(within(section).queryByRole('button', { name: /show explanation/i })).toBeNull();
    expect(section.querySelector('[data-testid="structured-explanation"]')).toBeNull();
  });

  it('collapses the explanation until the learner opens it, then reopens and hides it', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q1.id, 'D');

    const toggle = within(section).getByRole('button', { name: /show explanation/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Not merely hidden — the explanation is not in the DOM at all yet.
    expect(section.querySelector('[data-testid="structured-explanation"]')).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(section).getByRole('button', { name: /hide explanation/i })).toBeInTheDocument();
    expect(section.querySelector('[data-testid="structured-explanation"]')).not.toBeNull();

    await user.click(within(section).getByRole('button', { name: /hide explanation/i }));
    expect(section.querySelector('[data-testid="structured-explanation"]')).toBeNull();
  });

  it('keeps the Mental Shortcut behind its own collapsible', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q2.id, 'B');
    await openExplanation(user, section);

    const collapsible = section.querySelector('[data-testid="structured-collapsible"] button');
    expect(collapsible).not.toBeNull();
    expect(collapsible).toHaveAttribute('aria-expanded', 'false');
    const content = section.querySelector('[data-testid="structured-collapsible-content"]');
    expect(content).toHaveAttribute('hidden');

    await user.click(collapsible as HTMLElement);
    expect(collapsible).toHaveAttribute('aria-expanded', 'true');
    expect(content).not.toHaveAttribute('hidden');
  });
});

describe('development QA workspace — mathematics in the explanation', () => {
  it('renders fractions, roots, powers and indexed roots in the opened explanation', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q1.id, 'D');
    await openExplanation(user, section);

    const explanation = section.querySelector('[data-testid="structured-explanation"]') as HTMLElement;
    expect(explanation).not.toBeNull();
    expect(mathml(explanation, 'mfrac').length).toBeGreaterThan(0);
    expect(mathml(explanation, 'msqrt').length).toBeGreaterThan(0);
    expect(mathml(explanation, 'msup').length).toBeGreaterThan(0);
    expect(mathml(explanation, 'mroot').length).toBeGreaterThan(0);
    expect(explanation.querySelectorAll('[data-testid="structured-latex-equation"]').length)
      .toBeGreaterThan(0);
  });

  /**
   * Cancellation is the notation most likely to degrade silently: struck-through
   * digits are drawn with a class, so a renderer that dropped the macro would
   * still print plausible-looking numbers. Both `13`s must visibly become `1`.
   */
  it('draws cancellation as a struck-through value beside what it becomes', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q1.id, 'D');
    await openExplanation(user, section);
    const explanation = section.querySelector('[data-testid="structured-explanation"]') as HTMLElement;

    const cancels = [...explanation.querySelectorAll('[data-testid="math-cancel"]')];
    expect(cancels.length).toBeGreaterThanOrEqual(2);

    const thirteens = cancels.filter(
      (cancel) => cancel.querySelector('[data-cancel="from"]')?.textContent === '13',
    );
    expect(thirteens).toHaveLength(2);
    for (const cancel of thirteens) {
      const from = cancel.querySelector('[data-cancel="from"]')!;
      expect(from.getAttribute('class')).toContain('line-through');
      expect(cancel.querySelector('[data-cancel="to"]')?.textContent).toBe('1');
    }
    // …and the raw macro never appears as text.
    expect(explanation.textContent).not.toContain('cancelto');
  });

  it('renders a nested cancellation, where both operands of a fraction cancel', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q1.id, 'D');
    await openExplanation(user, section);
    const explanation = section.querySelector('[data-testid="structured-explanation"]') as HTMLElement;

    const nested = [...explanation.querySelectorAll('mfrac')].filter(
      (fraction) => fraction.querySelectorAll('[data-testid="math-cancel"]').length >= 2,
    );
    expect(nested.length).toBeGreaterThan(0);
  });

  it('gives every equation an honest spoken label instead of raw LaTeX', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q2.id, 'B');
    await openExplanation(user, section);
    const explanation = section.querySelector('[data-testid="structured-explanation"]') as HTMLElement;

    const equations = [...explanation.querySelectorAll('[data-testid="structured-latex-equation"]')];
    expect(equations.length).toBeGreaterThan(0);
    for (const equation of equations) {
      const label = equation.getAttribute('aria-label') ?? '';
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain('\\');
      expect(label).not.toContain('{');
    }
    const radical = equations.find((equation) => equation.querySelector('msqrt'));
    expect(radical?.getAttribute('aria-label')).toContain('√0.0081');
  });
});

describe('development QA workspace — false-positive protection', () => {
  /**
   * These strings are not mathematics and must stay ordinary text. `Room 3/4`
   * and `Section 2/3` are deliberately NOT asserted as protected: a bare
   * digits/digits run is lexically identical to an authored fraction, the fixture
   * documents that it still stacks, and no heuristic is added just for them.
   */
  const PROTECTED = ['08/30/2026', '1,061/8', 'https://csc.gov.ph/faq', 'and/or', 'A/B testing'];

  it('leaves dates, ratios, URLs and slashed words as plain text in the explanation', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q1.id, 'D');
    await openExplanation(user, section);
    const explanation = section.querySelector('[data-testid="structured-explanation"]') as HTMLElement;

    for (const guarded of PROTECTED) {
      expect(explanation.textContent, guarded).toContain(guarded);
      // The guarded run must not be inside any math element.
      for (const math of explanation.querySelectorAll('math')) {
        expect(math.textContent ?? '', `${guarded} was swallowed into math`).not.toContain(guarded);
      }
    }
  });

  it('does not turn a date or a thousands-separated ratio into a fraction', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const section = await answer(user, Q1.id, 'D');
    await openExplanation(user, section);
    const explanation = section.querySelector('[data-testid="structured-explanation"]') as HTMLElement;

    for (const fraction of explanation.querySelectorAll('[data-testid="fraction-math-value"]')) {
      expect(fraction.textContent).not.toContain('2026');
      expect(fraction.textContent).not.toContain('1,061');
      expect(fraction.textContent).not.toContain('csc.gov.ph');
    }
  });
});

describe('development QA workspace — no raw LaTeX reaches the learner', () => {
  it('leaks no supported macro into the Practice DOM, explanation opened', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const surface = learnerSurface();

    // Closed first: stems and choices on their own.
    for (const macro of SUPPORTED_MACROS) {
      expect(surface.textContent ?? '', `closed:${macro}`).not.toContain(macro);
    }

    // …then with every explanation and Mental Shortcut opened.
    for (const question of FIXTURE.questions) {
      const section = await answer(user, question.id, question.correctOptionId);
      await openExplanation(user, section);
      const collapsible = section.querySelector('[data-testid="structured-collapsible"] button');
      if (collapsible) await user.click(collapsible as HTMLElement);
    }
    for (const macro of SUPPORTED_MACROS) {
      expect(learnerSurface().textContent ?? '', `open:${macro}`).not.toContain(macro);
    }
    // No stray LaTeX delimiter survives either.
    expect(learnerSurface().textContent).not.toContain('\\(');
    expect(learnerSurface().textContent).not.toContain('\\[');
  });
});

describe('development QA workspace — the real Results screen', () => {
  it('grades in memory and renders the real ResultsScreen', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    await answer(user, Q2.id, Q2.correctOptionId);

    await user.click(
      within(screen.getByRole('group', { name: /development qa view/i }))
        .getByRole('button', { name: 'Results' }),
    );

    const surface = learnerSurface();
    // ResultsScreen's own controls and review affordances, not a QA summary.
    expect(within(surface).getByLabelText('Review filters')).toBeInTheDocument();
    expect(
      within(surface).getAllByRole('button', { name: /expand question details/i }).length,
    ).toBeGreaterThan(0);
    expect(document.querySelector('[data-focus-type="question"]')).toBeNull();
  });

  it('reviews the fixture explanation through the real Results math renderer', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    await answer(user, Q1.id, Q1.correctOptionId);
    await user.click(
      within(screen.getByRole('group', { name: /development qa view/i }))
        .getByRole('button', { name: 'Results' }),
    );

    const expanders = within(learnerSurface()).getAllByRole('button', {
      name: /expand question details/i,
    });
    await user.click(expanders[0]);

    const explanation = document.querySelector('[data-testid="structured-explanation"]') as HTMLElement;
    expect(explanation).not.toBeNull();
    expect(mathml(explanation, 'mfrac').length).toBeGreaterThan(0);
    expect(mathml(explanation, 'msqrt').length).toBeGreaterThan(0);
    expect(explanation.querySelectorAll('[data-testid="math-cancel"]').length).toBeGreaterThan(0);
    for (const macro of SUPPORTED_MACROS) {
      expect(explanation.textContent ?? '', macro).not.toContain(macro);
    }
  });

  it('returns to Practice with the real booklet intact', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    const toggle = () => screen.getByRole('group', { name: /development qa view/i });
    await answer(user, Q2.id, 'B');
    await user.click(within(toggle()).getByRole('button', { name: 'Results' }));
    expect(document.querySelector('[data-focus-type="question"]')).toBeNull();

    await user.click(within(toggle()).getByRole('button', { name: 'Practice' }));
    expect(document.querySelectorAll('[data-focus-type="question"]')).toHaveLength(
      FIXTURE.questions.length,
    );
  });
});

describe('development QA workspace — nothing is persisted', () => {
  /**
   * The mirror image of `attemptPersistence.test.tsx`: there, a learner run MUST
   * write. Here, a QA run must not — not through the attempt service, and not
   * through local storage either.
   */
  it('never writes an attempt, even after grading and reviewing', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');
    renderQaWorkspace();

    await answer(user, Q1.id, 'D');
    await answer(user, Q2.id, 'B');
    const section = questionSection(Q1.id);
    await openExplanation(user, section);
    await user.click(
      within(screen.getByRole('group', { name: /development qa view/i }))
        .getByRole('button', { name: 'Results' }),
    );
    const expanders = within(learnerSurface()).getAllByRole('button', {
      name: /expand question details/i,
    });
    await user.click(expanders[0]);

    expect(saveAttemptMock).not.toHaveBeenCalled();
    // The active-session key is what `ExamPage` would write; a QA run must not.
    for (const call of setItem.mock.calls) {
      expect(String(call[0])).not.toMatch(/attempt|session/i);
    }
  });

  it('submits through the real dialog without recording the run', async () => {
    const user = userEvent.setup();
    renderQaWorkspace();
    await answer(user, Q2.id, 'B');

    await user.click(
      within(learnerSurface()).getByRole('button', { name: /submit practice/i }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toMatch(/practice/i);
    await user.click(within(dialog).getByRole('button', { name: /submit|finish|end/i }));

    expect(within(learnerSurface()).getByLabelText('Review filters')).toBeInTheDocument();
    expect(saveAttemptMock).not.toHaveBeenCalled();
  });
});
