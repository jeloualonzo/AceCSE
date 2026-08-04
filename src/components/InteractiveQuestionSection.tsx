import React, { useState } from 'react';
import { SAMPLE_QUESTIONS } from '../data/landingData';
import { Check, X, HelpCircle, ArrowRight, RefreshCw, Lightbulb } from 'lucide-react';

export const InteractiveQuestionSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'Numerical' | 'Verbal' | 'Analytical' | 'General Info'>('Numerical');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const currentQuestion = SAMPLE_QUESTIONS.find((q) => q.category === activeCategory) || SAMPLE_QUESTIONS[0];

  const handleCategoryChange = (category: 'Numerical' | 'Verbal' | 'Analytical' | 'General Info') => {
    setActiveCategory(category);
    setSelectedOption(null);
    setHasSubmitted(false);
  };

  const handleOptionSelect = (optionId: string) => {
    if (hasSubmitted) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setHasSubmitted(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasSubmitted(false);
  };

  const isCorrect = selectedOption === currentQuestion.correctOptionId;

  return (
    <section id="try-question" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Try a Real CSE Question
          </h2>
          <p className="text-slate-600 mt-3 text-base sm:text-lg">
            Experience how AceCSE provides instant feedback and step-by-step rationales for every item.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(['Numerical', 'Verbal', 'Analytical', 'General Info'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Question Card Widget */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {currentQuestion.category} • {currentQuestion.level} Level
            </span>
            <span className="text-xs text-slate-500">
              Sample Question
            </span>
          </div>

          {/* Card Content */}
          <div className="p-6 sm:p-8">
            <p className="text-slate-900 font-medium text-base sm:text-lg leading-relaxed mb-6 whitespace-pre-line">
              {currentQuestion.question}
            </p>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isCorrectOption = opt.id === currentQuestion.correctOptionId;

                let optionStyles = 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800';

                if (hasSubmitted) {
                  if (isCorrectOption) {
                    optionStyles = 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold ring-1 ring-emerald-600';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyles = 'bg-rose-50 border-rose-500 text-rose-900 font-medium ring-1 ring-rose-500';
                  } else {
                    optionStyles = 'bg-white border-slate-200 opacity-60 text-slate-500';
                  }
                } else if (isSelected) {
                  optionStyles = 'bg-slate-900 text-white border-slate-900 font-medium';
                }

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      hasSubmitted ? 'cursor-default' : 'cursor-pointer'
                    } ${optionStyles}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          hasSubmitted && isCorrectOption
                            ? 'bg-emerald-600 text-white'
                            : hasSubmitted && isSelected && !isCorrectOption
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="text-sm sm:text-base">{opt.text}</span>
                    </div>

                    {hasSubmitted && isCorrectOption && (
                      <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {hasSubmitted && isSelected && !isCorrectOption && (
                      <X className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {!hasSubmitted ? (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Select an option to test your answer
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <span>Submit Answer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                
                {/* Result Indicator Banner */}
                <div
                  className={`p-4 rounded-lg border flex items-start gap-3 ${
                    isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {isCorrect ? (
                    <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {isCorrect ? 'Correct Answer!' : 'Incorrect Choice'}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      {currentQuestion.explanation.summary}
                    </p>
                  </div>
                </div>

                {/* Step-by-step Explanation Box */}
                <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                    Step-by-Step Rationale
                  </h5>
                  <ul className="space-y-2 mb-4 text-xs sm:text-sm text-slate-700">
                    {currentQuestion.explanation.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-emerald-700 font-bold shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="p-3 bg-white rounded border border-slate-200 text-xs text-slate-800 font-medium">
                    <span className="font-bold text-emerald-800">Key Takeaway: </span>
                    {currentQuestion.explanation.keyTakeaway}
                  </div>
                </div>

                {/* Try another / Reset */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
