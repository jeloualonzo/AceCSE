import { describe, expect, it } from 'vitest';
import type { ExamSession, Question } from '@/types';
import { gradeSession } from './grading';

const questionIndex = new Map<string, Question>(
  Array.from({ length: 20 }, (_, index) => {
    const id = `q-${index + 1}`;
    return [id, {
      id,
      examLevel: 'Both',
      subject: 'Verbal Ability',
      topic: 'Grammar & Usage',
      difficulty: 'Easy',
      question: `Question ${index + 1}`,
      choices: [
        { id: 'A', text: 'Correct' },
        { id: 'B', text: 'Incorrect' },
      ],
      correctOptionId: 'A',
      explanation: 'The correct answer is A.',
      tags: ['test'],
    } satisfies Question];
  })
);

function makeSession(mode: 'practice' | 'simulation', answers: Record<string, 'A' | 'B'>): ExamSession {
  return {
    id: `${mode}-grading-test`,
    config: {
      mode,
      examLevel: 'Professional',
      questionCount: 20,
      subjects: ['Verbal Ability'],
      timed: false,
      durationSeconds: null,
    },
    questionIds: [...questionIndex.keys()],
    startedAt: 1_000,
    deadlineAt: null,
    answers,
  };
}

const partialAnswers = Object.fromEntries([
  ...Array.from({ length: 9 }, (_, index) => [`q-${index + 1}`, 'A']),
  ...Array.from({ length: 3 }, (_, index) => [`q-${index + 10}`, 'B']),
]) as Record<string, 'A' | 'B'>;

describe('gradeSession mode-specific unanswered semantics', () => {
  it('excludes unanswered Practice items from accuracy and reports them separately', () => {
    const attempt = gradeSession(makeSession('practice', partialAnswers), questionIndex, 61_000);

    expect(attempt.questionCount).toBe(20);
    expect(attempt.answeredCount).toBe(12);
    expect(attempt.unansweredCount).toBe(8);
    expect(attempt.correctCount).toBe(9);
    expect(attempt.percentage).toBe(75);
    expect(attempt.passed).toBe(false);
    expect(attempt.subjects).toEqual([
      expect.objectContaining({
        total: 20,
        answered: 12,
        unanswered: 8,
        correct: 9,
        percentage: 75,
      }),
    ]);
    expect(attempt.items.filter((item) => item.selected === null)).toHaveLength(8);
  });

  it('keeps Simulation accuracy based on all scored items, including unanswered items', () => {
    const attempt = gradeSession(makeSession('simulation', partialAnswers), questionIndex, 61_000);

    expect(attempt.questionCount).toBe(20);
    expect(attempt.answeredCount).toBe(12);
    expect(attempt.unansweredCount).toBe(8);
    expect(attempt.correctCount).toBe(9);
    expect(attempt.percentage).toBe(45);
    expect(attempt.subjects[0]).toEqual(expect.objectContaining({ total: 20, answered: 12, unanswered: 8, percentage: 45 }));
  });

  it('handles a fully unanswered Practice session without producing NaN or a penalty count', () => {
    const attempt = gradeSession(makeSession('practice', {}), questionIndex, 61_000);

    expect(attempt.answeredCount).toBe(0);
    expect(attempt.unansweredCount).toBe(20);
    expect(attempt.correctCount).toBe(0);
    expect(attempt.percentage).toBe(0);
    expect(Number.isNaN(attempt.percentage)).toBe(false);
  });
});
