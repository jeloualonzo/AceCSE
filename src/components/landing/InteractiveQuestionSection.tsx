import React, { useState } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, XCircle } from 'lucide-react';
import { SAMPLE_QUESTIONS } from '@/data/landing';
import type { OptionId } from '@/types';
import { ExplanationPanel } from '@/components/exam/ExplanationPanel';

const CATEGORIES = ['Numerical', 'Verbal', 'Analytical', 'General Info'] as const;

/**
 * "Try a Real CSE Question" — the exact Practice-mode experience, on the
 * landing page: answer, get a quiet verdict, expand the full teaching
 * explanation. Same components, same philosophy as inside the app.
 */
export const InteractiveQuestionSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('Numerical');
  const [selected, setSelected] = useState<OptionId | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const sample =
    SAMPLE_QUESTIONS.find((s) => s.category === activeCategory) ?? SAMPLE_QUESTIONS[0];
  const question = sample.question;
  const isCorrect = selected === question.correctOptionId;

  const switchCategory = (category: (typeof CATEGORIES)[number]) => {
    setActiveCategory(category);
    setSelected(null);
    setShowExplanation(false);
  };

  const reset = () => {
    setSelected(null);
    setShowExplanation(false);
  };

  return (
    <section id="try-question" className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
            Try a Real CSE Question
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Straight from our question bank — with the same teaching explanation you get inside
            the reviewer.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-6" role="tablist" aria-label="Question category">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => switchCategory(category)}
              className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeCategory === category
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {question.subject}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
              {question.topic}
            </span>
          </div>

          {question.passage && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {question.passage}
            </div>
          )}

          <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-line">
            {question.question}
          </p>

          <div className="space-y-2.5" role="radiogroup" aria-label="Answer options">
            {question.choices.map((option) => {
              const isSelected = selected === option.id;
              let style = 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-800';
              let badge = 'bg-slate-100 text-slate-600 border-slate-300';
              if (isSelected) {
                if (isCorrect) {
                  style = 'bg-emerald-50 border-2 border-emerald-500 text-slate-900';
                  badge = 'bg-emerald-600 text-white border-emerald-500';
                } else {
                  style = 'bg-rose-50 border-2 border-rose-400 text-slate-900';
                  badge = 'bg-rose-500 text-white border-rose-400';
                }
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(option.id)}
                  className={`w-full text-left flex items-center gap-3 p-3.5 min-h-[52px] rounded-xl border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${style}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono border shrink-0 ${badge}`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm leading-snug flex-1">{option.text}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="space-y-3" aria-live="polite">
              {isCorrect ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  Correct
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-bold text-rose-800">
                  <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  Incorrect
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExplanation((v) => !v)}
                  aria-expanded={showExplanation}
                  className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Reset
                </button>
              </div>

              {showExplanation && (
                <div className="rounded-r-xl border-l-4 border-l-emerald-500 border-y border-r border-slate-200 bg-emerald-50/40 p-4 sm:p-5">
                  <ExplanationPanel
                    question={question}
                    selectedOptionId={selected}
                    theme="light"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
