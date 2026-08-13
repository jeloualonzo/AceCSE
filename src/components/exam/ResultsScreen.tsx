import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LayoutDashboard,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { Attempt, Question } from '@/types';
import { ExplanationPanel } from './ExplanationPanel';
import { PASSING_PERCENTAGE } from '@/config/exam';
import { formatDuration } from '@/lib/time';
import { useTheme } from '@/context/ThemeContext';

interface ResultsScreenProps {
  /** Administrative EDQ items presented in the session (never scored). */
  edqPresented?: number;
  attempt: Attempt;
  questionIndex: ReadonlyMap<string, Question>;
  onRetake: () => void;
  onReturnToDashboard: () => void;
}

type ReviewFilter = 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNANSWERED';

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'CORRECT', label: 'Correct' },
  { id: 'INCORRECT', label: 'Incorrect' },
  { id: 'UNANSWERED', label: 'Unanswered' },
];

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  edqPresented = 0,
  attempt,
  questionIndex,
  onRetake,
  onReturnToDashboard,
}) => {
  const { resolvedTheme } = useTheme();
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isSimulation = attempt.mode === 'simulation';

  const counts = useMemo(() => {
    const incorrect = attempt.items.filter((i) => !i.isCorrect && i.selected !== null).length;
    const unanswered = attempt.items.filter((i) => i.selected === null).length;
    return { incorrect, unanswered };
  }, [attempt.items]);

  const filteredItems = useMemo(
    () =>
      attempt.items
        .map((item, index) => ({ item, number: index + 1 }))
        .filter(({ item }) => {
          if (filter === 'CORRECT') return item.isCorrect;
          if (filter === 'INCORRECT') return !item.isCorrect && item.selected !== null;
          if (filter === 'UNANSWERED') return item.selected === null;
          return true;
        }),
    [attempt.items, filter]
  );

  const filterCount = (id: ReviewFilter): number => {
    switch (id) {
      case 'ALL':
        return attempt.questionCount;
      case 'CORRECT':
        return attempt.correctCount;
      case 'INCORRECT':
        return counts.incorrect;
      case 'UNANSWERED':
        return counts.unanswered;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isSimulation ? 'Simulation Results' : 'Practice Results'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Civil Service Examination — {attempt.examLevel} Level
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRetake}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Retake</span>
            </button>
            <button
              onClick={onReturnToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Score banner */}
        <div
          className={`rounded-2xl p-6 sm:p-8 border shadow-xl ${
            attempt.passed
              ? 'bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-900 border-emerald-300 dark:border-emerald-500/40'
              : 'bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/80 dark:via-slate-900 dark:to-slate-900 border-rose-300 dark:border-rose-500/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 border ${
                  attempt.passed
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
                }`}
              >
                <Award className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
              </div>
              <div>
                {isSimulation && (
                  <div className="mb-2">
                    {attempt.passed ? (
                      <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Passed
                      </span>
                    ) : (
                      <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Did not pass
                      </span>
                    )}
                  </div>
                )}
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {attempt.correctCount}{' '}
                  <span className="text-slate-500 dark:text-slate-400 font-normal text-lg sm:text-xl">
                    / {attempt.questionCount} correct
                  </span>
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                  {isSimulation && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                      Passing mark {PASSING_PERCENTAGE}%
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    {formatDuration(attempt.durationSeconds)} {isSimulation ? 'used' : 'spent'}
                  </span>
                </div>
                {edqPresented > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {edqPresented} EDQ items were presented but were not scored.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end justify-center">
              <div
                className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  attempt.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {attempt.percentage.toFixed(1)}%
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                Overall Rating
              </span>
            </div>
          </div>
        </div>

        {/* Subject breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Subject Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attempt.subjects.map((subject) => (
              <div
                key={subject.subject}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{subject.subject}</span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                    {subject.correct} / {subject.total}{' '}
                    <span className="text-slate-400 dark:text-slate-500">({subject.percentage.toFixed(0)}%)</span>
                  </span>
                </div>
                <div
                  className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-800"
                  role="progressbar"
                  aria-valuenow={subject.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${subject.subject}: ${subject.percentage.toFixed(0)}%`}
                >
                  <div
                    className={`h-full ${
                      subject.percentage >= PASSING_PERCENTAGE
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

        {/* Item review */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Item Review</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every question with its correct answer and rationale.
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
              role="tablist"
              aria-label="Review filters"
            >
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={filter === id}
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    filter === id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {label} ({filterCount(id)})
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              No questions match this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map(({ item, number }) => {
                const question = questionIndex.get(item.questionId);
                if (!question) return null;
                const isUnanswered = item.selected === null;
                const isExpanded = expanded[item.questionId] ?? !item.isCorrect;

                return (
                  <div
                    key={item.questionId}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-sm ${
                      item.isCorrect
                        ? 'border-emerald-300 dark:border-emerald-500/30'
                        : isUnanswered
                          ? 'border-amber-300 dark:border-amber-500/30'
                          : 'border-rose-300 dark:border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                          Q{number}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                          {item.subject}
                        </span>
                        {item.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Correct
                          </span>
                        ) : isUnanswered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 px-2.5 py-0.5 rounded-full">
                            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" /> Unanswered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Incorrect
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [item.questionId]: !isExpanded }))
                        }
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 min-h-[40px] min-w-[40px] rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse question details' : 'Expand question details'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>

                    <div className="text-sm sm:text-base font-medium text-black dark:text-slate-100 mb-4 whitespace-pre-line leading-relaxed">
                      {question.question}
                    </div>

                    {isExpanded && (
                      <>
                        {question.passage && (
                          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm text-black dark:text-slate-300 whitespace-pre-line">
                            {question.passage}
                          </div>
                        )}
                        <div className="space-y-2 mb-4">
                          {question.choices.map((option) => {
                            const isUserPick = item.selected === option.id;
                            const isCorrectOption = question.correctOptionId === option.id;
                            let optionStyle = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-black dark:text-slate-300';
                            if (isCorrectOption) {
                              optionStyle =
                                'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/80 text-emerald-800 dark:text-emerald-100 font-semibold';
                            } else if (isUserPick) {
                              optionStyle =
                                'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/80 text-rose-800 dark:text-rose-100 font-semibold';
                            }
                            return (
                              <div
                                key={option.id}
                                className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${optionStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded text-xs font-bold font-mono flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                                    {option.id}
                                  </span>
                                  <span>{option.text}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold">
                                  {isCorrectOption && (
                                    <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                                      Correct answer
                                    </span>
                                  )}
                                  {isUserPick && (
                                    <span
                                      className={`px-2 py-0.5 rounded border ${
                                        isCorrectOption
                                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-500/30'
                                          : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/50 border-rose-300 dark:border-rose-500/30'
                                      }`}
                                    >
                                      Your choice
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 sm:p-5 rounded-r-lg border-l-4 border-l-emerald-500 border-y border-r border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900">
                          <ExplanationPanel question={question} selectedOptionId={item.selected} theme={resolvedTheme} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
