import React from 'react';
import { BookOpen, Lightbulb, ListOrdered, XCircle } from 'lucide-react';
import type { OptionId, Question } from '@/types';

interface ExplanationPanelProps {
  question: Question;
  /** The option the user picked, to highlight the matching misconception note. */
  selectedOptionId?: OptionId | null;
}

/**
 * Structured teaching explanation, shared by Practice instant feedback and
 * the Results review. Renders: correct answer, why it's correct, the worked
 * steps, why each wrong option is wrong, a retention tip, and references.
 */
export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  question,
  selectedOptionId = null,
}) => {
  const correctChoice = question.choices.find((c) => c.id === question.correctOptionId);
  const distractors = question.distractorExplanations;
  const wrongOptions = question.choices.filter((c) => c.id !== question.correctOptionId);

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      {/* Correct answer + why */}
      <div>
        <p className="font-bold text-emerald-400 mb-1.5">
          Correct Answer: {question.correctOptionId}
          {correctChoice ? ` — ${correctChoice.text}` : ''}
        </p>
        <p className="text-slate-200 leading-relaxed">{question.explanation}</p>
      </div>

      {/* Worked solution */}
      {question.steps && question.steps.length > 0 && (
        <div className="rounded-xl bg-slate-900/70 border border-slate-700/60 p-4">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300 text-xs mb-2.5">
            <ListOrdered className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Step-by-Step Solution</span>
          </div>
          <ol className="space-y-2">
            {question.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-slate-200 leading-relaxed whitespace-pre-line">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Why the other choices are wrong */}
      {distractors && wrongOptions.some((o) => distractors[o.id]) && (
        <div>
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300 text-xs mb-2">
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Why the Other Choices Are Wrong</span>
          </div>
          <ul className="space-y-2">
            {wrongOptions.map((option) => {
              const note = distractors[option.id];
              if (!note) return null;
              const isUserPick = selectedOptionId === option.id;
              return (
                <li
                  key={option.id}
                  className={`flex gap-3 rounded-lg p-2.5 ${
                    isUserPick ? 'bg-rose-950/40 border border-rose-500/30' : ''
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded text-[11px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 border ${
                      isUserPick
                        ? 'bg-rose-500 text-slate-950 border-rose-400'
                        : 'bg-slate-800 text-slate-300 border-slate-600'
                    }`}
                  >
                    {option.id}
                  </span>
                  <span className="text-slate-300 leading-relaxed">
                    {isUserPick && <strong className="text-rose-300">Your choice. </strong>}
                    {note}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Retention aid */}
      {question.tip && (
        <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 flex gap-2.5">
          <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold text-emerald-300 text-xs uppercase tracking-wider block mb-1">
              {question.tip.label}
            </span>
            <span className="text-slate-200 leading-relaxed">{question.tip.text}</span>
          </div>
        </div>
      )}

      {/* References */}
      {(question.reference || question.source) && (
        <p className="flex items-start gap-1.5 text-slate-400 text-xs">
          <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {question.reference}
            {question.reference && question.source ? ' — ' : ''}
            {question.source}
          </span>
        </p>
      )}
    </div>
  );
};
