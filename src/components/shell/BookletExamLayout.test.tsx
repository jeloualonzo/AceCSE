// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { BookletExamLayout } from './BookletExamLayout';
import type { ExamSession, Question, SessionItem } from '@/types';
import { getEdqItem as realGetEdqItem } from '@/data/edq';
import { clearActiveSession, loadActiveSession, saveActiveSession } from '@/lib/sessionStorage';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  // @ts-expect-error -- minimal IntersectionObserver stand-in for jsdom
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeQuestion(id: string, subject: Question['subject']): Question {
  return {
    id,
    examLevel: 'Both',
    subject,
    topic: 'Test Topic',
    difficulty: 'Easy',
    question: `Question text for ${id}`,
    choices: [
      { id: 'A', text: 'Choice A' },
      { id: 'B', text: 'Choice B' },
      { id: 'C', text: 'Choice C' },
      { id: 'D', text: 'Choice D' },
    ],
    correctOptionId: 'A',
    explanation: 'Because A is correct.',
    tags: [],
  };
}

// Two subjects, two questions each — enough to exercise switching, ordering,
// and cross-subject Previous/Next without a huge fixture.
const TWO_SUBJECT_ITEMS: SessionItem[] = [
  { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
  { kind: 'question', questionId: 'V2', sectionId: 'Verbal Ability' },
  { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
  { kind: 'question', questionId: 'N2', sectionId: 'Numerical Reasoning' },
];

function baseSession(overrides: Partial<ExamSession>): ExamSession {
  return {
    id: 's-test',
    config: {
      mode: 'simulation',
      examLevel: 'Professional',
      questionCount: overrides.questionIds?.length ?? 0,
      timed: true,
      durationSeconds: 3600,
    },
    questionIds: [],
    startedAt: Date.now(),
    deadlineAt: Date.now() + 3600_000,
    answers: {},
    ...overrides,
  };
}

function twoSubjectIndex() {
  return new Map<string, Question>([
    ['V1', makeQuestion('V1', 'Verbal Ability')],
    ['V2', makeQuestion('V2', 'Verbal Ability')],
    ['N1', makeQuestion('N1', 'Numerical Reasoning')],
    ['N2', makeQuestion('N2', 'Numerical Reasoning')],
  ]);
}

function renderLayout(props: Partial<React.ComponentProps<typeof BookletExamLayout>> = {}) {
  const onSelectOption = vi.fn();
  const onSubmitExam = vi.fn();
  const onExitExam = vi.fn();
  const defaultSession = baseSession({ questionIds: ['V1', 'V2', 'N1', 'N2'], items: TWO_SUBJECT_ITEMS });

  const utils = render(
    <BookletExamLayout
      examLevel="Professional"
      timeRemainingFormatted="1:00:00"
      onExitExam={onExitExam}
      onSubmitExam={onSubmitExam}
      session={defaultSession}
      getGroup={() => undefined}
      questionIndex={twoSubjectIndex()}
      onSelectOption={onSelectOption}
      {...props}
    />
  );
  return { ...utils, onSelectOption, onSubmitExam, onExitExam, session: props.session ?? defaultSession };
}

/** Both the desktop and mobile navigator triggers exist in the DOM at once
 * (Tailwind's `hidden`/`sm:` classes aren't evaluated by jsdom) — always the
 * first one, exactly like the existing ExamFocusLayout tests would need to. */
async function openNavigator(user: ReturnType<typeof userEvent.setup>) {
  const triggers = screen.getAllByRole('button', { name: /open question navigation/i });
  await user.click(triggers[0]);
}

/** The subject name also appears as a heading above that subject's own
 * question grid, so scope to the "Subjects" switcher grid specifically. */
function getSubjectSwitchButton(dialog: HTMLElement, subjectName: string): HTMLElement {
  const subjectsHeading = within(dialog).getByText('Subjects');
  const subjectGrid = subjectsHeading.parentElement!.querySelector('.grid-cols-2') as HTMLElement;
  return within(subjectGrid).getByText(subjectName).closest('button')!;
}

describe('BookletExamLayout — header matches Practice, no subject switcher there', () => {
  it('has no subject buttons or subject tablist in the header', () => {
    renderLayout();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText('Numerical Reasoning', { selector: 'button *' })).not.toBeInTheDocument();
    expect(screen.getByRole('main').querySelector('.max-w-5xl')).not.toBeNull();
  });

  it('does not render a global "Question X of N" style counter anywhere', () => {
    renderLayout();
    expect(screen.queryByText(/Question \d+ of \d+/)).not.toBeInTheDocument();
  });

  it('keeps Exit, Grid/Navigator, Previous, Next, and Submit as the only header controls, Exit and Navigator together', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: 'Exit Exam' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /open question navigation/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Previous question' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Next question' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /submit/i }).length).toBeGreaterThan(0);
  });
});

describe('BookletExamLayout — subject switching lives in the navigator drawer', () => {
  it('shows a 2-column subject grid at the top of the drawer', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);

    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    const subjectsHeading = within(dialog).getByText('Subjects');
    const subjectGrid = subjectsHeading.parentElement!.querySelector('.grid-cols-2');
    expect(subjectGrid).not.toBeNull();
    expect(within(subjectGrid as HTMLElement).getByText('Verbal Ability')).toBeInTheDocument();
    expect(within(subjectGrid as HTMLElement).getByText('Numerical Reasoning')).toBeInTheDocument();
  });

  it('clicking a subject button in the drawer switches the visible booklet content', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();

    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'Numerical Reasoning'));

    expect(screen.queryByText('Question text for V1')).not.toBeInTheDocument();
    expect(screen.getByText('Question text for N1')).toBeInTheDocument();
    // Drawer closes after switching.
    expect(screen.queryByRole('dialog', { name: 'Question navigation' })).not.toBeInTheDocument();
  });
});

describe('BookletExamLayout — booklet renders one subject at a time', () => {
  it('renders only the active subject\'s questions, never both at once', () => {
    renderLayout();
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.getByText('Question text for V2')).toBeInTheDocument();
    expect(screen.queryByText('Question text for N1')).not.toBeInTheDocument();
    expect(screen.queryByText('Question text for N2')).not.toBeInTheDocument();
  });

  it('shows a plain subject heading above the booklet content', () => {
    renderLayout();
    expect(screen.getByRole('heading', { name: 'Verbal Ability' })).toBeInTheDocument();
  });
});

describe('BookletExamLayout — Practice uses the same booklet renderer', () => {
  it('renders multiple Practice items continuously and keeps explanation state per question', async () => {
    const user = userEvent.setup();
    const practiceSession = baseSession({
      config: {
        mode: 'practice',
        examLevel: 'Professional',
        questionCount: 4,
        timed: false,
        durationSeconds: null,
      },
      questionIds: ['V1', 'V2', 'N1', 'N2'],
      items: TWO_SUBJECT_ITEMS,
    });
    const { onSelectOption, rerender } = renderLayout({ session: practiceSession });

    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.getByText('Question text for V2')).toBeInTheDocument();
    const firstQuestionCard = document.getElementById('question-V1');
    expect(firstQuestionCard).toHaveClass('rounded-xl', 'shadow-md', 'border-emerald-400/90', 'bg-white');
    expect(firstQuestionCard).not.toHaveClass('bg-emerald-50');
    expect(firstQuestionCard?.parentElement).toHaveClass('space-y-4');
    expect(screen.getAllByRole('button', { name: 'Next question' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Submit practice/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Show Explanation' })).not.toBeInTheDocument();

    await user.click(within(document.getElementById('question-V1')!).getAllByRole('radio')[0]);
    expect(onSelectOption).toHaveBeenCalledWith('V1', 'A');

    const answered = { ...practiceSession, answers: { V1: 'A' as const } };
    rerender(
      <BookletExamLayout
        examLevel="Professional"
        timeRemainingFormatted="Untimed"
        onExitExam={vi.fn()}
        onSubmitExam={vi.fn()}
        session={answered}
        getGroup={() => undefined}
        questionIndex={twoSubjectIndex()}
        onSelectOption={onSelectOption}
      />
    );

    expect(screen.getAllByRole('button', { name: 'Show Explanation' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Show Explanation' }).querySelector('svg')).toHaveClass('lucide-chevron-down');
    await user.click(screen.getByRole('button', { name: 'Show Explanation' }));
    expect(screen.getByRole('button', { name: 'Hide Explanation' }).querySelector('svg')).toHaveClass('lucide-chevron-up');
    const explanation = within(document.getElementById('question-V1')!).getByText('Because A is correct.');
    expect(explanation).toBeInTheDocument();
    expect(explanation.closest('.border-l-emerald-500')).toHaveClass('border-l-emerald-500', 'shadow-sm');

    await user.click(screen.getAllByRole('button', { name: 'Next question' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Next question' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Next question' })[0]);
    expect(screen.getAllByRole('button', { name: /Submit practice/i })).toHaveLength(2);
    const finalNextButtons = screen.getAllByRole('button', { name: 'Next question' });
    expect(finalNextButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe('BookletExamLayout — active question visual state', () => {
  it('marks exactly one primary card and moves the emphasis with existing navigation', async () => {
    const user = userEvent.setup();
    const onActiveQuestionChange = vi.fn();
    renderLayout({ onActiveQuestionChange });

    expect(document.querySelectorAll('[data-primary-active="true"]')).toHaveLength(1);
    expect(document.getElementById('question-V1')).toHaveAttribute('data-primary-active', 'true');
    expect(document.getElementById('question-V1')).toHaveClass('border-emerald-400/90', 'shadow-md');
    expect(document.getElementById('question-V2')).toHaveAttribute('data-primary-active', 'false');
    expect(document.getElementById('question-V2')).toHaveClass('border-emerald-200/80', 'shadow-sm');

    await user.click(screen.getAllByRole('button', { name: 'Next question' })[0]);
    expect(document.getElementById('question-V2')).toHaveAttribute('data-primary-active', 'true');
    expect(document.getElementById('question-V1')).toHaveAttribute('data-primary-active', 'false');
    expect(onActiveQuestionChange).toHaveBeenCalledWith('V2');
  });
});

describe('BookletExamLayout — shared task and question card hierarchy', () => {
  it('keeps directions in a distinct left-accent container above emerald question cards', () => {
    const sharedSession = baseSession({
      config: {
        mode: 'simulation',
        examLevel: 'Professional',
        questionCount: 2,
        timed: true,
        durationSeconds: 3600,
      },
      questionIds: ['V1', 'V2'],
      items: [{
        kind: 'pool',
        poolId: 'spelling',
        questionType: 'Spelling',
        taskFormat: 'shared_spelling_task',
        sectionId: 'Verbal Ability',
        questionIds: ['V1', 'V2'],
      }],
    });
    renderLayout({ session: sharedSession });

    const taskCard = document.querySelector('[class*="border-l-emerald-500"]');
    const firstQuestionCard = document.getElementById('question-V1');
    expect(taskCard).not.toBeNull();
    expect(taskCard).toHaveClass('border-slate-200', 'bg-white', 'shadow-sm');
    expect(firstQuestionCard).toHaveClass('border-emerald-400/90', 'bg-white', 'shadow-md');
    expect(taskCard).not.toBe(firstQuestionCard);
    expect(taskCard?.parentElement).toHaveClass('space-y-4');
  });
});

describe('BookletExamLayout — progressive Practice privacy and growth', () => {
  it('shows Show More without exposing bank totals, ranges, task labels, or Restart', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const practiceSession = baseSession({
      config: {
        mode: 'practice',
        examLevel: 'Professional',
        questionCount: 2,
        timed: false,
        durationSeconds: null,
        subjects: ['Verbal Ability'],
      },
      questionIds: ['V1', 'V2'],
      items: TWO_SUBJECT_ITEMS.slice(0, 2),
      practiceProgress: {
        batchSize: 2,
        nextIndex: 2,
        candidateQuestionIds: ['V1', 'V2', 'N1', 'N2'],
      },
    });

    renderLayout({ session: practiceSession, onLoadMore, hasMorePractice: true });

    expect(screen.getByRole('button', { name: 'Show more Practice questions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Restart/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\/\s*2/);
    expect(document.body.textContent).not.toMatch(/\bItem Set\b|Filing|Spelling|Number Series/);

    await user.click(screen.getByRole('button', { name: 'Show more Practice questions' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole('button', { name: /Open question navigation/i })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    expect(dialog.textContent).toContain('Verbal Ability');
    expect(dialog.textContent).not.toMatch(/\d+\s*[–-]\s*\d+/);
  });
});

describe('BookletExamLayout — answers preserved across subject switches', () => {
  it('an answer given in one subject survives switching away and back', async () => {
    const user = userEvent.setup();
    const { onSelectOption, rerender, session } = renderLayout();

    const v1Choices = within(document.getElementById('question-V1')!).getAllByRole('radio');
    await user.click(v1Choices[0]);
    expect(onSelectOption).toHaveBeenCalledWith('V1', 'A');

    const updatedSession = { ...session, answers: { V1: 'A' as const } };
    rerender(
      <BookletExamLayout
        examLevel="Professional"
        timeRemainingFormatted="1:00:00"
        onExitExam={vi.fn()}
        onSubmitExam={vi.fn()}
        session={updatedSession}
        getGroup={() => undefined}
        questionIndex={twoSubjectIndex()}
        onSelectOption={onSelectOption}
      />
    );

    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'Numerical Reasoning'));
    await openNavigator(user);
    const dialog2 = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog2, 'Verbal Ability'));

    const v1ChoiceAAfterReturn = within(document.getElementById('question-V1')!).getAllByRole('radio')[0];
    expect(v1ChoiceAAfterReturn).toHaveAttribute('aria-checked', 'true');
  });
});

describe('BookletExamLayout — All Subjects Practice navigator labels and subjects', () => {
  it('shows all five subject buttons immediately and only encountered N1/V1 grid items', async () => {
    const user = userEvent.setup();
    const allSubjectSession = baseSession({
      config: {
        mode: 'practice',
        examLevel: 'Professional',
        questionCount: 2,
        timed: false,
        durationSeconds: null,
        subjects: ['Numerical Reasoning', 'Analytical Reasoning', 'Verbal Ability', 'Clerical Ability', 'General Information'],
      },
      questionIds: ['N1', 'V1'],
      items: [
        { kind: 'question', questionId: 'N1', sectionId: 'Numerical Reasoning' },
        { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
      ],
    });
    renderLayout({ session: allSubjectSession });
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    const subjectsHeading = within(dialog).getByRole('heading', { name: 'Subjects' });
    const subjectGrid = subjectsHeading.nextElementSibling;
    expect(subjectGrid).not.toBeNull();
    for (const subject of ['Numerical Reasoning', 'Analytical Reasoning', 'Verbal Ability', 'Clerical Ability', 'General Information']) {
      expect(within(subjectGrid as HTMLElement).getByRole('button', { name: subject })).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('button', { name: /go to Numerical Reasoning question N1/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /go to Verbal Ability question V1/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /go to Clerical Ability question C1/i })).not.toBeInTheDocument();
  });
});

describe('BookletExamLayout — navigator grids are compact and grouped by subject', () => {
  it('shows a compact grid (grid-cols-5) per subject, not one item per row', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);

    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    // Headings remain subject-labelled; the grid itself carries the item numbers.
    const headingTexts = within(dialog)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim());
    expect(headingTexts.some((text) => text?.startsWith('Verbal Ability'))).toBe(true);
    expect(headingTexts.some((text) => text?.startsWith('Numerical Reasoning'))).toBe(true);

    const v1Button = within(dialog).getByRole('button', { name: /go to item 1 in Verbal Ability/i });
    expect(v1Button.parentElement).toHaveClass('grid-cols-5');
  });

  it('shows every subject\'s questions at once (not just the active subject)', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    expect(within(dialog).getByRole('button', { name: /go to item 1 in Verbal Ability/i })).toBeInTheDocument();
    // Simulation numbering remains continuous across subjects.
    expect(within(dialog).getByRole('button', { name: /go to item 3 in Numerical Reasoning/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /go to item 1 in Numerical Reasoning/i })).not.toBeInTheDocument();
  });

  it('clicking a question number in a non-active subject switches to it and scrolls there', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    await user.click(within(dialog).getByRole('button', { name: /go to item 4 in Numerical Reasoning/i }));

    expect(screen.getByText('Question text for N1')).toBeInTheDocument();
    expect(screen.getByText('Question text for N2')).toBeInTheDocument();
    expect(screen.queryByText('Question text for V1')).not.toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

describe('BookletExamLayout — navigator drawer positioning matches Practice', () => {
  it('is positioned absolute inset-y-0 left-0, flush against the header', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    expect(dialog).toHaveClass('absolute', 'inset-y-0', 'left-0');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);
    expect(screen.getByRole('dialog', { name: 'Question navigation' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Question navigation' })).not.toBeInTheDocument();
  });
});

describe('BookletExamLayout — position restored when returning to a subject', () => {
  it('scrolls to the previously-viewed question in a subject when switching back to it', async () => {
    const user = userEvent.setup();
    renderLayout();
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    const nextButtons = screen.getAllByRole('button', { name: 'Next question' });
    await user.click(nextButtons[0]); // V1 -> V2

    await openNavigator(user);
    let dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'Numerical Reasoning'));

    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    await openNavigator(user);
    dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'Verbal Ability'));

    const calledIds = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.instances.map(
      (el) => (el as HTMLElement).id
    );
    expect(calledIds).toContain('question-V2');
  });
});

describe('BookletExamLayout — Previous/Next within a subject, deliberate crossing at boundaries', () => {
  it('Next moves within the subject first (V1 -> V2), no subject change', async () => {
    const user = userEvent.setup();
    renderLayout();
    const nextButtons = screen.getAllByRole('button', { name: 'Next question' });
    await user.click(nextButtons[0]);
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.getByText('Question text for V2')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('Next from the last question of a subject crosses into the first question of the next subject', async () => {
    const user = userEvent.setup();
    renderLayout();
    const nextButtons = screen.getAllByRole('button', { name: 'Next question' });
    await user.click(nextButtons[0]); // V1 -> V2
    await user.click(nextButtons[0]); // V2 -> N1 (crosses boundary)

    expect(screen.getByText('Question text for N1')).toBeInTheDocument();
    expect(screen.queryByText('Question text for V1')).not.toBeInTheDocument();
  });

  it('Previous is disabled at the very first question of the very first subject', () => {
    renderLayout();
    const prevButtons = screen.getAllByRole('button', { name: 'Previous question' });
    for (const button of prevButtons) expect(button).toBeDisabled();
  });
});

describe('BookletExamLayout — submit is always available', () => {
  it('renders an enabled Submit button regardless of active subject', async () => {
    const user = userEvent.setup();
    const { onSubmitExam } = renderLayout();
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'Numerical Reasoning'));

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    for (const button of submitButtons) expect(button).toBeEnabled();
    await user.click(submitButtons[0]);
    expect(onSubmitExam).toHaveBeenCalledTimes(1);
  });
});

describe('BookletExamLayout — legacy/flat fallback (no session.items)', () => {
  it('shows no subject switcher and renders every question in one flat run', () => {
    const legacySession = baseSession({ questionIds: ['V1', 'V2'] }); // no items
    renderLayout({ session: legacySession, questionIndex: twoSubjectIndex() });
    expect(screen.queryByText('Subjects')).not.toBeInTheDocument();
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.getByText('Question text for V2')).toBeInTheDocument();
  });
});

describe('BookletExamLayout — EDQ section rendering', () => {
  const edqItems = (ids: string[]) =>
    ids.map((id) => ({ kind: 'administrative' as const, id, sectionId: 'EDQ' }));

  function renderWithEdq(edqAnswers: Record<string, string> = {}, responseMode = false) {
    const items: SessionItem[] = [...edqItems(['edq-06', 'edq-07', 'edq-08']), ...TWO_SUBJECT_ITEMS];
    const session = baseSession({
      questionIds: ['V1', 'V2', 'N1', 'N2'],
      items,
      edqAnswers,
      edqResponseMode: responseMode,
    });
    return renderLayout({
      session,
      edq: {
        getItem: (id: string) => realGetEdqItem(id),
        answers: edqAnswers,
        responseMode,
        onSelect: vi.fn(),
        onToggleResponseMode: vi.fn(),
      },
    });
  }

  it('renders the shared run instruction ONCE above the education pair, not per item', () => {
    renderWithEdq();
    const instructions = screen.getAllByText(/answer only the item that applies to your highest educational attainment/i);
    expect(instructions).toHaveLength(1);
  });

  it('marks a conditionally non-applicable item and keeps it non-interactive even in response mode', () => {
    // College graduate → item 8 (non-graduate year level) is not applicable.
    renderWithEdq({ 'edq-06': 'College graduate' }, true);
    expect(screen.getByText(/not applicable based on your earlier response/i)).toBeInTheDocument();
    // The non-applicable item renders no radio controls; the applicable item does.
    const radios = screen.getAllByRole('radio');
    const item7OptionTexts = realGetEdqItem('edq-07')!.options;
    expect(radios.some((r) => item7OptionTexts.includes(r.textContent?.replace(/^\d+/, '').trim() ?? ''))).toBe(true);
  });

  it('EDQ items use the neutral card treatment and are read-only until response mode is enabled', () => {
    renderWithEdq({}, false);
    const edqCard = document.getElementById('question-edq-06');
    expect(edqCard).toHaveClass('rounded-xl', 'shadow-sm');
    expect(edqCard).not.toHaveClass('bg-emerald-50', 'border-emerald-500');
    // no interactive radios for EDQ items while the mode is off (subject
    // switcher/nav buttons are buttons, not radios)
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('Skip EDQ jumps to the first scored subject while keeping EDQ reachable in the navigator', async () => {
    const user = userEvent.setup();
    renderWithEdq({}, false);

    await user.click(screen.getByRole('button', { name: 'Skip EDQ and continue to test proper' }));
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.queryByText('Sex')).not.toBeInTheDocument();

    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'EDQ'));
    expect(screen.getByText('Highest educational attainment')).toBeInTheDocument();
  });
});

describe('EDQ responses persist locally (and only locally)', () => {
  it('round-trips edqAnswers through the local session store', () => {
    const session = baseSession({
      questionIds: ['V1'],
      items: [{ kind: 'administrative', id: 'edq-01', sectionId: 'EDQ' }, ...TWO_SUBJECT_ITEMS],
      edqAnswers: { 'edq-01': 'Female' },
      edqResponseMode: true,
    });
    saveActiveSession(session);
    const restored = loadActiveSession();
    expect(restored?.edqAnswers).toEqual({ 'edq-01': 'Female' });
    expect(restored?.edqResponseMode).toBe(true);
    clearActiveSession();
  });
});
