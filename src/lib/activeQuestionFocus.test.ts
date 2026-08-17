import { describe, expect, it } from 'vitest';
import { focusLineY, selectFocusQuestion } from './activeQuestionFocus';

describe('active question focus-line selection', () => {
  const questions = [
    { id: 'Q1', top: 0, bottom: 300 },
    { id: 'Q2', top: 320, bottom: 620 },
    { id: 'Q3', top: 640, bottom: 940 },
  ];

  it('selects the question owning the focus line rather than any visible pixel', () => {
    const focusY = focusLineY(0, 1_000);
    expect(selectFocusQuestion(questions, focusY, null)).toBe('Q2');
  });

  it('retains the current question across boundary gaps and changes only on meaningful focus movement', () => {
    expect(selectFocusQuestion([
      { id: 'Q1', top: 0, bottom: 399 },
      { id: 'Q2', top: 401, bottom: 800 },
    ], 400, 'Q2')).toBe('Q2');
    expect(selectFocusQuestion(questions, 200, 'Q2')).toBe('Q1');
    expect(selectFocusQuestion(questions, 760, 'Q2')).toBe('Q3');
  });

  it('does not skip the middle question in forward or reverse focus movement', () => {
    expect(selectFocusQuestion(questions, 450, 'Q1')).toBe('Q2');
    expect(selectFocusQuestion(questions, 750, 'Q2')).toBe('Q3');
    expect(selectFocusQuestion(questions, 450, 'Q3')).toBe('Q2');
    expect(selectFocusQuestion(questions, 150, 'Q2')).toBe('Q1');
  });
});
