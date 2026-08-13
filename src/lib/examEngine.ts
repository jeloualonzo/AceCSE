import type {
  ExamLevel,
  ExamSession,
  Question,
  SessionConfig,
  SessionItem,
  Subject,
} from '@/types';
import {
  EXAM_FRAMEWORK,
  PRACTICE_SECONDS_PER_QUESTION,
  SIMULATION_ALLOCATION_POLICY,
  SIMULATION_TIERS,
  SUBJECTS_BY_LEVEL,
  simulationDurationSeconds,
  type SimulationAllocationPolicy,
  type SubjectAllocationRule,
} from '@/config/exam';
import { EDQ_ITEMS, EDQ_SECTION_ID } from '@/data/edq';
import { loadQuestions, subjectAvailability } from '@/data/questionBank';
import type { NormalizedContentCatalog } from '@/data/contentCatalog';
import { loadContentCatalog } from '@/data/questionBank';

/**
 * The exam engine. Guiding rule: never lie.
 *
 * - Questions are sampled WITHOUT replacement — no repeats within a session.
 * - Subjects are never relabeled; a question keeps its authored subject.
 * - A simulation size is only offered when the bank can honestly fill its
 *   blueprint-proportional subject distribution with unique questions.
 *
 * Availability questions (counts, unlocked tiers) are answered synchronously
 * from the build-time manifest; only building an actual session downloads
 * question content, and only for the subjects that session needs.
 */

export { subjectAvailability } from '@/data/questionBank';

export function questionsForLevel(level: ExamLevel, bank: readonly Question[]): Question[] {
  return bank.filter((q) => q.examLevel === 'Both' || q.examLevel === level);
}

// ---------------------------------------------------------------------------
// Allocation policy machinery (ExamFramework → SimulationPolicy → session).
//
// The per-subject counts a simulation uses are generated per session from
// SIMULATION_ALLOCATION_POLICY — they are AceCSE training-policy ranges, not
// official CSC figures, and must never be surfaced as such.
// ---------------------------------------------------------------------------

/**
 * Scales a full-exam policy down to a smaller scored total (the 20/50/100
 * tiers) by shrinking each rule's bounds proportionally. Bounds stay sane:
 * min ≥ 1 only when the scaled minimum rounds to ≥ 1, and max ≥ min ≥ 0.
 */
export function scalePolicy(
  policy: SimulationAllocationPolicy,
  scoredTotal: number
): SimulationAllocationPolicy {
  if (scoredTotal >= policy.totalScoredItems) return policy;
  const factor = scoredTotal / policy.totalScoredItems;
  return {
    ...policy,
    totalScoredItems: scoredTotal,
    rules: policy.rules.map((rule) => {
      const min = Math.max(0, Math.floor(rule.minItems * factor));
      const max = Math.max(min, 1, Math.ceil(rule.maxItems * factor));
      return { ...rule, minItems: min, maxItems: max };
    }),
  };
}

/**
 * Generates one valid randomized allocation: every subject starts at its
 * policy minimum, then the remaining items are dealt one at a time with
 * probability proportional to rule weight, never exceeding a rule's max or
 * the bank's actual supply. Deterministic for a given `random` stream.
 *
 * Returns null when no policy-conforming allocation fits the supply — the
 * caller decides whether that means a locked tier or an error.
 */
export function allocateScoredSubjects(
  policy: SimulationAllocationPolicy,
  supply: Readonly<Record<Subject, number>>,
  random: () => number
): Record<Subject, number> | null {
  const effective = policy.rules.map((rule) => ({
    ...rule,
    maxItems: Math.min(rule.maxItems, supply[rule.subject] ?? 0),
  }));
  const sumMin = effective.reduce((sum, r) => sum + r.minItems, 0);
  const sumMax = effective.reduce((sum, r) => sum + r.maxItems, 0);
  if (effective.some((r) => r.minItems > r.maxItems)) return null;
  if (sumMin > policy.totalScoredItems || sumMax < policy.totalScoredItems) return null;

  const counts = Object.fromEntries(effective.map((r) => [r.subject, r.minItems])) as Record<
    Subject,
    number
  >;
  let remaining = policy.totalScoredItems - sumMin;
  while (remaining > 0) {
    const open = effective.filter((r) => counts[r.subject] < r.maxItems);
    if (open.length === 0) return null; // unreachable given the sumMax gate
    const totalWeight = open.reduce((sum, r) => sum + Math.max(r.weight, 0.0001), 0);
    let pick = random() * totalWeight;
    let chosen: SubjectAllocationRule = open[open.length - 1];
    for (const rule of open) {
      pick -= Math.max(rule.weight, 0.0001);
      if (pick <= 0) {
        chosen = rule;
        break;
      }
    }
    counts[chosen.subject] += 1;
    remaining -= 1;
  }
  return counts;
}

/** Subject-block order for one simulation — seeded shuffle when the policy allows. */
export function orderedSubjects(
  policy: SimulationAllocationPolicy,
  random: () => number
): Subject[] {
  const subjects = policy.rules.map((rule) => rule.subject);
  return policy.randomizeSubjectOrder ? shuffled(subjects, random) : subjects;
}

export interface SimulationOption {
  /** Scored test-proper items in this tier. */
  scoredCount: number;
  /** Items the examinee will see: EDQ + scored. */
  presentedCount: number;
  edqCount: number;
  durationSeconds: number;
  isFullExam: boolean;
  available: boolean;
  /** Subjects lacking supply when unavailable. */
  missingSubjects: Subject[];
}

/**
 * All simulation sizes for a level, each honestly marked available or not.
 * A tier is available when SOME policy-conforming allocation fits the bank's
 * per-subject supply (feasibility, not one fixed distribution). Synchronous —
 * driven by the build-time manifest, no question content required.
 */
export function simulationOptions(level: ExamLevel): SimulationOption[] {
  const framework = EXAM_FRAMEWORK[level];
  const availability = subjectAvailability(level);
  const sizes: number[] = [...SIMULATION_TIERS, framework.scoredItems];
  return sizes.map((scoredCount) => {
    const policy = scalePolicy(SIMULATION_ALLOCATION_POLICY[level], scoredCount);
    const effective = policy.rules.map((rule) => ({
      ...rule,
      cap: Math.min(rule.maxItems, availability[rule.subject] ?? 0),
    }));
    const feasible =
      effective.every((r) => r.cap >= r.minItems) &&
      effective.reduce((sum, r) => sum + r.minItems, 0) <= scoredCount &&
      effective.reduce((sum, r) => sum + r.cap, 0) >= scoredCount;
    const missing = feasible
      ? []
      : effective.filter((r) => r.cap < r.maxItems).map((r) => r.subject);
    return {
      scoredCount,
      presentedCount: scoredCount + framework.edqItems,
      edqCount: framework.edqItems,
      durationSeconds: simulationDurationSeconds(level, scoredCount),
      isFullExam: scoredCount === framework.scoredItems,
      available: feasible,
      missingSubjects: missing,
    };
  });
}

/** Fisher–Yates shuffle (non-mutating). */
function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(items: readonly T[], count: number, random = Math.random): T[] {
  return shuffled(items, random).slice(0, count);
}

function newSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A fresh human-loggable seed. Generated ONCE per simulation and stored on
 * the session, so any session is reproducible after the fact (§ support/debug). */
function newSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class InsufficientBankError extends Error {
  constructor(public readonly missingSubjects: Subject[]) {
    super(`Not enough unique questions for: ${missingSubjects.join(', ')}`);
    this.name = 'InsufficientBankError';
  }
}

/**
 * Build a timed simulation session under the fixed EXAM_FRAMEWORK and the
 * variable SIMULATION_ALLOCATION_POLICY:
 *
 *   ExamFramework (fixed)  →  SimulationPolicy (variable)  →  GeneratedSimulation
 *
 * Structure per generated session:
 *  - Section 1 is always the 20-item EDQ (administrative, never scored,
 *    never in `questionIds`, responses local-only).
 *  - Scored subject BLOCKS follow in a seeded random order (blocks shuffle,
 *    questions never interleave across subjects).
 *  - Per-subject counts come from a seeded, policy-constrained allocation —
 *    AceCSE training ranges, not official CSC figures.
 *  - Group integrity: atomic groups are taken whole or not at all; when
 *    exact allocation is impossible because of atomic group sizes, the
 *    documented fallback is InsufficientBankError (never a silent split).
 *  - All randomness flows from ONE stored seed: same level + policy + seed
 *    + content ⇒ same order, allocation, groups, and question sequence.
 *
 * `scoredCount` is the scored test-proper size (a SIMULATION_TIER or the
 * framework's full 150/145).
 */
export async function buildSimulationSession(
  level: ExamLevel,
  scoredCount: number,
  options: { seed?: string; catalog?: NormalizedContentCatalog } = {}
): Promise<ExamSession> {
  const catalog = options.catalog ?? (await loadContentCatalog(SUBJECTS_BY_LEVEL[level]));
  const seed = options.seed ?? newSeed();
  const random = seededRandom(`${level}:${scoredCount}:${seed}`);
  const policy = scalePolicy(SIMULATION_ALLOCATION_POLICY[level], scoredCount);

  // Supply per subject as the catalog actually sees it (level-eligible,
  // non-deprecated questions reachable through groups).
  const supply = Object.fromEntries(
    policy.rules.map((rule) => {
      const groups = eligibleGroups(catalog, rule.subject, level);
      return [rule.subject, groups.reduce((sum, g) => sum + g.questions.length, 0)];
    })
  ) as Record<Subject, number>;

  const allocation = allocateScoredSubjects(policy, supply, random);
  if (!allocation) {
    const short = policy.rules
      .filter((rule) => (supply[rule.subject] ?? 0) < rule.minItems)
      .map((rule) => rule.subject);
    throw new InsufficientBankError(short.length > 0 ? short : policy.rules.map((r) => r.subject));
  }

  const subjectOrder = orderedSubjects(policy, random);
  const items: SessionItem[] = EDQ_ITEMS.map((edq) => ({
    kind: 'administrative' as const,
    id: edq.id,
    sectionId: EDQ_SECTION_ID,
  }));
  const questionIds: string[] = [];
  const used = new Set<string>();
  const missing: Subject[] = [];

  for (const subject of subjectOrder) {
    const groups = eligibleGroups(catalog, subject, level);
    const candidates = shuffled(groups, random);
    const target = allocation[subject];
    let selected = 0;
    for (const group of candidates) {
      if (selected >= target) break;
      const availableQuestions = group.questions.filter((question) => !used.has(question.id));
      if (availableQuestions.length === 0) continue;
      const remaining = target - selected;
      if (group.selectionPolicy === 'atomic' && availableQuestions.length > remaining) continue;
      const chosen =
        group.orderPolicy === 'fixed' ? availableQuestions : shuffled(availableQuestions, random);
      const questionSelection =
        group.selectionPolicy === 'atomic' ? chosen : chosen.slice(0, remaining);
      if (questionSelection.length === 0) continue;
      items.push({
        kind: 'group',
        groupId: group.id,
        sectionId: subject,
        questionIds: questionSelection.map((question) => question.id),
      });
      for (const question of questionSelection) {
        used.add(question.id);
        questionIds.push(question.id);
      }
      selected += questionSelection.length;
    }
    if (selected < target) missing.push(subject);
  }

  if (missing.length > 0) throw new InsufficientBankError(missing);

  const durationSeconds = simulationDurationSeconds(level, questionIds.length);
  const config: SessionConfig = {
    mode: 'simulation',
    examLevel: level,
    questionCount: questionIds.length,
    timed: true,
    durationSeconds,
  };
  const startedAt = Date.now();
  return {
    id: newSessionId(),
    config,
    questionIds,
    items,
    blueprintId: `${level.toLowerCase()}-framework`,
    blueprintVersion: 2,
    seed,
    startedAt,
    deadlineAt: startedAt + durationSeconds * 1000,
    answers: {},
    edqResponseMode: false,
  };
}

/** Level-eligible, non-deprecated groups for one subject. */
function eligibleGroups(
  catalog: NormalizedContentCatalog,
  subject: Subject,
  level: ExamLevel
) {
  return catalog
    .getGroupsForSubject(subject, level)
    .filter((group) => group.status !== 'deprecated')
    .filter((group) =>
      group.questions.every(
        (question) => question.examLevel === 'Both' || question.examLevel === level
      )
    );
}

/**
 * Build a practice session over the chosen subjects. Questions are drawn
 * evenly across subjects (never repeated) and shuffled together.
 */
export async function buildPracticeSession(
  level: ExamLevel,
  subjects: Subject[],
  questionCount: number,
  timed: boolean
): Promise<ExamSession> {
  const pool = questionsForLevel(level, await loadQuestions(subjects)).filter((q) =>
    subjects.includes(q.subject)
  );
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


/**
 * Build a practice session for ONE explicit item set (group practice).
 * Additive capability: shared context appears once (via the group's
 * directions/stimulus in the QuestionCard context), authored order is
 * preserved, and immediate per-question feedback still applies. Standalone
 * subject practice is untouched.
 */
export async function buildGroupPracticeSession(
  level: ExamLevel,
  groupId: string
): Promise<ExamSession> {
  const catalog = await loadContentCatalog(SUBJECTS_BY_LEVEL[level]);
  const group = catalog.getGroup(groupId);
  if (!group || group.isImplicitSingleton) {
    throw new InsufficientBankError(SUBJECTS_BY_LEVEL[level]);
  }
  const questionIds = [...group.questionIds];
  const startedAt = Date.now();
  return {
    id: newSessionId(),
    config: {
      mode: 'practice',
      examLevel: level,
      questionCount: questionIds.length,
      subjects: [group.subject],
      timed: false,
      durationSeconds: null,
    },
    questionIds,
    items: [{ kind: 'group', groupId: group.id, sectionId: group.subject, questionIds }],
    startedAt,
    deadlineAt: null,
    answers: {},
  };
}

/** The subjects a session's question ids can reference (for lazy index loads). */
export function subjectsOfSession(session: ExamSession): Subject[] {
  return session.config.mode === 'practice' && session.config.subjects?.length
    ? session.config.subjects
    : SUBJECTS_BY_LEVEL[session.config.examLevel];
}
