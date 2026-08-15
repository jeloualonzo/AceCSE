import { describe, expect, it } from 'vitest';
import type { Attempt } from '@/types';
import { computeStats } from './analytics';

function attempt(mode: 'practice' | 'simulation', id: string): Attempt {
  return {
    id,
    mode,
    examLevel: 'Professional',
    questionCount: 2,
    correctCount: 1,
    answeredCount: mode === 'practice' ? 1 : 2,
    unansweredCount: mode === 'practice' ? 1 : 0,
    percentage: mode === 'practice' ? 100 : 50,
    passed: mode === 'simulation' ? false : false,
    durationSeconds: 60,
    startedAt: 1_000,
    completedAt: 61_000,
    subjects: [{
      subject: 'Verbal Ability',
      total: 2,
      answered: mode === 'practice' ? 1 : 2,
      unanswered: mode === 'practice' ? 1 : 0,
      correct: 1,
      percentage: mode === 'practice' ? 100 : 50,
    }],
    items: [
      {
        questionId: `${id}-1`,
        subject: 'Verbal Ability',
        topic: 'Grammar & Usage',
        selected: 'A',
        correct: 'A',
        isCorrect: true,
      },
      {
        questionId: `${id}-2`,
        subject: 'Verbal Ability',
        topic: 'Grammar & Usage',
        selected: mode === 'practice' ? null : 'B',
        correct: 'A',
        isCorrect: false,
      },
    ],
  };
}

describe('computeStats Practice answered metrics', () => {
  it('does not count unanswered Practice items in totalQuestionsAnswered or mastery denominators', () => {
    const stats = computeStats([attempt('practice', 'practice-1')]);

    expect(stats.totalQuestionsAnswered).toBe(1);
    expect(stats.subjectMastery[0]).toEqual({
      subject: 'Verbal Ability',
      totalItems: 1,
      correctItems: 1,
      percentage: 100,
    });
  });

  it('keeps Simulation totals based on all scored items', () => {
    const stats = computeStats([attempt('simulation', 'simulation-1')]);

    expect(stats.totalQuestionsAnswered).toBe(2);
    expect(stats.subjectMastery[0]).toEqual({
      subject: 'Verbal Ability',
      totalItems: 2,
      correctItems: 1,
      percentage: 50,
    });
  });
});
