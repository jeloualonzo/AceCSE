import { useCallback, useEffect, useState } from 'react';
import type { ExamLevel } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { fetchPreferredExamLevel, savePreferredExamLevel } from '@/services/profile';

const STORAGE_KEY = 'acecse.examLevel.v1';

function isExamLevel(value: unknown): value is ExamLevel {
  return value === 'Professional' || value === 'Subprofessional';
}

function readStoredLevel(): ExamLevel | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isExamLevel(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The user's active examination level — a first-class app setting.
 *
 * Persistence strategy:
 *  - localStorage answers instantly on every load (no flash, works offline).
 *  - The Firestore profile (`preferredExamLevel`) makes the choice follow the
 *    account across devices: it hydrates this device on first use (when no
 *    local value exists yet) and is updated fire-and-forget on every change.
 */
export function useExamLevel(): { examLevel: ExamLevel; setExamLevel: (level: ExamLevel) => void } {
  const { user } = useAuth();
  const [examLevel, setLevel] = useState<ExamLevel>(() => readStoredLevel() ?? 'Subprofessional');

  // First use on this device: adopt the account's saved preference.
  useEffect(() => {
    if (!user || readStoredLevel() !== null) return;
    let cancelled = false;
    void fetchPreferredExamLevel(user.uid)
      .then((remote) => {
        if (cancelled || !isExamLevel(remote)) return;
        setLevel(remote);
        try {
          localStorage.setItem(STORAGE_KEY, remote);
        } catch {
          // storage unavailable — preference lives for this session only
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setExamLevel = useCallback(
    (level: ExamLevel) => {
      setLevel(level);
      try {
        localStorage.setItem(STORAGE_KEY, level);
      } catch {
        // storage unavailable — preference lives for this session only
      }
      if (user) void savePreferredExamLevel(user.uid, level).catch(() => undefined);
    },
    [user]
  );

  return { examLevel, setExamLevel };
}
