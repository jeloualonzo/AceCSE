/**
 * Canonical domain types for AceCSE.
 *
 * Everything in the app — the question bank, the exam engine, grading,
 * persistence, and analytics — is expressed in these types.
 */

export type ExamLevel = 'Professional' | 'Subprofessional';

/** Which exam level(s) a question is eligible for. */
export type QuestionLevel = ExamLevel | 'Both';

export type Subject =
  | 'Numerical Reasoning'
  | 'Verbal Ability'
  | 'Analytical Reasoning'
  | 'Clerical Ability'
  | 'General Information';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface QuestionChoice {
  id: OptionId;
  text: string;
}

export interface Question {
  id: string;
  examLevel: QuestionLevel;
  subject: Subject;
  topic: string;
  difficulty: Difficulty;
  question: string;
  /** Optional stimulus text (reading passage, data table description, puzzle setup). */
  passage?: string;
  choices: QuestionChoice[];
  correctOptionId: OptionId;
  explanation: string;
  /** Citation for fact-based items, e.g. "1987 Constitution, Art. VII, Sec. 4". */
  reference?: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionMode = 'simulation' | 'practice';

export interface SessionConfig {
  mode: SessionMode;
  examLevel: ExamLevel;
  questionCount: number;
  /** Practice mode only: restrict to these subjects. */
  subjects?: Subject[];
  timed: boolean;
  /** Total allotted seconds when timed; null when untimed. */
  durationSeconds: number | null;
}

/**
 * A live exam/practice session. Persisted to localStorage while active so a
 * refresh or crash never destroys an in-progress exam.
 */
export interface ExamSession {
  id: string;
  config: SessionConfig;
  /** Ordered question ids drawn from the bank (no repeats, ever). */
  questionIds: string[];
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms wall-clock deadline; null when untimed. */
  deadlineAt: number | null;
  answers: Record<string, OptionId>;
}

// ---------------------------------------------------------------------------
// Attempts (completed sessions)
// ---------------------------------------------------------------------------

export interface AttemptItem {
  questionId: string;
  subject: Subject;
  topic: string;
  selected: OptionId | null;
  correct: OptionId;
  isCorrect: boolean;
}

export interface SubjectPerformance {
  subject: Subject;
  total: number;
  correct: number;
  /** 0–100, rounded to one decimal. */
  percentage: number;
}

export interface Attempt {
  id: string;
  mode: SessionMode;
  examLevel: ExamLevel;
  questionCount: number;
  correctCount: number;
  /** 0–100, rounded to one decimal. */
  percentage: number;
  passed: boolean;
  /** Actual seconds spent, not the allotment. */
  durationSeconds: number;
  startedAt: number;
  completedAt: number;
  subjects: SubjectPerformance[];
  items: AttemptItem[];
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
  preferredExamLevel: ExamLevel;
  createdAt: number;
  updatedAt: number;
}
