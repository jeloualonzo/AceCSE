import { describe, expect, it } from 'vitest';
import { PassiveTimingController } from './usePassiveTiming';
import { formatElapsedMs } from '@/lib/time';

describe('PassiveTimingController', () => {
  it('accumulates only the primary question and preserves time across revisits', () => {
    const timing = new PassiveTimingController({ activeQuestionId: 'Q1', now: 0 });

    timing.setActiveQuestion('Q2', 2_000);
    expect(timing.snapshot(2_000).questionTimeSpentMs).toEqual({ Q1: 2_000, Q2: 0 });

    timing.setActiveQuestion('Q1', 5_000);
    expect(timing.snapshot(5_000).questionTimeSpentMs).toEqual({ Q1: 2_000, Q2: 3_000 });

    const final = timing.flush(7_500);
    expect(final.sessionElapsedMs).toBe(7_500);
    expect(final.questionTimeSpentMs).toEqual({ Q1: 4_500, Q2: 3_000 });
  });

  it('pauses both session and question timing while the page is hidden', () => {
    const timing = new PassiveTimingController({ activeQuestionId: 'Q1', now: 0 });

    timing.setVisibility(false, 1_000);
    expect(timing.snapshot(4_000)).toEqual({
      sessionElapsedMs: 1_000,
      questionTimeSpentMs: { Q1: 1_000 },
    });

    timing.setVisibility(true, 6_000);
    expect(timing.flush(7_500)).toEqual({
      sessionElapsedMs: 2_500,
      questionTimeSpentMs: { Q1: 2_500 },
    });
  });

  it('stops permanently after a final flush', () => {
    const timing = new PassiveTimingController({ activeQuestionId: 'Q1', now: 0 });

    expect(timing.stop(2_000)).toEqual({
      sessionElapsedMs: 2_000,
      questionTimeSpentMs: { Q1: 2_000 },
    });
    expect(timing.snapshot(8_000)).toEqual({
      sessionElapsedMs: 2_000,
      questionTimeSpentMs: { Q1: 2_000 },
    });
  });

  it('keeps a question with no primary active period at zero', () => {
    const timing = new PassiveTimingController({ now: 0 });
    timing.setActiveQuestion(null, 2_000);
    expect(timing.flush(4_000)).toEqual({ sessionElapsedMs: 4_000, questionTimeSpentMs: {} });
  });
});

describe('PassiveTimingController — task/question focus', () => {
  it('accumulates exactly one task or question target and resumes prior totals on revisit', () => {
    const timing = new PassiveTimingController({
      activeFocus: { type: 'task', taskId: 'pool:Verbal Ability:spelling:shared_spelling_task' },
      now: 0,
    });

    expect(timing.flush(5_000)).toEqual({
      sessionElapsedMs: 5_000,
      questionTimeSpentMs: {},
      taskTimeSpentMs: { 'pool:Verbal Ability:spelling:shared_spelling_task': 5_000 },
    });

    timing.setActiveFocus({ type: 'question', questionId: 'Q1' }, 5_000);
    expect(timing.flush(7_000)).toEqual({
      sessionElapsedMs: 7_000,
      questionTimeSpentMs: { Q1: 2_000 },
      taskTimeSpentMs: { 'pool:Verbal Ability:spelling:shared_spelling_task': 5_000 },
    });

    timing.setActiveFocus({ type: 'question', questionId: 'Q2' }, 9_000);
    expect(timing.flush(10_000)).toEqual({
      sessionElapsedMs: 10_000,
      questionTimeSpentMs: { Q1: 4_000, Q2: 1_000 },
      taskTimeSpentMs: { 'pool:Verbal Ability:spelling:shared_spelling_task': 5_000 },
    });

    timing.setActiveFocus({ type: 'task', taskId: 'pool:Verbal Ability:spelling:shared_spelling_task' }, 10_000);
    expect(timing.flush(13_000)).toEqual({
      sessionElapsedMs: 13_000,
      questionTimeSpentMs: { Q1: 4_000, Q2: 1_000 },
      taskTimeSpentMs: { 'pool:Verbal Ability:spelling:shared_spelling_task': 8_000 },
    });

    timing.setActiveFocus({ type: 'question', questionId: 'Q1' }, 14_000);
    expect(timing.flush(16_000)).toEqual({
      sessionElapsedMs: 16_000,
      questionTimeSpentMs: { Q1: 6_000, Q2: 1_000 },
      taskTimeSpentMs: { 'pool:Verbal Ability:spelling:shared_spelling_task': 9_000 },
    });
  });

  it('pauses task and question timing together when the page is hidden', () => {
    const timing = new PassiveTimingController({
      activeFocus: { type: 'task', taskId: 'task-1' },
      now: 0,
    });

    timing.setVisibility(false, 1_000);
    expect(timing.snapshot(4_000)).toEqual({
      sessionElapsedMs: 1_000,
      questionTimeSpentMs: {},
      taskTimeSpentMs: { 'task-1': 1_000 },
    });

    timing.setVisibility(true, 6_000);
    timing.setActiveFocus({ type: 'question', questionId: 'Q1' }, 7_000);
    expect(timing.flush(9_000)).toEqual({
      sessionElapsedMs: 4_000,
      questionTimeSpentMs: { Q1: 2_000 },
      taskTimeSpentMs: { 'task-1': 2_000 },
    });
  });
});

describe('formatElapsedMs', () => {
  it('uses mm:ss and expands to hh:mm:ss for long sessions', () => {
    expect(formatElapsedMs(0)).toBe('00:00');
    expect(formatElapsedMs(24_900)).toBe('00:24');
    expect(formatElapsedMs(3_661_000)).toBe('01:01:01');
  });
});
