import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ListChecks, Lock, PlayCircle, ShieldCheck, Target } from 'lucide-react';
import { PASSING_PERCENTAGE } from '@/config/exam';
import { simulationOptions } from '@/lib/examEngine';
import { formatDuration } from '@/lib/time';
import { useAppContext } from '@/components/shell/AppLayout';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Exam Simulation — the real thing. Timed, official proportions, no feedback
 * until the final results page. This screen sets that expectation before the
 * user ever starts.
 */
export const SimulationPage: React.FC = () => {
  useDocumentTitle('Exam Simulation');
  const navigate = useNavigate();
  const { examLevel } = useAppContext();
  const options = useMemo(() => {
    const all = simulationOptions(examLevel);
    // The full exam is the primary feature — surface it first.
    return [...all.filter((o) => o.isFullExam), ...all.filter((o) => !o.isFullExam)];
  }, [examLevel]);

  const launch = (questionCount: number) => {
    const request: ExamLaunchRequest = { kind: 'simulation', examLevel, questionCount };
    navigate('/app/exam', { state: { launch: request } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Exam Simulation</h1>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
          {examLevel} Level
        </span>
      </div>

      {/* What simulation means — set the contract once, clearly */}
      <div className="bg-slate-900 dark:bg-slate-800/80 dark:border dark:border-slate-700 text-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Real Examination Conditions</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs sm:text-sm">
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            Strict time limit, always running
          </li>
          <li className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            No feedback until the end
          </li>
          <li className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            Passing mark {PASSING_PERCENTAGE}%
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {options.map((option) => (
          <div
            key={option.scoredCount}
            className={`rounded-xl border p-5 flex flex-col ${
              option.available
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                : 'bg-slate-50 dark:bg-slate-800/60 border-dashed border-slate-300 dark:border-slate-700'
            }`}
          >
            {option.isFullExam && (
              <span className="self-start text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full mb-3">
                Full Exam
              </span>
            )}

            <dl className="space-y-3 mb-5">
              <div>
                <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Scored Questions</dt>
                <dd className="text-2xl font-extrabold text-slate-900 dark:text-white">{option.scoredCount}</dd>
                <dd className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  + {option.edqCount} EDQ items (not scored) — {option.presentedCount} presented
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">Duration</dt>
                <dd className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatDuration(option.durationSeconds)}
                </dd>
              </div>
            </dl>

            {option.available ? (
              <button
                onClick={() => launch(option.scoredCount)}
                className="mt-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <PlayCircle className="w-4 h-4" aria-hidden="true" />
                Start Simulation
              </button>
            ) : (
              <div className="mt-auto">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  Locked
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-snug">
                  Needs more validated {option.missingSubjects.join(', ')} questions.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
