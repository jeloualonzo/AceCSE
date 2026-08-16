import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Download, History, XCircle } from 'lucide-react';
import { useAttempts } from '@/hooks/useAttempts';
import { attemptsToCsv, downloadCsv } from '@/lib/csv';
import { formatDateTime, formatDuration } from '@/lib/time';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export const HistoryPage: React.FC = () => {
  useDocumentTitle('History');
  const { attempts, loading, error } = useAttempts();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExport = () => {
    downloadCsv(`acecse-history-${new Date().toISOString().slice(0, 10)}.csv`, attemptsToCsv(attempts));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">History</h1>
        <button
          onClick={handleExport}
          disabled={attempts.length === 0}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-400 dark:text-slate-500" role="status">
          Loading your history…
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-500/30 p-6 text-center text-sm text-rose-800 dark:text-rose-300" role="alert">
          {error}
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-12 text-center">
          <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">No exam history yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Finish a simulation or practice session and it will appear here with its full subject
            breakdown.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {attempts.map((attempt) => {
              const isExpanded = expandedId === attempt.id;
              const answeredCount = attempt.answeredCount ?? attempt.items.filter((item) => item.selected !== null).length;
              const unansweredCount = attempt.unansweredCount ?? attempt.items.filter((item) => item.selected === null).length;
              return (
                <li key={attempt.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                    aria-expanded={isExpanded}
                    className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {attempt.mode === 'simulation' ? 'Exam Simulation' : 'Practice'}
                      </p>
                      <div className="flex items-center gap-x-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                        <span>{attempt.examLevel}</span>
                        <span>{formatDateTime(attempt.completedAt)}</span>
                        <span>
                          {attempt.mode === 'practice'
                            ? `${answeredCount} answered · ${unansweredCount} skipped`
                            : `${attempt.questionCount} questions`}
                        </span>
                        <span>{formatDuration(attempt.durationSeconds)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                        {attempt.percentage.toFixed(1)}%
                      </span>
                      {attempt.mode === 'simulation' &&
                        (attempt.passed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Did not pass
                          </span>
                        ))}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 bg-slate-50/60 dark:bg-slate-800/60">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-3 pb-2">
                        Subject Breakdown
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attempt.subjects.map((subject) => (
                          <div
                            key={subject.subject}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{subject.subject}</span>
                              <span className="font-mono font-bold text-slate-600 dark:text-slate-300 text-right">
                                {attempt.mode === 'practice'
                                  ? `${subject.correct}/${subject.answered ?? subject.total}`
                                  : `${subject.correct}/${subject.total}`} ({subject.percentage.toFixed(0)}%)
                                {attempt.mode === 'practice' && (subject.unanswered ?? 0) > 0 && (
                                  <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                    {subject.unanswered} unanswered
                                  </span>
                                )}
                              </span>
                            </div>
                            <div
                              className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden"
                              role="progressbar"
                              aria-valuenow={subject.percentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${subject.subject}: ${subject.percentage.toFixed(0)}%`}
                            >
                              <div
                                className={`h-full ${
                                  subject.percentage >= 80
                                    ? 'bg-emerald-500'
                                    : subject.percentage >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                }`}
                                style={{ width: `${subject.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
