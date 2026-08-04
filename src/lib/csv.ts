import type { Attempt } from '@/types';
import { formatDateTime } from './time';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serialize the user's real attempt history to CSV. */
export function attemptsToCsv(attempts: readonly Attempt[]): string {
  const header = [
    'Completed At',
    'Mode',
    'Exam Level',
    'Questions',
    'Correct',
    'Score (%)',
    'Result',
    'Duration (min)',
  ];
  const rows = attempts.map((a) => [
    formatDateTime(a.completedAt),
    a.mode,
    a.examLevel,
    String(a.questionCount),
    String(a.correctCount),
    a.percentage.toFixed(1),
    a.mode === 'simulation' ? (a.passed ? 'Passed' : 'Did not pass') : '—',
    (a.durationSeconds / 60).toFixed(1),
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
