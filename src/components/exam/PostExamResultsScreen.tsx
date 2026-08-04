import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, HelpCircle, Flag, RotateCcw, LayoutDashboard, Filter, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { QuestionData } from './QuestionCard';

export interface EvaluatedQuestion {
  question: QuestionData;
  userAnswer: string | null;
  isCorrect: boolean;
  isUnanswered: boolean;
  isFlagged: boolean;
}

export interface SubjectPerformance {
  subject: string;
  total: number;
  correct: number;
  percentage: number;
}

export interface PostExamResultsScreenProps {
  examTitle: string;
  totalQuestions: number;
  score: number;
  percentage: number;
  isPassed: boolean;
  subjectBreakdown: SubjectPerformance[];
  evaluatedQuestions: EvaluatedQuestion[];
  onRetake: () => void;
  onReturnToDashboard: () => void;
}

type ReviewFilter = 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNANSWERED' | 'FLAGGED';

export const PostExamResultsScreen: React.FC<PostExamResultsScreenProps> = ({
  examTitle,
  totalQuestions,
  score,
  percentage,
  isPassed,
  subjectBreakdown,
  evaluatedQuestions,
  onRetake,
  onReturnToDashboard,
}) => {
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const toggleExpand = (num: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const filteredQuestions = evaluatedQuestions.filter((item) => {
    if (filter === 'CORRECT') return item.isCorrect;
    if (filter === 'INCORRECT') return !item.isCorrect && !item.isUnanswered;
    if (filter === 'UNANSWERED') return item.isUnanswered;
    if (filter === 'FLAGGED') return item.isFlagged;
    return true; // 'ALL'
  });

  const correctCount = score;
  const incorrectCount = evaluatedQuestions.filter((q) => !q.isCorrect && !q.isUnanswered).length;
  const unansweredCount = evaluatedQuestions.filter((q) => q.isUnanswered).length;
  const flaggedCount = evaluatedQuestions.filter((q) => q.isFlagged).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Official Exam Summary</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">{examTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRetake}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Retake Exam</span>
            </button>
            <button
              onClick={onReturnToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Score Card Banner */}
        <div className={`rounded-2xl p-6 sm:p-8 border shadow-xl relative overflow-hidden ${
          isPassed 
            ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/40' 
            : 'bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/40'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 border ${
                isPassed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                <Award className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-2 border">
                  {isPassed ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASSED (≥ 80%)
                    </span>
                  ) : (
                    <span className="bg-rose-500/20 text-rose-300 border-rose-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" /> DID NOT PASS (&lt; 80%)
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Score: {score} <span className="text-slate-400 font-normal text-lg sm:text-xl">/ {totalQuestions}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Passing threshold is <strong className="text-white">80.0%</strong> (CSC Standard Rating requirement)
                </p>
              </div>
            </div>

            {/* Score Percentage Gauge Badge */}
            <div className="flex flex-col items-center sm:items-end justify-center">
              <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {percentage}%
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Overall Rating</span>
            </div>
          </div>
        </div>

        {/* Subject Area Performance Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>Subject Area Breakdown</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectBreakdown.map((subj) => (
              <div key={subj.subject} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-200">{subj.subject}</span>
                  <span className="font-mono font-bold text-slate-300">
                    {subj.correct} / {subj.total} <span className="text-slate-500">({subj.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      subj.percentage >= 80 ? 'bg-emerald-500' : subj.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${subj.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Review Section Header & Filters */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Detailed Item Review</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                  {filteredQuestions.length} Items
                </span>
              </h3>
              <p className="text-xs text-slate-400">Review answers, correct solutions, and rationales for every question.</p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All ({totalQuestions})
              </button>
              <button
                onClick={() => setFilter('CORRECT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === 'CORRECT'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Correct ({correctCount})
              </button>
              <button
                onClick={() => setFilter('INCORRECT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === 'INCORRECT'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Incorrect ({incorrectCount})
              </button>
              <button
                onClick={() => setFilter('UNANSWERED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === 'UNANSWERED'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Unanswered ({unansweredCount})
              </button>
              <button
                onClick={() => setFilter('FLAGGED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filter === 'FLAGGED'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Flagged ({flaggedCount})
              </button>
            </div>
          </div>

          {/* Question Review List */}
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs sm:text-sm">
              No questions found for the selected filter category.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map(({ question, userAnswer, isCorrect, isUnanswered, isFlagged }) => {
                const isExpanded = expandedQuestions[question.number] ?? true;

                return (
                  <div
                    key={question.id}
                    className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all shadow-sm ${
                      isCorrect
                        ? 'border-emerald-500/30'
                        : isUnanswered
                        ? 'border-amber-500/30'
                        : 'border-rose-500/30'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
                          Q{question.number}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-800">
                          {question.subject}
                        </span>

                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : isUnanswered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                            <HelpCircle className="w-3.5 h-3.5" /> Unanswered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect
                          </span>
                        )}

                        {isFlagged && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md">
                            <Flag className="w-3 h-3 fill-amber-300" /> Flagged
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleExpand(question.number)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label={isExpanded ? "Collapse Question Details" : "Expand Question Details"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Question Prompt */}
                    <div className="text-sm sm:text-base font-medium text-slate-100 mb-4 whitespace-pre-line leading-relaxed">
                      {question.questionText}
                    </div>

                    {/* Options Details */}
                    {isExpanded && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((opt) => {
                          const isUserPick = userAnswer === opt.id;
                          const isCorrectOpt = question.correctOptionId === opt.id;

                          let optionStyle = 'bg-slate-800/40 border-slate-800 text-slate-300';
                          if (isCorrectOpt) {
                            optionStyle = 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 font-semibold';
                          } else if (isUserPick && !isCorrect) {
                            optionStyle = 'bg-rose-950/60 border-rose-500/80 text-rose-100 font-semibold';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${optionStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded text-xs font-bold font-mono flex items-center justify-center shrink-0 bg-slate-800 border border-slate-700 text-slate-200">
                                  {opt.id}
                                </span>
                                <span>{opt.text}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isCorrectOpt && (
                                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/30">
                                    Correct Choice
                                  </span>
                                )}
                                {isUserPick && !isCorrectOpt && (
                                  <span className="text-[11px] font-bold text-rose-400 bg-rose-900/50 px-2 py-0.5 rounded border border-rose-500/30">
                                    Your Choice
                                  </span>
                                )}
                                {isUserPick && isCorrectOpt && (
                                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/30">
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation Rationale Box */}
                    {isExpanded && question.explanation && (
                      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs sm:text-sm space-y-1">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400 text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Official Solution Rationale</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed font-sans pt-1">
                          {question.explanation}
                        </p>
                      </div>
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
