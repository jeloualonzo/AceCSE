import React from 'react';
import { BookOpen, Lightbulb, ListOrdered, XCircle } from 'lucide-react';
import type { OptionId, Question } from '@/types';
import { getStructuredExplanation } from '@/data/structuredExplanation';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';
import { MathValue } from './MathValue';

interface ExplanationPanelProps {
  question: Question;
  /** The option the user picked, to highlight the matching misconception note. */
  selectedOptionId?: OptionId | null;
  /** Dark (exam surfaces) or light (landing / light-mode surfaces). */
  theme?: 'dark' | 'light';
  /** Practice/Results opt-in; other surfaces retain the legacy renderer. */
  preferStructuredExplanation?: boolean;
}

/**
 * Structured teaching explanation, shared by Practice instant feedback, the
 * Results review, and the landing sample question. Renders: correct answer,
 * why it's correct, the worked steps, why each wrong option is wrong, a
 * retention tip, and references.
 */
export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  question,
  selectedOptionId = null,
  theme = 'dark',
  preferStructuredExplanation = false,
}) => {
  const dark = theme === 'dark';
  const c = {
    correctHeading: dark ? 'text-emerald-400' : 'text-emerald-700',
    body: dark ? 'text-slate-200' : 'text-black',
    bodyMuted: dark ? 'text-slate-300' : 'text-black',
    faint: dark ? 'text-slate-400' : 'text-slate-500',
    sectionHeading: dark ? 'text-slate-300' : 'text-slate-600',
    stepsBox: dark ? 'bg-slate-900/70 border-slate-700/60' : 'bg-slate-50 border-slate-200',
    stepBadge: dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700',
    wrongPickRow: dark ? 'bg-slate-800/70 border border-slate-600/60' : 'bg-slate-100 border border-slate-300',
    wrongPickBadge: dark
      ? 'bg-slate-600 text-white border-slate-500'
      : 'bg-slate-500 text-white border-slate-400',
    optionBadge: dark
      ? 'bg-slate-800 text-slate-300 border-slate-600'
      : 'bg-slate-100 text-slate-600 border-slate-300',
    wrongPickLabel: dark ? 'text-slate-100' : 'text-black',
    tipBox: dark ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
    tipLabel: dark ? 'text-emerald-300' : 'text-emerald-800',
    tipIcon: dark ? 'text-emerald-400' : 'text-emerald-600',
  };

  const structuredExplanation = preferStructuredExplanation
    ? getStructuredExplanation(question.structuredExplanation)
    : undefined;
  if (structuredExplanation) {
    return <StructuredExplanationRenderer explanation={structuredExplanation} theme={theme} />;
  }

  const correctChoice = question.choices.find((ch) => ch.id === question.correctOptionId);
  const distractors = question.distractorExplanations;
  const wrongOptions = question.choices.filter((ch) => ch.id !== question.correctOptionId);

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      {/* Correct answer + why */}
      <div>
        <p className={`font-bold mb-1.5 ${c.correctHeading}`}>
          Correct Answer: {question.correctOptionId}.
          {correctChoice ? <> <MathValue value={correctChoice.text} /></> : null}
        </p>
        <p className={`leading-relaxed ${c.body}`}>{question.explanation}</p>
      </div>

      {/* Worked solution */}
      {question.steps && question.steps.length > 0 && (
        <div className={`rounded-xl border p-4 ${c.stepsBox}`}>
          <div className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs mb-2.5 ${c.sectionHeading}`}>
            <ListOrdered className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Step-by-Step Solution</span>
          </div>
          <ol className="space-y-2">
            {question.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${c.stepBadge}`}
                >
                  {index + 1}
                </span>
                <span className={`leading-relaxed whitespace-pre-line ${c.body}`}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Why the other choices are wrong */}
      {distractors && wrongOptions.some((o) => distractors[o.id]) && (
        <div>
          <div className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs mb-2 ${c.sectionHeading}`}>
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
                  className={`flex gap-3 rounded-lg p-2.5 ${isUserPick ? c.wrongPickRow : ''}`}
                >
                  <span
                    className={`w-5 h-5 rounded text-[11px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 border ${
                      isUserPick ? c.wrongPickBadge : c.optionBadge
                    }`}
                  >
                    {option.id}
                  </span>
                  <span className={`leading-relaxed ${c.bodyMuted}`}>
                    {isUserPick && <strong className={c.wrongPickLabel}>Your choice. </strong>}
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
        <div className={`rounded-xl border p-3.5 flex gap-2.5 ${c.tipBox}`}>
          <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${c.tipIcon}`} aria-hidden="true" />
          <div>
            <span className={`font-bold text-xs uppercase tracking-wider block mb-1 ${c.tipLabel}`}>
              {question.tip.label}
            </span>
            <span className={`leading-relaxed ${c.body}`}>{question.tip.text}</span>
          </div>
        </div>
      )}

      {/* References */}
      {(question.reference || question.source) && (
        <p className={`flex items-start gap-1.5 text-xs ${c.faint}`}>
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
