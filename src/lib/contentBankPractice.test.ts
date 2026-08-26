// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Question } from '@/types';
import {
  buildContentBankPracticeLaunch,
  contentBankPracticePath,
  levelForContentBankQuestions,
  openContentBankPracticeInNewTab,
  readContentBankPracticeLaunch,
} from './contentBankPractice';

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    subject: 'Clerical Ability',
    topic: 'Clerical Operations',
    question: `Question ${id}`,
    choices: [
      { id: 'A', text: 'A' },
      { id: 'B', text: 'B' },
      { id: 'C', text: 'C' },
      { id: 'D', text: 'D' },
      { id: 'E', text: 'E' },
    ],
    correctOptionId: 'A',
    explanation: '',
    difficulty: 'Medium',
    examLevel: 'Subprofessional',
    tags: [],
    ...overrides,
  };
}

describe('Content Bank practice launch', () => {
  it('builds an exact internal-review request in supplied canonical order', () => {
    const questions = [question('A'), question('B')];
    expect(buildContentBankPracticeLaunch(['A', 'B'], questions)).toEqual({
      kind: 'practice',
      examLevel: 'Subprofessional',
      questionCount: 2,
      questionIds: ['A', 'B'],
      internalReview: true,
    });
  });

  it.each([
    [['A', 'B'], [question('A')]],
    [['A', 'A'], [question('A'), question('A')]],
    [['A', 'B'], [question('B'), question('A')]],
    [[], []],
  ] as const)('fails closed for incomplete, duplicate, reordered, or empty input', (ids, questions) => {
    expect(buildContentBankPracticeLaunch(ids, questions)).toBeUndefined();
  });

  it('derives a professional level when the selected questions are professional-only', () => {
    expect(levelForContentBankQuestions([question('A', { subject: 'Analytical Reasoning', examLevel: 'Professional' })])).toBe('Professional');
  });

  it('round-trips a launch request through the canonical exam URL and rejects malformed handoffs', () => {
    const launch = buildContentBankPracticeLaunch(['A', 'B'], [question('A'), question('B')])!;
    expect(readContentBankPracticeLaunch(new URL(contentBankPracticePath(launch), 'https://example.test').search)).toEqual(launch);
    expect(readContentBankPracticeLaunch('?launch=%7B%22kind%22%3A%22practice%22%7D')).toBeUndefined();
  });

  it('opens the canonical Exam route in a new tab and clears the opener', () => {
    const opened = { opener: window } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(opened);
    const launch = buildContentBankPracticeLaunch(['A'], [question('A')])!;

    expect(openContentBankPracticeInNewTab(launch)).toBe(true);
    expect(open).toHaveBeenCalledWith(contentBankPracticePath(launch), '_blank');
    expect(opened.opener).toBeNull();
    open.mockRestore();
  });
});
