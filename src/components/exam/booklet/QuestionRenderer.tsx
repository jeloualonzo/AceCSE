import React from 'react';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { OptionId, Question } from '@/types';
import { FilingInstanceRenderer, hasCompactFilingInstance } from '../FilingInstanceRenderer';
import { SpellingInstanceRenderer, hasCompactSpellingInstance } from '../SpellingInstanceRenderer';
import { NumberSeriesInstanceRenderer, hasCompactNumberSeriesInstance } from '../NumberSeriesInstanceRenderer';
import { GrammarInstanceRenderer, hasCompactGrammarInstance } from '../GrammarInstanceRenderer';
import { ExplanationPanel } from '../ExplanationPanel';
import { QuestionStimulusRenderer } from '../QuestionStimulusRenderer';

export interface QuestionRendererProps {
  question: Question;
  /** 1-based booklet-wide position, from sessionNumberMap(). */
  questionNumber: number;
  /** Optional learner-facing label such as N1/V1 for All Subjects Practice. */
  questionLabel?: string;
  /** True only for the one primary question from the booklet scroll-spy model. */
  active?: boolean;
  selectedOptionId: OptionId | null;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  /**
   * True when the enclosing group renders a shared stimulus block — the
   * member's own (identical) passage is then suppressed so the stimulus
   * appears exactly once, booklet-style.
   */
  suppressPassage?: boolean;
  /** Render this scored item as a restrained container inside a shared task/set. */
  itemContainer?: boolean;
  /** Practice shows a local explanation toggle; Simulation keeps feedback hidden. */
  practiceMode?: boolean;
}

/**
 * One scored question inside the continuous booklet. It renders its own
 * `passage` stimulus (471 singleton questions carry one) EXCEPT when the
 * enclosing group provides the shared stimulus once (suppressPassage).
 * Simulation never shows explanations; Practice enables a local toggle on
 * the same item renderer. Shared-task callers opt into a restrained neutral
 * item container while standalone callers remain plain document flow.
 *
 * `id="question-{id}"` is the stable anchor the navigator and Previous/Next
 * scroll to; `data-question-id` is what the scroll-spy observer keys off of.
 * `tabIndex={-1}` lets a navigator jump move keyboard/screen-reader focus
 * here without this section being in the normal Tab order.
 */
export const QuestionRenderer: React.FC<QuestionRendererProps> = React.memo(function QuestionRenderer({
  question,
  questionNumber,
  questionLabel,
  active = false,
  selectedOptionId,
  onSelectOption,
  suppressPassage = false,
  itemContainer = false,
  practiceMode = false,
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const isAnswered = practiceMode && selectedOptionId !== null;
  const displayLabel = questionLabel ?? String(questionNumber);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    setShowExplanation(false);
  }, [question.id]);

  return (
    <section
      id={`question-${question.id}`}
      data-question-id={question.id}
      data-focus-id={question.id}
      data-focus-type="question"
      data-focus-active={active ? 'true' : 'false'}
      data-primary-active={active ? 'true' : 'false'}
      aria-labelledby={`question-${question.id}-heading`}
      tabIndex={-1}
      className={`${itemContainer
        ? `scroll-mt-28 rounded-xl border bg-white dark:bg-slate-900 p-4 sm:p-5 ${active
          ? 'border-emerald-400/90 dark:border-emerald-500/80 shadow-md'
          : 'border-emerald-200/80 dark:border-emerald-900/70 shadow-sm'}`
        : 'scroll-mt-28'} focus:outline-none`}
    >
      <div className="flex items-center gap-2.5 flex-wrap mb-2">
        <span
          id={`question-${question.id}-heading`}
          className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Question {displayLabel}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {question.subject}
        </span>
      </div>

      {!suppressPassage && !hasCompactFilingInstance(question) && !hasCompactSpellingInstance(question) && !hasCompactNumberSeriesInstance(question) && !hasCompactGrammarInstance(question) && (
        <QuestionStimulusRenderer question={question} className="mb-3" />
      )}

      {hasCompactFilingInstance(question) ? (
        <FilingInstanceRenderer question={question} />
      ) : hasCompactSpellingInstance(question) ? (
        <SpellingInstanceRenderer question={question} />
      ) : hasCompactNumberSeriesInstance(question) ? (
        <NumberSeriesInstanceRenderer question={question} />
      ) : hasCompactGrammarInstance(question) ? (
        <GrammarInstanceRenderer question={question} />
      ) : (
        <p className="text-base sm:text-lg font-medium text-black dark:text-slate-100 leading-relaxed whitespace-pre-line mb-4">
          {question.question}
        </p>
      )}

      <div
        className="space-y-2.5"
        role="radiogroup"
        aria-label={`Answer options for question ${displayLabel}`}
      >
        {question.choices.map((option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectOption(question.id, option.id)}
              role="radio"
              aria-checked={isSelected}
              className={`w-full text-left p-4 min-h-[52px] rounded-lg border transition-colors flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 text-black dark:text-white ring-1 ring-emerald-500/40'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-black dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-3.5 flex-1 min-w-0">
                <span
                  className={`w-7 h-7 rounded text-xs font-bold font-mono flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {option.id}
                </span>
                <span className="text-sm sm:text-base leading-snug">{option.text}</span>
              </span>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40'
                }`}
                aria-hidden="true"
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <button
            type="button"
            onClick={() => setShowExplanation((visible) => !visible)}
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
          {showExplanation && (
            <div className="rounded-r-lg border-l-4 border-l-emerald-500 border-y border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5">
              <ExplanationPanel
                question={question}
                selectedOptionId={selectedOptionId}
                theme={isDark ? 'dark' : 'light'}
                preferStructuredExplanation
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
});
