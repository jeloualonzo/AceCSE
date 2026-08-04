import React from 'react';
import { Check, X, BookOpen, Lightbulb } from 'lucide-react';
import type { Question, OptionId } from '@/types';

export interface QuestionCardProps {
  question: Question;
  selectedOptionId: OptionId | null;
  onSelectOption: (optionId: OptionId) => void;
  /**
   * Practice mode: reveal correctness and the explanation as soon as an
   * option is chosen. The answer stays changeable — practice is for learning.
   * Simulation mode leaves all feedback for the results screen.
   */
  instantFeedback?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  instantFeedback = false,
}) => {
  const isRevealed = instantFeedback && selectedOptionId !== null;
  const isCorrect = isRevealed && selectedOptionId === question.correctOptionId;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Meta row: subject and topic badges */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/80">
            {question.subject}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
            {question.topic}
          </span>
        </div>

      </div>

      {/* Stimulus passage, when present */}
      {question.passage && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-800/60 border border-slate-700/70 text-slate-300 text-xs sm:text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Passage</span>
          </div>
          <div className="whitespace-pre-line leading-relaxed text-slate-200">
            {question.passage}
          </div>
        </div>
      )}

      {/* Prompt */}
      <div className="p-5 sm:p-7 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md">
        <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-line">
          {question.question}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3 pt-1" role="radiogroup" aria-label="Answer options">
        {question.choices.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrectOption = option.id === question.correctOptionId;

          let optionStyle =
            'bg-slate-800/80 border-slate-700/70 text-slate-200 hover:bg-slate-800 hover:border-slate-600';
          let badgeStyle = 'bg-slate-700/80 text-slate-300 border-slate-600';
          if (isRevealed) {
            if (isCorrectOption) {
              optionStyle = 'bg-emerald-950/50 border-2 border-emerald-500 text-emerald-100';
              badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold';
            } else if (isSelected) {
              optionStyle = 'bg-rose-950/50 border-2 border-rose-500 text-rose-100';
              badgeStyle = 'bg-rose-500 text-slate-950 border-rose-400 font-extrabold';
            } else {
              optionStyle = 'bg-slate-800/50 border-slate-700/50 text-slate-400';
            }
          } else if (isSelected) {
            optionStyle =
              'bg-emerald-950/40 border-2 border-emerald-500 text-white ring-1 ring-emerald-500/30';
            badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold';
          }

          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              role="radio"
              aria-checked={isSelected}
              className={`w-full text-left p-4 min-h-[56px] rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:outline-offset-2 ${optionStyle}`}
            >
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <span
                  className={`w-8 h-8 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 border transition-colors ${badgeStyle}`}
                >
                  {option.id}
                </span>
                <span
                  className={`text-sm sm:text-base leading-snug ${isSelected && !isRevealed ? 'font-semibold text-emerald-100' : ''}`}
                >
                  {option.text}
                </span>
              </div>

              {isRevealed && isCorrectOption && (
                <Check className="w-5 h-5 text-emerald-400 shrink-0 stroke-[3]" aria-hidden="true" />
              )}
              {isRevealed && isSelected && !isCorrectOption && (
                <X className="w-5 h-5 text-rose-400 shrink-0 stroke-[3]" aria-hidden="true" />
              )}
              {!isRevealed && (
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-600 bg-slate-900/40'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Instant explanation (practice mode) */}
      {isRevealed && (
        <div
          className={`p-4 sm:p-5 rounded-xl border text-xs sm:text-sm space-y-2 ${
            isCorrect
              ? 'bg-emerald-950/40 border-emerald-500/40'
              : 'bg-slate-800/80 border-slate-700/80'
          }`}
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs ${
              isCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isCorrect ? 'Correct' : `Incorrect — the answer is ${question.correctOptionId}`}</span>
          </div>
          <p className="text-slate-200 leading-relaxed">{question.explanation}</p>
          {question.reference && (
            <p className="text-slate-400 text-xs">Reference: {question.reference}</p>
          )}
        </div>
      )}
    </div>
  );
};
