import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Question, OptionId } from '@/types';
import { FilingInstanceRenderer, hasCompactFilingInstance } from './FilingInstanceRenderer';
import { SpellingInstanceRenderer, hasCompactSpellingInstance } from './SpellingInstanceRenderer';
import { useTheme } from '@/context/ThemeContext';
import { ExplanationPanel } from './ExplanationPanel';

export interface QuestionCardProps {
  question: Question;
  /** 1-based position within the session, shown as a quiet label. */
  questionNumber?: number;
  /**
   * Grouped-content compatibility: when the question belongs to an explicit
   * item set (filing set, passage set, …), its shared directions/example
   * render once above the question — same information the booklet shows,
   * without redesigning Practice's one-question learning flow.
   */
  groupContext?: { title?: string; directions?: string; example?: string };
  selectedOptionId: OptionId | null;
  onSelectOption: (optionId: OptionId) => void;
  /**
   * Practice mode: once an option is chosen, offer the teaching explanation
   * behind a Show/Hide accordion. Selection styling stays calm emerald in
   * both modes — the explanation itself says what was right and why.
   * Simulation mode shows nothing until the results page.
   */
  instantFeedback?: boolean;
}

/**
 * The question surface. Question, passage, and choices sit directly on the
 * page — only the explanation lives in a card, styled like documentation.
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  groupContext,
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

  const explanation = (
    <div className="rounded-r-lg border-l-4 border-l-emerald-500 border-y border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5">
      <ExplanationPanel
        question={question}
        selectedOptionId={selectedOptionId}
        theme={resolvedTheme}
      />
    </div>
  );

  return (
    <div className="w-full lg:h-full lg:grid lg:grid-cols-2 lg:gap-10">
      {/* LEFT: question, passage, explanation (desktop) — directly on the page */}
      <div className="space-y-4 sm:space-y-5 lg:overflow-y-auto scrollbar-hide lg:pr-1 lg:pb-8 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {questionNumber !== undefined && (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Question {questionNumber}
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {question.subject}
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400">
            {question.topic}
          </span>
        </div>

        {groupContext && (groupContext.directions || groupContext.example) && (
          <div className="rounded-r-lg border-l-4 border-l-slate-400 dark:border-l-slate-500 border-y border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
            {groupContext.title && (
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {groupContext.title}
              </p>
            )}
            {groupContext.directions && (
              <p className="text-sm text-black dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {groupContext.directions}
              </p>
            )}
            {groupContext.example && (
              <p className="text-sm text-black dark:text-slate-200 leading-relaxed whitespace-pre-line">
                <span className="font-semibold">Example: </span>
                {groupContext.example}
              </p>
            )}
          </div>
        )}

        {question.passage && !hasCompactFilingInstance(question) && !hasCompactSpellingInstance(question) && (
          <div className="border-l-2 border-slate-300 dark:border-slate-700 pl-4 text-sm leading-relaxed text-black dark:text-slate-300 whitespace-pre-line">
            {question.passage}
          </div>
        )}

        {hasCompactFilingInstance(question) ? (
          <FilingInstanceRenderer question={question} />
        ) : hasCompactSpellingInstance(question) ? (
          <SpellingInstanceRenderer question={question} />
        ) : (
          <div className="text-lg sm:text-xl font-medium text-black dark:text-slate-100 leading-relaxed whitespace-pre-line">
            {question.question}
          </div>
        )}

        {/* Explanation lives in the left column on desktop */}
        {isAnswered && showExplanation && <div className="hidden lg:block">{explanation}</div>}
      </div>

      {/* RIGHT: choices + explanation toggle */}
      {/* `lg:px-1` keeps the selected option's left border/ring off the scroll edge */}
      <div className="mt-5 lg:mt-0 space-y-3 lg:overflow-y-auto scrollbar-hide lg:px-1 lg:pb-8 min-w-0">
        <div className="space-y-2.5" role="radiogroup" aria-label="Answer options">
          {question.choices.map((option) => {
            const isSelected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                role="radio"
                aria-checked={isSelected}
                className={`w-full text-left p-4 min-h-[56px] rounded-lg border transition-colors flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 text-black dark:text-white ring-1 ring-emerald-500/40'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-black dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <span
                    className={`w-8 h-8 rounded text-xs font-bold font-mono flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm sm:text-base leading-snug">{option.text}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Practice: the explanation carries the verdict — no separate banner */}
        {isAnswered && (
          <div className="space-y-3" aria-live="polite">
            <button
              onClick={() => setShowExplanation((v) => !v)}
              aria-expanded={showExplanation}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
