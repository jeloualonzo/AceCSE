import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { EXAM_ROUTE } from '@/navigation/appRoutes';
import type { ExamLevel, Question, Subject } from '@/types';

export interface ContentBankPracticeLaunch {
  kind: 'practice';
  examLevel: ExamLevel;
  questionCount: number;
  questionIds: string[];
  internalReview: true;
}

/**
 * Derive the review session's label from the selected questions rather than an
 * app-wide active level. A subject that exists at only one level pins the run;
 * genuinely shared subjects use their own question metadata as the tie-breaker.
 */
export function levelForContentBankQuestions(questions: readonly Question[]): ExamLevel {
  const subjects = new Set<Subject>(questions.map((question) => question.subject));
  if ([...subjects].some((subject) => !SUBJECTS_BY_LEVEL.Subprofessional.includes(subject))) {
    return 'Professional';
  }
  if ([...subjects].some((subject) => !SUBJECTS_BY_LEVEL.Professional.includes(subject))) {
    return 'Subprofessional';
  }
  return questions.some((question) => question.examLevel === 'Professional')
    ? 'Professional'
    : 'Subprofessional';
}

/**
 * Build a Content Bank review request only when the supplied question records
 * exactly cover the ordered id list. Any unresolved, duplicate, or reordered
 * item fails closed instead of launching a shortened or reshuffled session.
 */
export function buildContentBankPracticeLaunch(
  questionIds: readonly string[],
  questions: readonly Question[],
): ContentBankPracticeLaunch | undefined {
  if (questionIds.length === 0 || questionIds.length !== questions.length) return undefined;
  const ids = [...questionIds];
  if (new Set(ids).size !== ids.length) return undefined;
  if (questions.some((question, index) => question.id !== ids[index])) return undefined;
  return {
    kind: 'practice',
    examLevel: levelForContentBankQuestions(questions),
    questionCount: ids.length,
    questionIds: ids,
    internalReview: true,
  };
}

export function contentBankPracticePath(launch: ContentBankPracticeLaunch): string {
  const params = new URLSearchParams({ launch: JSON.stringify(launch) });
  return `${EXAM_ROUTE}?${params.toString()}`;
}

/**
 * Decode only the narrow launch payload written by contentBankPracticePath.
 * Invalid or incomplete query data is ignored so a hand-edited URL cannot
 * create a partial review run or enter the exam engine with unsafe metadata.
 */
export function readContentBankPracticeLaunch(search: string): ContentBankPracticeLaunch | undefined {
  const encoded = new URLSearchParams(search).get('launch');
  if (!encoded) return undefined;
  try {
    const value: unknown = JSON.parse(encoded);
    if (typeof value !== 'object' || value === null) return undefined;
    const launch = value as Record<string, unknown>;
    const ids = launch.questionIds;
    const questionCount = launch.questionCount;
    if (
      launch.kind !== 'practice' ||
      (launch.examLevel !== 'Professional' && launch.examLevel !== 'Subprofessional') ||
      launch.internalReview !== true ||
      typeof questionCount !== 'number' ||
      !Number.isInteger(questionCount) ||
      questionCount <= 0 ||
      !Array.isArray(ids) ||
      ids.length !== questionCount ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== 'string' || id.length === 0) ||
      new Set(ids).size !== ids.length
    ) return undefined;
    return {
      kind: 'practice',
      examLevel: launch.examLevel,
      questionCount,
      questionIds: [...ids],
      internalReview: true,
    } as ContentBankPracticeLaunch;
  } catch {
    return undefined;
  }
}

/**
 * Open the canonical learner Exam route in a separate tab. The opener is
 * cleared immediately after opening; the exam engine and page remain shared.
 */
export function openContentBankPracticeInNewTab(launch: ContentBankPracticeLaunch): boolean {
  if (typeof window === 'undefined') return false;
  const opened = window.open(contentBankPracticePath(launch), '_blank');
  if (!opened) return false;
  try {
    opened.opener = null;
  } catch {
    // Cross-origin WindowProxy implementations may make opener read-only.
  }
  return true;
}
