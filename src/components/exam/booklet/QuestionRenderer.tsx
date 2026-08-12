import React from 'react';
import { Check } from 'lucide-react';
import type { OptionId, Question } from '@/types';

export interface QuestionRendererProps {
  question: Question;
  /** 1-based booklet-wide position, from questionNumberMap(). */
  questionNumber: number;
  selectedOptionId: OptionId | null;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
}

/**
 * One scored question inside the continuous booklet. Unlike the old
 * single-question `QuestionCard`, this never owns a passage or explanation —
 * shared stimulus content belongs to the enclosing `GroupRenderer`, and
 * simulation never shows feedback until results. Practice keeps using the
 * original `QuestionCard` unchanged.
 *
 * `id="question-{id}"` is the stable anchor the navigator and Previous/Next
 * scroll to; `data-question-id` is what the scroll-spy observer keys off of.
 * `tabIndex={-1}` lets a navigator jump move keyboard/screen-reader focus
 * here without this section being in the normal Tab order.
 */
export const QuestionRenderer: React.FC<QuestionRendererProps> = React.memo(function QuestionRenderer({
  question,
  questionNumber,
  selectedOptionId,
  onSelectOption,
}) {
  return (
    <section
      id={`question-${question.id}`}
      data-question-id={question.id}
      aria-labelledby={`question-${question.id}-heading`}
      tabIndex={-1}
      className="scroll-mt-28 focus:outline-none"
    >
      <div className="flex items-center gap-2.5 flex-wrap mb-2">
        <span
          id={`question-${question.id}-heading`}
          className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Question {questionNumber}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {question.subject}
        </span>
      </div>

      <p className="text-base sm:text-lg font-medium text-black dark:text-slate-100 leading-relaxed whitespace-pre-line mb-4">
        {question.question}
      </p>

      <div
        className="space-y-2.5"
        role="radiogroup"
        aria-label={`Answer options for question ${questionNumber}`}
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
    </section>
  );
});
