import React from 'react';
import { ArrowLeft, Clock, ListChecks, ShieldCheck, Target } from 'lucide-react';
import type { ExamLevel, Subject } from '@/types';
import { PASSING_PERCENTAGE } from '@/config/exam';
import { formatDuration } from '@/lib/time';

interface PreExamScreenProps {
  examLevel: ExamLevel;
  questionCount: number;
  durationSeconds: number;
  /** Honest subject composition of the generated session. */
  distribution: Partial<Record<Subject, number>>;
  isFullExam: boolean;
  onStartExam: () => void;
  onBack: () => void;
}

export const PreExamScreen: React.FC<PreExamScreenProps> = ({
  examLevel,
  questionCount,
  durationSeconds,
  distribution,
  isFullExam,
  onStartExam,
  onBack,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 min-h-[44px] px-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back</span>
      </button>

      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm overflow-hidden">
        <div className="bg-slate-900 dark:bg-slate-900 text-white px-6 sm:px-8 py-6">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Timed Simulation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold">
            Civil Service Examination — {examLevel} Level
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {isFullExam
              ? 'Full-length simulation matching the official CSC blueprint.'
              : 'Scaled simulation following the official CSC subject proportions.'}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
              <ListChecks className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Questions</dt>
                <dd className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{questionCount}</dd>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
              <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time Limit</dt>
                <dd className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  {formatDuration(durationSeconds)}
                </dd>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
              <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Passing Mark</dt>
                <dd className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{PASSING_PERCENTAGE}%</dd>
              </div>
            </div>
          </dl>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Subject Composition
            </h2>
            <ul className="space-y-2">
              {Object.entries(distribution).map(([subject, count]) => (
                <li
                  key={subject}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-sm"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{subject}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{count} items</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-400 leading-relaxed">
            The timer starts as soon as you begin and runs against the wall clock — exactly like
            the real examination. Your session is saved on this device, so an accidental refresh
            will not lose your progress.
          </div>

          <button
            onClick={onStartExam}
            className="w-full min-h-[52px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            Begin Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
