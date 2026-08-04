import type { Attempt, SubjectPerformance } from '@/types';

/**
 * Analytics derived purely from the user's real attempt history.
 * If there is no data, every field says so honestly — nothing is invented.
 */

export interface SubjectMastery {
  subject: SubjectPerformance['subject'];
  totalItems: number;
  correctItems: number;
  percentage: number;
}

export interface AttemptStats {
  totalAttempts: number;
  simulationCount: number;
  practiceCount: number;
  averagePercentage: number | null;
  bestPercentage: number | null;
  passRate: number | null;
  /** Average of the most recent simulations (up to 3); null until one exists. */
  readinessEstimate: number | null;
  subjectMastery: SubjectMastery[];
  weakestSubject: SubjectMastery | null;
  strongestSubject: SubjectMastery | null;
  totalQuestionsAnswered: number;
  totalTimeSeconds: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeStats(attempts: readonly Attempt[]): AttemptStats {
  const simulations = attempts.filter((a) => a.mode === 'simulation');

  const subjectTotals = new Map<string, { total: number; correct: number }>();
  let totalQuestionsAnswered = 0;
  let totalTimeSeconds = 0;

  for (const attempt of attempts) {
    totalQuestionsAnswered += attempt.questionCount;
    totalTimeSeconds += attempt.durationSeconds;
    for (const subject of attempt.subjects) {
      const bucket = subjectTotals.get(subject.subject) ?? { total: 0, correct: 0 };
      bucket.total += subject.total;
      bucket.correct += subject.correct;
      subjectTotals.set(subject.subject, bucket);
    }
  }

  const subjectMastery: SubjectMastery[] = [...subjectTotals.entries()]
    .map(([subject, { total, correct }]) => ({
      subject: subject as SubjectPerformance['subject'],
      totalItems: total,
      correctItems: correct,
      percentage: total > 0 ? round1((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const recentSimulations = [...simulations]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 3);

  return {
    totalAttempts: attempts.length,
    simulationCount: simulations.length,
    practiceCount: attempts.length - simulations.length,
    averagePercentage:
      attempts.length > 0
        ? round1(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : null,
    bestPercentage:
      attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : null,
    passRate:
      simulations.length > 0
        ? round1((simulations.filter((a) => a.passed).length / simulations.length) * 100)
        : null,
    readinessEstimate:
      recentSimulations.length > 0
        ? round1(
            recentSimulations.reduce((sum, a) => sum + a.percentage, 0) / recentSimulations.length
          )
        : null,
    subjectMastery,
    weakestSubject: subjectMastery.length > 0 ? subjectMastery[0] : null,
    strongestSubject:
      subjectMastery.length > 0 ? subjectMastery[subjectMastery.length - 1] : null,
    totalQuestionsAnswered,
    totalTimeSeconds,
  };
}
