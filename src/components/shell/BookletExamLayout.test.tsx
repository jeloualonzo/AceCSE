// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { BookletExamLayout } from './BookletExamLayout';
import type { ExamSession, NormalizedQuestionGroup, Question, SessionItem } from '@/types';

// jsdom implements neither of these; the component only needs them to not throw.
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

function makeQuestion(id: string, subject: Question['subject'] = 'Verbal Ability'): Question {
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

function renderLayout(props: Partial<React.ComponentProps<typeof BookletExamLayout>> = {}) {
  const onSelectOption = vi.fn();
  const onSubmitExam = vi.fn();
  const onExitExam = vi.fn();
  const defaultSession = baseSession({
    questionIds: ['Q1', 'Q2'],
    items: [
      { kind: 'question', questionId: 'Q1', sectionId: 'Verbal Ability' },
      { kind: 'question', questionId: 'Q2', sectionId: 'Verbal Ability' },
    ] as SessionItem[],
  });
  const questionIndex = new Map([
    ['Q1', makeQuestion('Q1')],
    ['Q2', makeQuestion('Q2')],
  ]);

  const utils = render(
    <BookletExamLayout
      examLevel="Professional"
      timeRemainingFormatted="1:00:00"
      onExitExam={onExitExam}
      onSubmitExam={onSubmitExam}
      session={defaultSession}
      getGroup={() => undefined}
      questionIndex={questionIndex}
      onSelectOption={onSelectOption}
      {...props}
    />
  );
  return { ...utils, onSelectOption, onSubmitExam, onExitExam, session: props.session ?? defaultSession };
}

describe('BookletExamLayout — structured rendering', () => {
  it('renders every question from session.items with a section heading', () => {
    renderLayout();
    expect(screen.getByRole('heading', { name: 'Verbal Ability' })).toBeInTheDocument();
    expect(screen.getByText('Question text for Q1')).toBeInTheDocument();
    expect(screen.getByText('Question text for Q2')).toBeInTheDocument();
  });

  it('renders shared group directions/content exactly once, before its member questions', () => {
    const group: NormalizedQuestionGroup = {
      id: 'g1',
      examLevel: 'Both',
      subject: 'Verbal Ability',
      topic: 'Reading',
      questionIds: ['Q1', 'Q2'],
      selectionPolicy: 'atomic',
      orderPolicy: 'fixed',
      tags: [],
      directions: 'Read the passage and answer both questions.',
      questions: [makeQuestion('Q1'), makeQuestion('Q2')],
      isImplicitSingleton: false,
    };
    const session = baseSession({
      questionIds: ['Q1', 'Q2'],
      items: [{ kind: 'group', groupId: 'g1', sectionId: 'Verbal Ability', questionIds: ['Q1', 'Q2'] }],
    });
    renderLayout({ session, getGroup: (id) => (id === 'g1' ? group : undefined) });

    const directionsOccurrences = screen.getAllByText('Read the passage and answer both questions.');
    expect(directionsOccurrences).toHaveLength(1);
  });

  it('falls back to an unsectioned flat run when the session has no items (legacy/practice)', () => {
    const session = baseSession({ questionIds: ['Q1', 'Q2'] }); // no `items`
    renderLayout({ session });
    expect(screen.queryByRole('heading', { name: 'Verbal Ability' })).not.toBeInTheDocument();
    expect(screen.getByText('Question text for Q1')).toBeInTheDocument();
  });
});

describe('BookletExamLayout — answer selection stays session-owned', () => {
  it('calls onSelectOption with the question id, and reflects selection from props (not internal state)', async () => {
    const user = userEvent.setup();
    const { onSelectOption, rerender, session } = renderLayout();

    const q1Choices = within(document.getElementById('question-Q1')!).getAllByRole('radio');
    await user.click(q1Choices[0]); // Choice A
    expect(onSelectOption).toHaveBeenCalledWith('Q1', 'A');

    // Simulate the parent re-rendering with updated session.answers, as
    // ExamPage would after updateSession/saveActiveSession.
    const updatedSession = { ...session, answers: { ...session.answers, Q1: 'A' as const } };
    rerender(
      <BookletExamLayout
        examLevel="Professional"
        timeRemainingFormatted="1:00:00"
        onExitExam={vi.fn()}
        onSubmitExam={vi.fn()}
        session={updatedSession}
        getGroup={() => undefined}
        questionIndex={new Map([['Q1', makeQuestion('Q1')], ['Q2', makeQuestion('Q2')]])}
        onSelectOption={onSelectOption}
      />
    );

    const rerenderedChoiceA = within(document.getElementById('question-Q1')!).getAllByRole('radio')[0];
    expect(rerenderedChoiceA).toHaveAttribute('aria-checked', 'true');
  });
});

describe('BookletExamLayout — submit is always available', () => {
  it('renders an enabled Submit button regardless of scroll position and calls onSubmitExam', async () => {
    const user = userEvent.setup();
    const { onSubmitExam } = renderLayout();
    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    expect(submitButtons.length).toBeGreaterThan(0);
    for (const button of submitButtons) expect(button).toBeEnabled();
    await user.click(submitButtons[0]);
    expect(onSubmitExam).toHaveBeenCalledTimes(1);
  });
});

describe('BookletExamLayout — navigator', () => {
  it('opens on trigger, shows both question numbers, and scrolls to the target on click', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /open navigator/i }));
    const nav = screen.getByRole('dialog', { name: 'Exam navigator' });
    expect(nav).toBeInTheDocument();

    const q2Button = within(nav).getByRole('button', { name: /go to question 2/i });
    fireEvent.click(q2Button);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    // Navigator closes after a jump.
    expect(screen.queryByRole('dialog', { name: 'Exam navigator' })).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderLayout();
    const trigger = screen.getByRole('button', { name: /open navigator/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Exam navigator' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Exam navigator' })).not.toBeInTheDocument();
  });
});

describe('BookletExamLayout — Previous/Next scroll, they do not change what is mounted', () => {
  it('both questions stay in the DOM before and after clicking Next', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.getByText('Question text for Q1')).toBeInTheDocument();
    expect(screen.getByText('Question text for Q2')).toBeInTheDocument();

    const nextButtons = screen.getAllByRole('button', { name: /next question/i });
    await user.click(nextButtons[0]);

    // Nothing unmounts — Next only scrolls/focuses.
    expect(screen.getByText('Question text for Q1')).toBeInTheDocument();
    expect(screen.getByText('Question text for Q2')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
