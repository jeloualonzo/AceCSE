import type { ActiveFocus } from '@/types';

export interface FocusCandidate {
  id: string;
  top: number;
  bottom: number;
}

export type FocusEntityCandidate = FocusCandidate & (
  | { focusType: 'task'; taskId: string }
  | { focusType: 'question'; questionId: string }
);

export function focusLineY(viewportTop: number, viewportHeight: number, ratio = 0.4): number {
  return viewportTop + Math.max(0, viewportHeight) * ratio;
}

function distanceToFocus(candidate: FocusCandidate, focusY: number): number {
  if (focusY < candidate.top) return candidate.top - focusY;
  if (focusY > candidate.bottom) return focusY - candidate.bottom;
  return 0;
}

/**
 * Select one task or question for the primary viewport focus line. Candidates
 * are the small focus-band set supplied by the one booklet IntersectionObserver
 * rather than every mounted node. A current entity is retained when the focus
 * line is in a gap, which preserves the existing hysteresis behavior.
 */
export function selectFocusEntity(
  candidates: readonly FocusEntityCandidate[],
  focusY: number,
  currentId: string | null
): FocusEntityCandidate | null {
  if (candidates.length === 0) return null;

  const containing = candidates.filter((candidate) => candidate.top <= focusY && candidate.bottom >= focusY);
  if (containing.length > 0) {
    return containing
      .slice()
      .sort((a, b) => Math.abs((a.top + a.bottom) / 2 - focusY) - Math.abs((b.top + b.bottom) / 2 - focusY))[0];
  }

  if (currentId) {
    const current = candidates.find((candidate) => candidate.id === currentId);
    if (current) return current;
  }

  return candidates
    .slice()
    .sort((a, b) => distanceToFocus(a, focusY) - distanceToFocus(b, focusY))[0];
}

/**
 * Legacy question-only selector retained for callers/tests that predate task
 * focus. It delegates to the same focus-line and hysteresis algorithm.
 */
export function selectFocusQuestion(
  candidates: readonly FocusCandidate[],
  focusY: number,
  currentId: string | null
): string | null {
  const selected = selectFocusEntity(
    candidates.map((candidate) => ({ ...candidate, focusType: 'question' as const, questionId: candidate.id })),
    focusY,
    currentId
  );
  return selected?.focusType === 'question' ? selected.questionId : null;
}

export function focusFromCandidate(candidate: FocusEntityCandidate | null): ActiveFocus {
  if (!candidate) return null;
  return candidate.focusType === 'task'
    ? { type: 'task', taskId: candidate.taskId }
    : { type: 'question', questionId: candidate.questionId };
}
