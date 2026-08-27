// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

// Two subjects, two questions each — enough to exercise Grid navigation,
// subject switching, ordering, and boundary controls without a huge fixture.
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

function singleSubjectPracticeFixture(count: number) {
  const questionIds = Array.from({ length: count }, (_, index) => `V${index + 1}`);
  return {
    session: baseSession({
      config: {
        mode: 'practice',
        examLevel: 'Professional',
        questionCount: count,
        timed: false,
        durationSeconds: null,
        subjects: ['Verbal Ability'],
      },
      questionIds,
      items: questionIds.map((questionId) => ({ kind: 'question' as const, questionId, sectionId: 'Verbal Ability' })),
    }),
    questionIndex: new Map(questionIds.map((id) => [id, makeQuestion(id, 'Verbal Ability')])),
  };
}

/** Id prefixes for the multi-subject Practice fixture, in booklet order. */
const PRACTICE_SUBJECTS: ReadonlyArray<readonly [Question['subject'], string]> = [
  ['Verbal Ability', 'V'],
  ['Numerical Reasoning', 'N'],
  ['Clerical Ability', 'C'],
];

/**
 * A Practice session spanning several subjects with a DIFFERENT number of items
 * in each — the shape subject-local numbering has to get right, and the shape a
 * single-subject fixture cannot distinguish from global numbering.
 *
 * `counts[i]` items are authored for `PRACTICE_SUBJECTS[i]`, ids `<prefix><n>`,
 * so growing an earlier subject's count models an append-only Show More batch.
 * Fewer than five subjects deliberately: this must not be an All Subjects run.
 */
function multiSubjectPracticeFixture(counts: readonly number[]) {
  const subjects = PRACTICE_SUBJECTS.slice(0, counts.length);
  const items: SessionItem[] = [];
  const questionIndex = new Map<string, Question>();
  subjects.forEach(([subject, prefix], subjectIndex) => {
    for (let n = 1; n <= counts[subjectIndex]; n += 1) {
      const id = `${prefix}${n}`;
      items.push({ kind: 'question', questionId: id, sectionId: subject });
      questionIndex.set(id, makeQuestion(id, subject));
    }
  });
  const questionIds = [...questionIndex.keys()];
  return {
    session: baseSession({
      config: {
        mode: 'practice',
        examLevel: 'Professional',
        questionCount: questionIds.length,
        timed: false,
        durationSeconds: null,
        subjects: subjects.map(([subject]) => subject),
      },
      questionIds,
      items,
    }),
    questionIndex,
  };
}

/**
 * The numeric labels in one subject's navigator grid, in DOM order.
 *
 * Matches the subject heading by prefix because Simulation appends the item
 * range to it ("Verbal Ability 1–2") while Practice shows the bare subject, and
 * takes the heading's next element sibling — which is the subject's one grid.
 */
function gridFor(dialog: HTMLElement, subject: string): HTMLElement {
  const heading = within(dialog)
    .getAllByRole('heading', { level: 3 })
    .find((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim().startsWith(subject));
  if (!heading) throw new Error(`No navigator heading for ${subject}`);
  return heading.nextElementSibling as HTMLElement;
}

function gridLabelsFor(dialog: HTMLElement, subject: string): string[] {
  return [...gridFor(dialog, subject).querySelectorAll('button')].map(
    (button) => button.textContent?.trim() ?? ''
  );
}

/** ['1', '2', … , String(count)] — the labels a subject of `count` items shows. */
function countingTo(count: number): string[] {
  return Array.from({ length: count }, (_, index) => String(index + 1));
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

/** The shared header has one Grid trigger in the DOM; keep this helper
 * focused on its accessible behavior rather than CSS breakpoint visibility. */
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

describe('BookletExamLayout — shared header and subject navigation separation', () => {
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

  it('keeps the exact Exit → Grid → Timer → Submit header order without question-level controls', () => {
    renderLayout();
    const header = document.querySelector('header') as HTMLElement;
    const controls = [...header.querySelectorAll('button')];

    expect(controls.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Exit Exam',
      expect.stringMatching(/open question navigation/i),
      expect.stringMatching(/submit exam/i),
    ]);
    expect(screen.queryByRole('button', { name: 'Previous question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Previous question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Submit practice/i })).toHaveLength(1);
    expect(document.querySelector('[data-subject-navigation]')).not.toBeInTheDocument();
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

  });
});

describe('BookletExamLayout — Practice navigation cleanup', () => {
  it('keeps Show More and removes subject arrows plus the old question-level footer', async () => {
    const user = userEvent.setup();
    const sameSubjectIndex = new Map(twoSubjectIndex());
    sameSubjectIndex.set('V3', makeQuestion('V3', 'Verbal Ability'));
    const onLoadMore = vi.fn();
    const practiceSession = baseSession({
      config: {
        mode: 'practice',
        examLevel: 'Professional',
        questionCount: 3,
        timed: false,
        durationSeconds: null,
        subjects: ['Verbal Ability'],
      },
      questionIds: ['V1', 'V2', 'V3'],
      items: [
        { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
        { kind: 'question', questionId: 'V2', sectionId: 'Verbal Ability' },
        { kind: 'question', questionId: 'V3', sectionId: 'Verbal Ability' },
      ],
    });
    const { onSubmitExam } = renderLayout({
      session: practiceSession,
      questionIndex: sameSubjectIndex,
      onLoadMore,
      hasMorePractice: true,
    });
    const header = document.querySelector('header') as HTMLElement;
    expect([...header.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'))).toEqual([
      'Exit Exam',
      expect.stringMatching(/open question navigation/i),
      expect.stringMatching(/submit practice/i),
    ]);

    expect(screen.queryByRole('button', { name: 'Previous question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-subject-navigation]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more Practice questions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show more Practice questions' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /Submit practice/i }));
    expect(onSubmitExam).toHaveBeenCalledTimes(1);
  });
});

describe('BookletExamLayout — active question visual state', () => {
  it('marks exactly one primary card and moves the emphasis with a retained Grid jump', async () => {
    const user = userEvent.setup();
    const onActiveQuestionChange = vi.fn();
    renderLayout({ onActiveQuestionChange });

    expect(document.querySelectorAll('[data-primary-active="true"]')).toHaveLength(1);
    expect(document.getElementById('question-V1')).toHaveAttribute('data-primary-active', 'true');
    expect(document.getElementById('question-V1')).toHaveClass('border-emerald-400/90', 'shadow-md');
    expect(document.getElementById('question-V2')).toHaveAttribute('data-primary-active', 'false');
    expect(document.getElementById('question-V2')).toHaveClass('border-emerald-200/80', 'shadow-sm');

    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(within(dialog).getByRole('button', { name: /go to item 2 in Verbal Ability/i }));
    expect(document.getElementById('question-V2')).toHaveAttribute('data-primary-active', 'true');
    expect(document.getElementById('question-V1')).toHaveAttribute('data-primary-active', 'false');
    expect(onActiveQuestionChange).toHaveBeenCalledWith('V2');
  });
});

describe('BookletExamLayout — programmatic navigation target synchronization', () => {
  it('keeps the Grid-selected question active instead of allowing another card to steal the border', async () => {
    const user = userEvent.setup();
    const sameSubjectIndex = new Map(twoSubjectIndex());
    sameSubjectIndex.set('V3', makeQuestion('V3', 'Verbal Ability'));
    const onActiveQuestionChange = vi.fn();
    renderLayout({
      onActiveQuestionChange,
      questionIndex: sameSubjectIndex,
      session: baseSession({
        questionIds: ['V1', 'V2', 'V3'],
        items: [
          { kind: 'question', questionId: 'V1', sectionId: 'Verbal Ability' },
          { kind: 'question', questionId: 'V2', sectionId: 'Verbal Ability' },
          { kind: 'question', questionId: 'V3', sectionId: 'Verbal Ability' },
        ],
      }),
    });

    await openNavigator(user);
    let dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(within(dialog).getByRole('button', { name: /go to item 3 in Verbal Ability/i }));
    expect(document.getElementById('question-V3')).toHaveAttribute('data-primary-active', 'true');

    await openNavigator(user);
    dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(within(dialog).getByRole('button', { name: /go to item 2 in Verbal Ability/i }));
    expect(document.getElementById('question-V2')).toHaveAttribute('data-primary-active', 'true');
    expect(document.getElementById('question-V1')).toHaveAttribute('data-primary-active', 'false');
    expect(onActiveQuestionChange).toHaveBeenLastCalledWith('V2');
  });

  it('makes a navigator jump target the active question as well as the visible question', async () => {
    const user = userEvent.setup();
    const onActiveQuestionChange = vi.fn();
    renderLayout({ onActiveQuestionChange });
    await openNavigator(user);
    let dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(within(dialog).getByRole('button', { name: /go to item 2 in Verbal Ability/i }));
    await openNavigator(user);
    dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(within(dialog).getByRole('button', { name: /go to item 1 in Verbal Ability/i }));

    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(document.getElementById('question-V1')).toHaveAttribute('data-primary-active', 'true');
    expect(onActiveQuestionChange).toHaveBeenLastCalledWith('V1');
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

describe('BookletExamLayout — shared task active focus', () => {
  it('activates directions and then Question 1 through the same focus-line observer', async () => {
    const callbacks: Array<(entries: IntersectionObserverEntry[]) => void> = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        callbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    });
    const onActiveFocusChange = vi.fn();
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
    renderLayout({ session: sharedSession, onActiveFocusChange });

    const main = document.querySelector('main') as HTMLElement;
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      height: 100,
      width: 100,
      left: 0,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(main, 'clientHeight', { configurable: true, value: 100 });

    const taskCard = document.querySelector('[data-focus-type="task"]') as HTMLElement;
    const questionOne = document.getElementById('question-V1') as HTMLElement;
    const questionTwo = document.getElementById('question-V2') as HTMLElement;
    const observer = callbacks.at(-1);
    expect(observer).toBeDefined();

    const entry = (target: HTMLElement, top: number, bottom: number): IntersectionObserverEntry => ({
      target,
      isIntersecting: true,
      boundingClientRect: { top, bottom, height: bottom - top, width: 100, left: 0, right: 100, x: 0, y: top, toJSON: () => ({}) },
      intersectionRatio: 1,
      intersectionRect: { top, bottom, height: bottom - top, width: 100, left: 0, right: 100, x: 0, y: top, toJSON: () => ({}) },
      rootBounds: null,
      time: 0,
    } as IntersectionObserverEntry);

    await act(async () => {
      observer?.([
        entry(taskCard, 0, 70),
        entry(questionOne, 70, 220),
        entry(questionTwo, 220, 360),
      ]);
    });

    expect(taskCard).toHaveAttribute('data-focus-active', 'true');
    expect(taskCard).toHaveClass('border-emerald-300', 'shadow-md');
    expect(questionOne).toHaveAttribute('data-focus-active', 'false');
    expect(questionOne).toHaveAttribute('data-primary-active', 'false');
    expect(document.querySelectorAll('[data-focus-active="true"]')).toHaveLength(1);
    expect(onActiveFocusChange).toHaveBeenLastCalledWith({
      type: 'task',
      taskId: 'pool:Verbal Ability:spelling:shared_spelling_task',
    });

    await act(async () => {
      observer?.([
        entry(taskCard, -80, 20),
        entry(questionOne, 20, 120),
        entry(questionTwo, 120, 260),
      ]);
    });

    expect(taskCard).toHaveAttribute('data-focus-active', 'false');
    expect(questionOne).toHaveAttribute('data-focus-active', 'true');
    expect(questionOne).toHaveAttribute('data-primary-active', 'true');
    expect(questionOne).toHaveClass('border-emerald-400/90', 'shadow-md');
    expect(document.querySelectorAll('[data-focus-active="true"]')).toHaveLength(1);
    expect(onActiveFocusChange).toHaveBeenLastCalledWith({ type: 'question', questionId: 'V1' });
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
  it('shows all five subject buttons immediately and only encountered numeric grid items', async () => {
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
    // Practice numbers each subject from 1, so the single encountered item in
    // each of these two subjects is that subject's question 1.
    expect(within(dialog).getByRole('button', { name: /go to Numerical Reasoning question 1/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /go to Verbal Ability question 1/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /question 2/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /go to Clerical Ability question [A-Z]1/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /question [NVA CG]\d/i })).not.toBeInTheDocument();
  });
});

describe('BookletExamLayout — Practice numeric navigator grid', () => {
  it('uses five columns with left-to-right numeric order and no placeholder cells', async () => {
    const user = userEvent.setup();
    for (const count of [7, 12]) {
      const fixture = singleSubjectPracticeFixture(count);
      renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });
      await openNavigator(user);
      const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
      const heading = within(dialog).getByRole('heading', { name: 'Verbal Ability' });
      const grid = heading.nextElementSibling as HTMLElement;
      expect(grid).toHaveClass('grid-cols-5');
      const labels = [...grid.querySelectorAll('button')].map((button) => button.textContent?.trim());
      expect(labels).toEqual(Array.from({ length: count }, (_, index) => String(index + 1)));
      expect(grid.querySelectorAll(':empty')).toHaveLength(0);
      cleanup();
    }
  });

  it('keeps existing numeric labels stable when an append-only Practice batch is loaded', async () => {
    const user = userEvent.setup();
    const initial = singleSubjectPracticeFixture(7);
    const extended = singleSubjectPracticeFixture(12);
    const { rerender } = renderLayout({ session: initial.session, questionIndex: initial.questionIndex });
    await openNavigator(user);
    let dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    let grid = within(dialog).getByRole('heading', { name: 'Verbal Ability' }).nextElementSibling as HTMLElement;
    expect([...grid.querySelectorAll('button')].map((button) => button.textContent?.trim())).toEqual(['1', '2', '3', '4', '5', '6', '7']);

    rerender(
      <BookletExamLayout
        examLevel="Professional"
        timeRemainingFormatted="Untimed"
        onExitExam={vi.fn()}
        onSubmitExam={vi.fn()}
        session={extended.session}
        getGroup={() => undefined}
        questionIndex={extended.questionIndex}
        onSelectOption={vi.fn()}
      />
    );
    dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    grid = within(dialog).getByRole('heading', { name: 'Verbal Ability' }).nextElementSibling as HTMLElement;
    expect([...grid.querySelectorAll('button')].map((button) => button.textContent?.trim())).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  });
});

describe('BookletExamLayout — Practice numbers every subject from 1', () => {
  it('restarts at 1 in each subject instead of continuing the session sequence', async () => {
    const user = userEvent.setup();
    const fixture = multiSubjectPracticeFixture([6, 3, 2]);
    renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    expect(gridLabelsFor(dialog, 'Verbal Ability')).toEqual(countingTo(6));
    expect(gridLabelsFor(dialog, 'Numerical Reasoning')).toEqual(countingTo(3));
    expect(gridLabelsFor(dialog, 'Clerical Ability')).toEqual(countingTo(2));
    // Under the old session-wide map Numerical ran 7–9 and Clerical 10–11.
    for (const stale of [7, 8, 9, 10, 11]) {
      expect(within(dialog).queryByRole('button', { name: new RegExp(`question ${stale}\\b`, 'i') })).not.toBeInTheDocument();
    }
  });

  /**
   * The numbers are a display projection, so the thing that must not change is
   * which question each one reaches. Numerical's "2" is N2, not the session's
   * eighth item, and choosing it leaves the Verbal run untouched.
   */
  it('sends a subject-local number to that subject’s own question', async () => {
    const user = userEvent.setup();
    const fixture = multiSubjectPracticeFixture([6, 3]);
    renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    await user.click(within(dialog).getByRole('button', { name: /go to Numerical Reasoning question 2/i }));

    expect(screen.getByText('Question text for N2')).toBeInTheDocument();
    expect(screen.queryByText('Question text for V2')).not.toBeInTheDocument();
    expect(fixture.session.questionIds).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'N1', 'N2', 'N3']);
  });

  /**
   * Show More appends to the subject being practised. Verbal growing 4 → 7 must
   * not renumber Numerical (which a session-wide map would push 5–7 → 8–12), and
   * the numbers already on screen must not move.
   */
  it('keeps numbering subject-local and stable when Show More appends a batch', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const initial = multiSubjectPracticeFixture([4, 3]);
    const { rerender } = renderLayout({
      session: initial.session,
      questionIndex: initial.questionIndex,
      onLoadMore,
      hasMorePractice: true,
    });
    await openNavigator(user);
    let dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    expect(gridLabelsFor(dialog, 'Verbal Ability')).toEqual(countingTo(4));
    expect(gridLabelsFor(dialog, 'Numerical Reasoning')).toEqual(countingTo(3));

    await user.click(screen.getByRole('button', { name: /show more/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    const extended = multiSubjectPracticeFixture([7, 3]);
    rerender(
      <BookletExamLayout
        examLevel="Professional"
        timeRemainingFormatted="Untimed"
        onExitExam={vi.fn()}
        onSubmitExam={vi.fn()}
        session={extended.session}
        getGroup={() => undefined}
        questionIndex={extended.questionIndex}
        onSelectOption={vi.fn()}
        onLoadMore={onLoadMore}
        hasMorePractice
      />
    );

    dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    expect(gridLabelsFor(dialog, 'Verbal Ability')).toEqual(countingTo(7));
    expect(gridLabelsFor(dialog, 'Numerical Reasoning')).toEqual(countingTo(3));
    expect(within(dialog).getByRole('button', { name: /go to Numerical Reasoning question 1/i })).toBeInTheDocument();
  });

  it('keeps the Q label format, with no session total, and resets it per subject', async () => {
    const user = userEvent.setup();
    const fixture = multiSubjectPracticeFixture([6, 3]);
    renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });

    const label = () =>
      screen.getAllByRole('button', { name: /open question navigation/i })[0].textContent?.replace(/\s+/g, ' ').trim();
    expect(label()).toBe('Q 1');

    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(getSubjectSwitchButton(dialog, 'Numerical Reasoning'));

    // Not "Q 7": the header reads the same subject-local map as the grid.
    expect(label()).toBe('Q 1');
  });

  it('leaves Simulation numbering continuous across subjects', async () => {
    const user = userEvent.setup();
    renderLayout();
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    expect(gridLabelsFor(dialog, 'Verbal Ability')).toEqual(['1', '2']);
    expect(gridLabelsFor(dialog, 'Numerical Reasoning')).toEqual(['3', '4']);
  });
});

describe('BookletExamLayout — navigator grid is a deterministic five columns', () => {
  /**
   * A section whose items are split across plain runs and two real
   * multi-question groups: 5 plain, a pair, 3 plain, then four.
   *
   * This is the shape that wrapped 5 / 2 / 3 / 4 — every navigator block opened
   * its own nested grid, so a block of two ended the row after two cells.
   */
  function groupedSimulationFixture() {
    const plain = (n: number): SessionItem => ({
      kind: 'question',
      questionId: `V${n}`,
      sectionId: 'Verbal Ability',
    });
    const items: SessionItem[] = [
      plain(1), plain(2), plain(3), plain(4), plain(5),
      { kind: 'group', groupId: 'g-pair', sectionId: 'Verbal Ability', questionIds: ['V6', 'V7'] },
      plain(8), plain(9), plain(10),
      { kind: 'group', groupId: 'g-quad', sectionId: 'Verbal Ability', questionIds: ['V11', 'V12', 'V13', 'V14'] },
    ];
    const ids = Array.from({ length: 14 }, (_, index) => `V${index + 1}`);
    return {
      session: baseSession({ questionIds: ids, items }),
      questionIndex: new Map(ids.map((id) => [id, makeQuestion(id, 'Verbal Ability')])),
    };
  }

  it('flows a whole subject through one five-column grid, groups included', async () => {
    const user = userEvent.setup();
    const fixture = groupedSimulationFixture();
    renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    const grid = gridFor(dialog, 'Verbal Ability');

    expect(grid).toHaveClass('grid-cols-5');
    // One grid, and every item is a direct cell of it — a nested grid is what
    // broke the row rhythm, so its absence is the regression guard.
    expect(grid.querySelectorAll('.grid')).toHaveLength(0);
    expect([...grid.children].map((child) => child.tagName)).toEqual(Array(14).fill('BUTTON'));
    expect([...grid.children].map((child) => child.textContent?.trim())).toEqual(countingTo(14));
  });

  it('still navigates from a grid cell inside a group', async () => {
    const user = userEvent.setup();
    const fixture = groupedSimulationFixture();
    renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    await user.click(within(dialog).getByRole('button', { name: /go to item 12 in Verbal Ability/i }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('uses the same single five-column grid in Practice', async () => {
    const user = userEvent.setup();
    const fixture = multiSubjectPracticeFixture([6, 3]);
    renderLayout({ session: fixture.session, questionIndex: fixture.questionIndex });
    await openNavigator(user);
    const dialog = screen.getByRole('dialog', { name: 'Question navigation' });

    for (const [subject, count] of [['Verbal Ability', 6], ['Numerical Reasoning', 3]] as const) {
      const grid = gridFor(dialog, subject);
      expect(grid).toHaveClass('grid-cols-5');
      expect(grid.querySelectorAll('.grid')).toHaveLength(0);
      expect([...grid.children].map((child) => child.tagName)).toEqual(Array(count).fill('BUTTON'));
    }
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

    await openNavigator(user);
    let dialog = screen.getByRole('dialog', { name: 'Question navigation' });
    await user.click(within(dialog).getByRole('button', { name: /go to item 2 in Verbal Ability/i }));

    await openNavigator(user);
    dialog = screen.getByRole('dialog', { name: 'Question navigation' });
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

describe('BookletExamLayout — Exam subject-boundary controls', () => {
  it('centers the current subject at the top and places arrow-only navigation at the content end', () => {
    renderLayout();
    const top = document.querySelector('[data-subject-navigation="top"]') as HTMLElement;
    const bottom = document.querySelector('[data-subject-navigation="bottom"]') as HTMLElement;

    expect(top).not.toBeNull();
    expect(within(top).getByRole('heading', { name: 'Verbal Ability' })).toBeInTheDocument();
    expect(within(top).getAllByRole('button')).toHaveLength(2);
    expect(within(top).getByRole('button', { name: 'Previous subject, unavailable' })).toBeDisabled();
    expect(within(top).getByRole('button', { name: 'Next subject' })).toBeEnabled();

    expect(bottom).not.toBeNull();
    expect(within(bottom).queryByRole('heading')).not.toBeInTheDocument();
    expect(bottom.textContent?.trim()).toBe('');
    expect(within(bottom).getAllByRole('button')).toHaveLength(2);
    expect(bottom.parentElement?.lastElementChild).toBe(bottom);
    expect(document.querySelector('footer')).not.toBeInTheDocument();
  });

  it('top subject arrows switch subjects, reset scroll to the destination start, and disable at the last subject', async () => {
    const user = userEvent.setup();
    renderLayout();
    const main = screen.getByRole('main');
    const scrollTo = vi.fn();
    Object.defineProperty(main, 'scrollTo', { configurable: true, value: scrollTo });

    const top = document.querySelector('[data-subject-navigation="top"]') as HTMLElement;
    await user.click(within(top).getByRole('button', { name: 'Next subject' }));

    expect(screen.getByRole('heading', { name: 'Numerical Reasoning' })).toBeInTheDocument();
    expect(screen.queryByText('Question text for V1')).not.toBeInTheDocument();
    expect(screen.getByText('Question text for N1')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    const destinationTop = document.querySelector('[data-subject-navigation="top"]') as HTMLElement;
    expect(within(destinationTop).getByRole('button', { name: 'Previous subject' })).toBeEnabled();
    expect(within(destinationTop).getByRole('button', { name: 'Next subject, unavailable' })).toBeDisabled();
  });

  it('bottom subject arrows switch only between subjects and contain no visible subject label', async () => {
    const user = userEvent.setup();
    renderLayout();
    const bottom = document.querySelector('[data-subject-navigation="bottom"]') as HTMLElement;
    await user.click(within(bottom).getByRole('button', { name: 'Next subject' }));

    expect(screen.getByRole('heading', { name: 'Numerical Reasoning' })).toBeInTheDocument();
    const destinationBottom = document.querySelector('[data-subject-navigation="bottom"]') as HTMLElement;
    expect(destinationBottom.textContent?.trim()).toBe('');
    expect(within(destinationBottom).queryByRole('heading')).not.toBeInTheDocument();
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
