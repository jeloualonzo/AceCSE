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

/**
 * Canonical option ids. NEW authored test-proper content uses five choices
 * (A–E), matching CSE-style materials; the legacy production bank keeps its
 * original four (A–D). Both are first-class — never invent a fake fifth
 * option for legacy content.
 */
export type OptionId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface QuestionChoice {
  id: OptionId;
  text: string;
}

/**
 * A short labeled learning aid shown after the explanation.
 * Labels read like a coach: "Exam Tip", "Common Mistake", "Remember",
 * "Grammar Rule", "Math Shortcut", "Mnemonic", "Law Reminder", …
 */
export interface QuestionTip {
  label: string;
  text: string;
}

export type ContentBlock =
  | {
      kind: 'text';
      id: string;
      title?: string;
      body: string;
    }
  | {
      kind: 'table';
      id: string;
      title?: string;
      columns: string[];
      rows: string[][];
    }
  | {
      kind: 'image';
      id: string;
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      kind: 'dataset';
      id: string;
      title?: string;
      data: Record<string, string | number>[];
    };

export type GroupSelectionPolicy = 'atomic' | 'splittable';
export type GroupOrderPolicy = 'fixed' | 'shuffle-questions';
export type ContentStatus = 'published' | 'deprecated';

export interface NumberSeriesStructure {
  /** Terms in authored order; null marks the missing term. */
  sequence: Array<number | string | null>;
  /** One-based position of the missing term. */
  missingPosition: number;
}

export interface TaskInstance {
  /** Compact task-specific payload, such as names to file or words to inspect. */
  kind: string;
  payload: Record<string, unknown>;
}

export interface Question {
  id: string;
  examLevel: QuestionLevel;
  subject: Subject;
  topic: string;
  /** Canonical semantic classification, such as analogy or reading comprehension. */
  questionType?: string;
  /** Canonical reusable presentation/solving format. */
  questionFormat?: string;
  /** Task-level presentation format, distinct from semantic pool membership. */
  taskFormat?: string;
  /** Finer-grained classification within the topic, e.g. "Simple Interest". */
  subtopic?: string;
  difficulty: Difficulty;
  question: string;
  /** Optional stimulus text (reading passage, data table description, puzzle setup). */
  passage?: string;
  choices: QuestionChoice[];
  correctOptionId: OptionId;
  /**
   * Why the correct answer is correct — written to teach, assuming the reader
   * has never learned the topic. Never a bare restatement of the answer.
   */
  explanation: string;
  /** Worked solution, one step per entry, for computational/logic items. */
  steps?: string[];
  /**
   * Why each incorrect option is wrong — the misconception it represents,
   * not just "incorrect". Keyed by option id; the correct option is omitted.
   */
  distractorExplanations?: Partial<Record<OptionId, string>>;
  /** Short retention aid ("Exam Tip", "Common Mistake", "Mnemonic", …). */
  tip?: QuestionTip;
  /** Citation for fact-based items, e.g. "1987 Constitution, Art. VII, Sec. 4". */
  reference?: string;
  /** Where the item was researched/derived from, when distinct from reference. */
  source?: string;
  tags: string[];
  /** Optional structured representation for Number Series items. */
  numberSeries?: NumberSeriesStructure;
  /** Optional compact payload for a shared task/presentation block. */
  taskInstance?: TaskInstance;
  /** Optional membership in a normalized question group. */
  groupId?: string;
  /** One-based authored order inside its group. */
  groupPosition?: number;
  contentVersion?: number;
  status?: ContentStatus;
}

export interface QuestionGroup {
  id: string;
  examLevel: QuestionLevel;
  subject: Subject;
  topic: string;
  questionType?: string;
  title?: string;
  directions?: string;
  example?: string;
  contentBlocks?: ContentBlock[];
  questionIds: string[];
  selectionPolicy: GroupSelectionPolicy;
  orderPolicy: GroupOrderPolicy;
  tags: string[];
  status?: ContentStatus;
  contentVersion?: number;
}

export interface NormalizedQuestionGroup extends QuestionGroup {
  /** Questions are references resolved from the question catalog, never copies. */
  questions: Question[];
  /** True for legacy questions represented as deterministic singleton groups. */
  isImplicitSingleton: boolean;
}

export type SessionItem =
  | { kind: 'question'; questionId: string; sectionId?: string; groupId?: string }
  | { kind: 'group'; groupId: string; sectionId?: string; questionIds: string[] }
  | {
      kind: 'pool';
      poolId: string;
      questionType: string;
      taskFormat: string;
      sectionId?: string;
      questionIds: string[];
    }
  | { kind: 'administrative'; id: string; sectionId: string; contentBlockIds?: string[] };

export interface ExamSection {
  id: string;
  title: string;
  subject?: Subject;
  kind: 'administrative' | 'scored';
  order: number;
  directions?: string;
  groupIds: string[];
  questionCount?: number;
  timeLimitSeconds?: number;
}

export interface ExamBlueprint {
  id: string;
  examLevel: ExamLevel;
  version: number;
  title: string;
  sections: ExamSection[];
  totalScoredQuestions: number;
  totalPresentedQuestions: number;
  durationSeconds: number;
  includeAdministrativeSection: boolean;
  source: 'official' | 'observed' | 'internal';
  verificationStatus: 'verified' | 'provisional' | 'unverified';
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionMode = 'simulation' | 'practice';

/** Exactly one primary focus entity may be active for passive timing. */
export type ActiveFocus =
  | { type: 'task'; taskId: string }
  | { type: 'question'; questionId: string }
  | null;

/** Internal, local-only cursor for progressive Practice sessions. */
export interface PracticeProgress {
  batchSize: number;
  nextIndex: number;
  candidateQuestionIds: string[];
}

export interface SessionConfig {
  mode: SessionMode;
  examLevel: ExamLevel;
  questionCount: number;
  /** Practice mode only: restrict to these subjects. */
  subjects?: Subject[];
  /** Optional semantic task-format practice marker. */
  taskFormat?: string;
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
  /** Optional structured ordering; legacy sessions use questionIds only. */
  items?: SessionItem[];
  blueprintId?: string;
  blueprintVersion?: number;
  seed?: string;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms wall-clock deadline; null when untimed. */
  deadlineAt: number | null;
  answers: Record<string, OptionId>;
  /**
   * OPTIONAL, LOCAL-ONLY responses to the administrative EDQ items.
   * PRIVACY CONTRACT: this never leaves the device — sessions persist to
   * localStorage only, and grading builds the Firestore Attempt exclusively
   * from scored `questionIds`/`answers`. Never copy this into an Attempt or
   * any Firestore write.
   */
  edqAnswers?: Record<string, string>;
  /** Whether the user enabled optional EDQ response mode for this session. */
  edqResponseMode?: boolean;
  /** Internal Practice-only progressive cursor; never copied to Attempts. */
  practiceProgress?: PracticeProgress;
  /** Buffered active Practice/Simulation stopwatch total, in milliseconds. */
  sessionElapsedMs?: number;
  /** Buffered cumulative primary-view time by encountered question id, in milliseconds. */
  questionTimeSpentMs?: Record<string, number>;
  /** Buffered cumulative shared-task/directions time by stable task id, in milliseconds. */
  taskTimeSpentMs?: Record<string, number>;
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
  /** Optional cumulative primary-view time for post-session behavioral review. */
  timeSpentMs?: number;
}

export interface SubjectPerformance {
  subject: Subject;
  /** Total scored items in the subject, including unanswered Practice items. */
  total: number;
  correct: number;
  /** Answered scored items; optional for backward-compatible stored attempts. */
  answered?: number;
  /** Unanswered scored items; optional for backward-compatible stored attempts. */
  unanswered?: number;
  /** 0–100, rounded to one decimal; Practice uses answered as denominator. */
  percentage: number;
}

export interface Attempt {
  id: string;
  mode: SessionMode;
  examLevel: ExamLevel;
  /** Total scored items, including unanswered Practice items. */
  questionCount: number;
  correctCount: number;
  /** Answered scored items; optional for backward-compatible stored attempts. */
  answeredCount?: number;
  /** Unanswered scored items; optional for backward-compatible stored attempts. */
  unansweredCount?: number;
  /** 0–100, rounded to one decimal; Practice uses answered as denominator. */
  percentage: number;
  passed: boolean;
  /** Actual seconds spent, not the allotment. */
  durationSeconds: number;
  startedAt: number;
  completedAt: number;
  subjects: SubjectPerformance[];
  items: AttemptItem[];
  /** Optional cumulative shared-task/directions time by stable task id, in milliseconds. */
  taskTimeSpentMs?: Record<string, number>;
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
