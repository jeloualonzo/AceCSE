import type { ExamLevel, ExamSession, Question, SessionConfig, Subject } from '@/types';
import {
  EXAM_BLUEPRINT,
  PRACTICE_SECONDS_PER_QUESTION,
  SIMULATION_TIERS,
  SUBJECTS_BY_LEVEL,
  simulationDurationSeconds,
} from '@/config/exam';
import { QUESTION_BANK } from '@/data/questionBank';

/**
 * The exam engine. Guiding rule: never lie.
 *
 * - Questions are sampled WITHOUT replacement — no repeats within a session.
 * - Subjects are never relabeled; a question keeps its authored subject.
 * - A simulation size is only offered when the bank can honestly fill its
 *   blueprint-proportional subject distribution with unique questions.
 */

export function questionsForLevel(level: ExamLevel, bank: readonly Question[] = QUESTION_BANK): Question[] {
  return bank.filter((q) => q.examLevel === 'Both' || q.examLevel === level);
}

/** Unique-question supply per subject for a level. */
export function subjectAvailability(
  level: ExamLevel,
  bank: readonly Question[] = QUESTION_BANK
): Record<Subject, number> {
  const counts = Object.fromEntries(SUBJECTS_BY_LEVEL[level].map((s) => [s, 0])) as Record<
    Subject,
    number
  >;
  for (const q of questionsForLevel(level, bank)) {
    if (q.subject in counts) counts[q.subject] += 1;
  }
  return counts;
}

/**
 * Blueprint-proportional subject distribution for a scaled simulation,
 * using the largest-remainder method so counts always sum to `total`.
 */
export function scaledDistribution(level: ExamLevel, total: number): Record<Subject, number> {
  const blueprint = EXAM_BLUEPRINT[level];
  const subjects = SUBJECTS_BY_LEVEL[level];
  const exact = subjects.map((s) => ({
    subject: s,
    exact: ((blueprint.distribution[s] ?? 0) * total) / blueprint.totalItems,
  }));
  const result = Object.fromEntries(
    exact.map(({ subject, exact: e }) => [subject, Math.floor(e)])
  ) as Record<Subject, number>;
  let assigned = subjects.reduce((sum, s) => sum + result[s], 0);
  const byRemainder = [...exact].sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (const { subject } of byRemainder) {
    if (assigned >= total) break;
    result[subject] += 1;
    assigned += 1;
  }
  return result;
}

export interface SimulationOption {
  questionCount: number;
  durationSeconds: number;
  isFullExam: boolean;
  available: boolean;
  /** Subjects lacking supply when unavailable. */
  missingSubjects: Subject[];
}

/**
 * All simulation sizes for a level, each honestly marked available or not
 * based on current per-subject bank supply.
 */
export function simulationOptions(
  level: ExamLevel,
  bank: readonly Question[] = QUESTION_BANK
): SimulationOption[] {
  const availability = subjectAvailability(level, bank);
  const sizes: number[] = [...SIMULATION_TIERS, EXAM_BLUEPRINT[level].totalItems];
  return sizes.map((size) => {
    const needed = scaledDistribution(level, size);
    const missing = SUBJECTS_BY_LEVEL[level].filter((s) => availability[s] < needed[s]);
    return {
      questionCount: size,
      durationSeconds: simulationDurationSeconds(level, size),
      isFullExam: size === EXAM_BLUEPRINT[level].totalItems,
      available: missing.length === 0,
      missingSubjects: missing,
    };
  });
}

/** Fisher–Yates shuffle (non-mutating). */
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample<T>(items: readonly T[], count: number): T[] {
  return shuffled(items).slice(0, count);
}

function newSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class InsufficientBankError extends Error {
  constructor(public readonly missingSubjects: Subject[]) {
    super(`Not enough unique questions for: ${missingSubjects.join(', ')}`);
    this.name = 'InsufficientBankError';
  }
}

/**
 * Build a timed simulation session. Questions are grouped by official section
 * order (as in the real CSC exam) and randomized within each section.
 * Throws InsufficientBankError rather than repeating or relabeling questions.
 */
export function buildSimulationSession(level: ExamLevel, questionCount: number): ExamSession {
  const pool = questionsForLevel(level);
  const needed = scaledDistribution(level, questionCount);
  const bySubject = new Map<Subject, Question[]>(
    SUBJECTS_BY_LEVEL[level].map((s) => [s, pool.filter((q) => q.subject === s)])
  );

  const missing = SUBJECTS_BY_LEVEL[level].filter(
    (s) => (bySubject.get(s)?.length ?? 0) < needed[s]
  );
  if (missing.length > 0) throw new InsufficientBankError(missing);

  const questionIds: string[] = [];
  for (const subject of SUBJECTS_BY_LEVEL[level]) {
    questionIds.push(...sample(bySubject.get(subject) ?? [], needed[subject]).map((q) => q.id));
  }

  const durationSeconds = simulationDurationSeconds(level, questionCount);
  const config: SessionConfig = {
    mode: 'simulation',
    examLevel: level,
    questionCount,
    timed: true,
    durationSeconds,
  };
  const startedAt = Date.now();
  return {
    id: newSessionId(),
    config,
    questionIds,
    startedAt,
    deadlineAt: startedAt + durationSeconds * 1000,
    answers: {},
  };
}

/**
 * Build a practice session over the chosen subjects. Questions are drawn
 * evenly across subjects (never repeated) and shuffled together.
 */
export function buildPracticeSession(
  level: ExamLevel,
  subjects: Subject[],
  questionCount: number,
  timed: boolean
): ExamSession {
  const pool = questionsForLevel(level).filter((q) => subjects.includes(q.subject));
  if (pool.length === 0) throw new InsufficientBankError(subjects);

  const perSubject = Math.ceil(questionCount / subjects.length);
  const picked: Question[] = [];
  for (const subject of subjects) {
    picked.push(...sample(pool.filter((q) => q.subject === subject), perSubject));
  }
  // Top up from any remaining pool questions if some subjects ran short.
  if (picked.length < questionCount) {
    const pickedIds = new Set(picked.map((q) => q.id));
    picked.push(...sample(pool.filter((q) => !pickedIds.has(q.id)), questionCount - picked.length));
  }
  const questionIds = shuffled(picked).slice(0, questionCount).map((q) => q.id);

  const durationSeconds = timed ? questionIds.length * PRACTICE_SECONDS_PER_QUESTION : null;
  const startedAt = Date.now();
  return {
    id: newSessionId(),
    config: {
      mode: 'practice',
      examLevel: level,
      questionCount: questionIds.length,
      subjects,
      timed,
      durationSeconds,
    },
    questionIds,
    startedAt,
    deadlineAt: durationSeconds ? startedAt + durationSeconds * 1000 : null,
    answers: {},
  };
}
