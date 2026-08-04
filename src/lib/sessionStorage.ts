import type { ExamSession } from '@/types';

/**
 * Local persistence for the in-progress session, so a browser refresh or
 * crash never destroys a multi-hour exam. One active session at a time.
 */

const ACTIVE_SESSION_KEY = 'acecse.activeSession.v1';

export function saveActiveSession(session: ExamSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage full or unavailable (private mode) — the session still works in memory.
  }
}

export function loadActiveSession(): ExamSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSession;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray(parsed.questionIds) ||
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.config !== 'object'
    ) {
      clearActiveSession();
      return null;
    }
    // A timed session whose deadline has passed is not resumable.
    if (parsed.deadlineAt !== null && parsed.deadlineAt <= Date.now()) {
      return parsed; // caller decides: grade as expired
    }
    return parsed;
  } catch {
    clearActiveSession();
    return null;
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // ignore
  }
}
