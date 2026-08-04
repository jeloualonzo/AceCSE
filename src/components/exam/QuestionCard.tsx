import React from 'react';
import { Flag, Check, BookOpen } from 'lucide-react';
import { Question, QuestionOption } from '../../types';

export type { QuestionOption };

export interface QuestionData {
  id: string;
  number?: number;
  total?: number;
  subject: string;
  topic?: string;
  passage?: string;
  questionText: string;
  options: QuestionOption[];
  correctOptionId?: string;
  explanation?: string;
}

export interface QuestionCardProps {
  question: QuestionData | Question;
  selectedOptionId: string | null;
  isFlagged: boolean;
  onSelectOption: (optionId: string) => void;
  onToggleFlag: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionId,
  isFlagged,
  onSelectOption,
  onToggleFlag,
}) => {
  const promptText = 'questionText' in question ? question.questionText : question.question;
  const choicesList = 'options' in question ? question.options : question.choices;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Top Question Toolbar / Meta Row */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Subject & Topic Badge */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/80">
            <span>{question.subject}</span>
          </span>
          {question.topic && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
              <span>{question.topic}</span>
            </span>
          )}
        </div>

        {/* Flag Item Toggle Button */}
        <button
          onClick={onToggleFlag}
          className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-400 ${
            isFlagged
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-2xs font-bold'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
          }`}
          aria-pressed={isFlagged}
          aria-label={isFlagged ? "Unflag question" : "Flag question for review"}
        >
          <Flag className={`w-4 h-4 transition-colors ${isFlagged ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
          <span>{isFlagged ? 'Flagged for Review' : 'Flag Question'}</span>
        </button>
      </div>

      {/* Reading Passage Container (If Present) */}
      {question.passage && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-800/60 border border-slate-700/70 text-slate-300 text-xs sm:text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reference Passage / Scenario</span>
          </div>
          <div className="whitespace-pre-line font-serif leading-relaxed text-slate-200">
            {question.passage}
          </div>
        </div>
      )}

      {/* Question Prompt Card */}
      <div className="p-5 sm:p-7 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md">
        <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed sm:leading-loose tracking-tight whitespace-pre-line">
          {promptText}
        </div>
      </div>

      {/* Answer Options Grid */}
      <div className="space-y-3 pt-1" role="radiogroup" aria-label="Answer options">
        {choicesList.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              role="radio"
              aria-checked={isSelected}
              className={`w-full text-left p-4 sm:p-4.5 min-h-[56px] rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:outline-offset-2 ${
                isSelected
                  ? 'bg-emerald-950/40 border-2 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              {/* Option Letter Badge + Text */}
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <span
                  className={`w-8 h-8 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold'
                      : 'bg-slate-700/80 text-slate-300 border-slate-600'
                  }`}
                >
                  {option.id}
                </span>

                <span className={`text-sm sm:text-base leading-snug ${isSelected ? 'font-semibold text-emerald-100' : 'text-slate-200'}`}>
                  {option.text}
                </span>
              </div>

              {/* Selection Check Indicator */}
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'border-slate-600 bg-slate-900/40'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
};
