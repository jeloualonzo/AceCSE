import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { supplyForLevel, type SubjectSupply } from '@/data/questionShape';
import type { ExamLevel, Subject } from '@/types';

/**
 * The two levels a session can be run and recorded under, in presentation
 * order. Distinct from `EXAM_LEVELS` in `questionShape.ts`, which is the
 * question-authoring vocabulary and also includes `'Both'`.
 */
export const SESSION_EXAM_LEVELS: readonly ExamLevel[] = ['Professional', 'Subprofessional'];

export interface PracticeLevelOption {
  /** The level the session is generated and recorded under. */
  level: ExamLevel;
  /** The subjects of the request that this level actually tests. */
  subjects: Subject[];
  /** Unique questions this level can draw for those subjects. */
  supply: number;
  /**
   * True when this is the ONLY option because every eligible level would draw
   * an identical pool. The level then labels the session rather than shaping
   * it, and offering a choice would be a distinction that does not exist.
   */
  levelIsLabelOnly: boolean;
}

function sameSubjects(left: readonly Subject[], right: readonly Subject[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((subject) => rightSet.has(subject));
}

/**
 * The Practice level choices a subject selection genuinely has.
 *
 * There is no app-wide "active level" to read, so each launch has to establish
 * its own level — and the only honest source for that is the configuration:
 * `SUBJECTS_BY_LEVEL` says which levels test a subject at all, and the
 * build-time supply says whether those levels would actually draw different
 * questions.
 *
 * Three outcomes fall out of that, none of them hard-coded per subject:
 *
 *  - Tested at one level only (Analytical Reasoning, Clerical Ability today):
 *    one option, and it is not a choice — it is a fact about the subject.
 *  - Tested at both levels, but every question is authored `examLevel: 'Both'`
 *    (all three shared subjects today): the two levels would draw the exact
 *    same pool, so one option is offered and `levelIsLabelOnly` says why. Two
 *    buttons here would be a fabricated distinction.
 *  - Tested at both levels WITH level-specific questions, or spanning subjects
 *    the levels do not share (a mixed all-subject request): two real options.
 *
 * Authoring level-specific content later flips a subject from one option to two
 * with no code change, which is the point of deriving it rather than listing it.
 */
export function practiceLevelOptions(
  subjects: readonly Subject[],
  supplies: Partial<Record<Subject, SubjectSupply>>
): PracticeLevelOption[] {
  const perLevel = SESSION_EXAM_LEVELS.map((level) => {
    // Ordered by the level's own blueprint, not by the request: the result is a
    // session config for that examination, and `SUBJECTS_BY_LEVEL` is the order
    // Practice presents its subjects in.
    const tested = SUBJECTS_BY_LEVEL[level].filter((subject) => subjects.includes(subject));
    return {
      level,
      subjects: tested,
      supply: tested.reduce((total, subject) => total + supplyForLevel(supplies[subject], level), 0),
    };
  }).filter((candidate) => candidate.subjects.length > 0);

  // Identical pools, proven from the supply split rather than from equal
  // totals: two different level-specific pools can happen to be the same size.
  const poolsIdentical =
    perLevel.length === 2 &&
    sameSubjects(perLevel[0].subjects, perLevel[1].subjects) &&
    subjects.every((subject) => {
      const supply = supplies[subject];
      return !supply || (supply.professional === 0 && supply.subprofessional === 0);
    });

  if (poolsIdentical) return [{ ...perLevel[0], levelIsLabelOnly: true }];
  return perLevel.map((candidate) => ({ ...candidate, levelIsLabelOnly: false }));
}
