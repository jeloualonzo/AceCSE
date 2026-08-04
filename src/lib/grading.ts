import type { Attempt, AttemptItem, ExamSession, Question, SubjectPerformance } from '@/types';
import { PASSING_PERCENTAGE } from '@/config/exam';

function roundPercent(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 1000) / 10;
}

/**
 * Grade a finished session into an immutable Attempt record.
 * Pure function: same inputs always produce the same result.
 */
export function gradeSession(
  session: ExamSession,
  questionIndex: ReadonlyMap<string, Question>,
  completedAt: number = Date.now()
): Attempt {
  const items: AttemptItem[] = [];
  const subjectTotals = new Map<string, { total: number; correct: number }>();
  let correctCount = 0;

  for (const questionId of session.questionIds) {
    const question = questionIndex.get(questionId);
    if (!question) continue; // bank changed underneath a stale session
    const selected = session.answers[questionId] ?? null;
    const isCorrect = selected === question.correctOptionId;
    if (isCorrect) correctCount += 1;

    const bucket = subjectTotals.get(question.subject) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    subjectTotals.set(question.subject, bucket);

    items.push({
      questionId,
      subject: question.subject,
      topic: question.topic,
      selected,
      correct: question.correctOptionId,
      isCorrect,
    });
  }

  const subjects: SubjectPerformance[] = [...subjectTotals.entries()].map(
    ([subject, { total, correct }]) => ({
      subject: subject as SubjectPerformance['subject'],
      total,
      correct,
      percentage: roundPercent(correct, total),
    })
  );

  const percentage = roundPercent(correctCount, items.length);

  return {
    id: session.id,
    mode: session.config.mode,
    examLevel: session.config.examLevel,
    questionCount: items.length,
    correctCount,
    percentage,
    passed: percentage >= PASSING_PERCENTAGE,
    durationSeconds: Math.max(0, Math.round((completedAt - session.startedAt) / 1000)),
    startedAt: session.startedAt,
    completedAt,
    subjects,
    items,
  };
}
