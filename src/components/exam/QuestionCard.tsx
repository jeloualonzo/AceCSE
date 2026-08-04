import React, { useEffect, useState } from 'react';
import { BookOpen, Check, CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import type { Question, OptionId } from '@/types';
import { ExplanationPanel } from './ExplanationPanel';
import { useTheme } from '@/context/ThemeContext';

export interface QuestionCardProps {
  question: Question;
  selectedOptionId: OptionId | null;
  onSelectOption: (optionId: OptionId) => void;
  /**
   * Practice mode: show Correct/Incorrect as soon as an option is chosen and
   * offer a "Show Explanation" accordion. Answers stay changeable — practice
   * is for learning. Simulation mode shows nothing until the results page.
   */
  instantFeedback?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  instantFeedback = false,
}) => {
  const { resolvedTheme } = useTheme();
  const [showExplanation, setShowExplanation] = useState(false);

  // A new question always starts with the explanation collapsed.
  useEffect(() => {
    setShowExplanation(false);
  }, [question.id]);

  const isAnswered = instantFeedback && selectedOptionId !== null;
  const isCorrect = isAnswered && selectedOptionId === question.correctOptionId;

  const explanation = (
    <div className="rounded-r-xl border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/25 border-y border-r border-slate-300 dark:border-slate-700/60 p-4 sm:p-5">
      <ExplanationPanel question={question} selectedOptionId={selectedOptionId} theme={resolvedTheme} />
    </div>
  );

  return (
    <div className="w-full lg:h-full lg:grid lg:grid-cols-2 lg:gap-8">
      {/* LEFT: question, passage, explanation (desktop) */}
      <div className="space-y-4 sm:space-y-5 lg:overflow-y-auto scrollbar-hide lg:pr-1 lg:pb-8 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80">
            {question.subject}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60">
            {question.topic}
          </span>
        </div>

        {question.passage && (
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Passage</span>
            </div>
            <div className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">
              {question.passage}
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md">
          <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
            {question.question}
          </div>
        </div>

        {/* Explanation lives in the left column on desktop */}
        {isAnswered && showExplanation && <div className="hidden lg:block">{explanation}</div>}
      </div>

      {/* RIGHT: choices, answer status, explanation toggle */}
      <div className="mt-4 lg:mt-0 space-y-3 lg:overflow-y-auto scrollbar-hide lg:pr-1 lg:pb-8 min-w-0">
        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {question.choices.map((option) => {
            const isSelected = selectedOptionId === option.id;

            let optionStyle =
              'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600';
            let badgeStyle = 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700/80 dark:text-slate-300 dark:border-slate-600';
            if (isSelected) {
              if (isAnswered && !isCorrect) {
                optionStyle = 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-700 dark:text-rose-100';
                badgeStyle = 'bg-rose-500 text-slate-950 border-rose-400 font-extrabold';
              } else if (isAnswered && isCorrect) {
                optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-100';
                badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold';
              } else {
                optionStyle =
                  'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-slate-900 dark:text-white ring-1 ring-emerald-500/30';
                badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold';
              }
            }

            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                role="radio"
                aria-checked={isSelected}
                className={`w-full text-left p-4 min-h-[56px] rounded-xl border transition-colors flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:outline-offset-2 ${optionStyle}`}
              >
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 border transition-colors ${badgeStyle}`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm sm:text-base leading-snug">{option.text}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900/40'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Practice: quiet verdict + explanation on demand */}
        {isAnswered && (
          <div className="space-y-3" aria-live="polite">
            {isCorrect ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                Correct
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300">
                <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                Incorrect
              </div>
            )}

            <button
              onClick={() => setShowExplanation((v) => !v)}
              aria-expanded={showExplanation}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {showExplanation ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  Hide Explanation
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  Show Explanation
                </>
              )}
            </button>

            {/* Explanation below the toggle on mobile */}
            {showExplanation && <div className="lg:hidden">{explanation}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
