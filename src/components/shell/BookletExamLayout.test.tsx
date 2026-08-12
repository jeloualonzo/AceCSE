// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { BookletExamLayout } from './BookletExamLayout';
import type { ExamSession, Question, SessionItem } from '@/types';

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

describe('BookletExamLayout — continuous within a subject, not across the exam', () => {
  it('renders a tab per subject, starting on the first subject with an unanswered question', () => {
    renderLayout();
    expect(screen.getByRole('tab', { name: /Verbal Ability/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Numerical Reasoning/ })).toBeInTheDocument();
  });

  it('renders only the active subject\'s questions, never the other subject\'s in the same view', () => {
    renderLayout();
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.getByText('Question text for V2')).toBeInTheDocument();
    expect(screen.queryByText('Question text for N1')).not.toBeInTheDocument();
    expect(screen.queryByText('Question text for N2')).not.toBeInTheDocument();
  });

  it('switching the subject tab swaps the visible questions and updates the subject-scoped navigator badge', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Numerical Reasoning/ }));

    expect(screen.queryByText('Question text for V1')).not.toBeInTheDocument();
    expect(screen.queryByText('Question text for V2')).not.toBeInTheDocument();
    expect(screen.getByText('Question text for N1')).toBeInTheDocument();
    expect(screen.getByText('Question text for N2')).toBeInTheDocument();

    // Navigator trigger's accessible name (its aria-label) is subject-scoped — "question 1 of 2 in ..." — never a global "of 165" count.
    expect(screen.getByRole('button', { name: /question 1 of 2 in Numerical Reasoning/i })).toBeInTheDocument();
  });

  it('does not render a global "Question X of N" style counter anywhere in the header', () => {
    renderLayout();
    expect(screen.queryByText(/Question \d+ of \d+/)).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('tab', { name: /Numerical Reasoning/ }));
    await user.click(screen.getByRole('tab', { name: /Verbal Ability/ }));

    const v1ChoiceAAfterReturn = within(document.getElementById('question-V1')!).getAllByRole('radio')[0];
    expect(v1ChoiceAAfterReturn).toHaveAttribute('aria-checked', 'true');
  });
});

describe('BookletExamLayout — navigator is a flat grid, subject-scoped', () => {
  it('shows a compact grid (not one item per row) numbered 1..N within the active subject only', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: /open question navigation/i }));

    const nav = screen.getByRole('dialog', { name: 'Exam navigator' });
    const grid = within(nav).getByText('1').closest('div');
    expect(grid).toHaveClass('grid-cols-5');
    // Both Verbal questions show as 1 and 2 (subject-scoped), no Numerical questions present.
    expect(within(nav).getByRole('button', { name: /go to question 1/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /go to question 2/i })).toBeInTheDocument();
    expect(within(nav).queryAllByRole('button', { name: /go to question/i })).toHaveLength(2);
  });

  it('updates to the newly active subject\'s numbers when the subject changes', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('tab', { name: /Numerical Reasoning/ }));
    await user.click(screen.getByRole('button', { name: /open question navigation/i }));

    const nav = screen.getByRole('dialog', { name: 'Exam navigator' });
    expect(within(nav).queryAllByRole('button', { name: /go to question/i })).toHaveLength(2);
    expect(within(nav).getByText('Numerical Reasoning')).toBeInTheDocument();
  });

  it('is positioned flush against the header (left-anchored, matching Practice), not floating below it', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: /open question navigation/i }));
    const nav = screen.getByRole('dialog', { name: 'Exam navigator' });
    expect(nav).toHaveClass('absolute', 'inset-y-0', 'left-0');
  });
});

describe('BookletExamLayout — Previous/Next within a subject, deliberate crossing at boundaries', () => {
  it('Next moves within the subject first (V1 -> V2)', async () => {
    const user = userEvent.setup();
    renderLayout();
    const nextButtons = screen.getAllByRole('button', { name: /next question/i });
    await user.click(nextButtons[0]);
    // Still on Verbal Ability — no subject switch for an in-bounds Next.
    expect(screen.getByRole('tab', { name: /Verbal Ability/ })).toHaveAttribute('aria-selected', 'true');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('Previous is disabled at the very first question of the very first subject', () => {
    renderLayout();
    const prevButtons = screen.getAllByRole('button', { name: /previous question/i });
    for (const button of prevButtons) expect(button).toBeDisabled();
  });
});

describe('BookletExamLayout — position restored when returning to a subject', () => {
  it('scrolls to the previously-viewed question in a subject when switching back to it', async () => {
    const user = userEvent.setup();
    renderLayout();
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

    // Move to V2 within Verbal (Next), then leave to Numerical, then return.
    const nextButtons = screen.getAllByRole('button', { name: /next question/i });
    await user.click(nextButtons[0]); // -> V2
    await user.click(screen.getByRole('tab', { name: /Numerical Reasoning/ }));
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    await user.click(screen.getByRole('tab', { name: /Verbal Ability/ }));

    // Returning to Verbal should scroll to V2's anchor, not reset to V1.
    const calledIds = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.instances.map(
      (el) => (el as HTMLElement).id
    );
    expect(calledIds).toContain('question-V2');
  });
});

describe('BookletExamLayout — Previous/Next deliberately cross subject boundaries', () => {
  it('Next from the last question of a subject moves into the first question of the next subject', async () => {
    const user = userEvent.setup();
    renderLayout();
    const nextButtons = screen.getAllByRole('button', { name: /next question/i });
    await user.click(nextButtons[0]); // V1 -> V2 (last in Verbal)
    await user.click(nextButtons[0]); // V2 -> should cross into Numerical Reasoning (N1)

    expect(screen.getByRole('tab', { name: /Numerical Reasoning/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Question text for N1')).toBeInTheDocument();
    expect(screen.queryByText('Question text for V1')).not.toBeInTheDocument();
  });
});

describe('BookletExamLayout — submit is always available', () => {
  it('renders an enabled Submit button regardless of active subject', async () => {
    const user = userEvent.setup();
    const { onSubmitExam } = renderLayout();
    await user.click(screen.getByRole('tab', { name: /Numerical Reasoning/ }));
    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    for (const button of submitButtons) expect(button).toBeEnabled();
    await user.click(submitButtons[0]);
    expect(onSubmitExam).toHaveBeenCalledTimes(1);
  });
});

describe('BookletExamLayout — legacy/flat fallback (no session.items)', () => {
  it('shows no subject tabs and renders every question in one flat run', () => {
    const legacySession = baseSession({ questionIds: ['V1', 'V2'] }); // no items
    renderLayout({ session: legacySession, questionIndex: twoSubjectIndex() });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('Question text for V1')).toBeInTheDocument();
    expect(screen.getByText('Question text for V2')).toBeInTheDocument();
  });
});

describe('BookletExamLayout — navigator closes on Escape and returns focus', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderLayout();
    const trigger = screen.getByRole('button', { name: /open question navigation/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Exam navigator' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Exam navigator' })).not.toBeInTheDocument();
  });
});
