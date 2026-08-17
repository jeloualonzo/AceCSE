export interface FocusCandidate {
  id: string;
  top: number;
  bottom: number;
}

export function focusLineY(viewportTop: number, viewportHeight: number, ratio = 0.4): number {
  return viewportTop + Math.max(0, viewportHeight) * ratio;
}

function distanceToFocus(candidate: FocusCandidate, focusY: number): number {
  if (focusY < candidate.top) return candidate.top - focusY;
  if (focusY > candidate.bottom) return focusY - candidate.bottom;
  return 0;
}

/**
 * Select one question for the primary viewport focus line. Candidates are the
 * small focus-band set supplied by the IntersectionObserver rather than every
 * mounted question. A current question is retained when the focus line is in
 * a gap, which prevents boundary flicker and preserves hysteresis.
 */
export function selectFocusQuestion(
  candidates: readonly FocusCandidate[],
  focusY: number,
  currentId: string | null
): string | null {
  if (candidates.length === 0) return currentId;

  const containing = candidates.filter((candidate) => candidate.top <= focusY && candidate.bottom >= focusY);
  if (containing.length > 0) {
    return containing
      .slice()
      .sort((a, b) => Math.abs((a.top + a.bottom) / 2 - focusY) - Math.abs((b.top + b.bottom) / 2 - focusY))[0].id;
  }

  if (currentId && candidates.some((candidate) => candidate.id === currentId)) return currentId;

  return candidates
    .slice()
    .sort((a, b) => distanceToFocus(a, focusY) - distanceToFocus(b, focusY))[0].id;
}
