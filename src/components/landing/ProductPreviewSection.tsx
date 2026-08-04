import React, { useState } from 'react';
import { Clock, Flag, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface ProductPreviewSectionProps {
  onStartPracticing?: () => void;
}

export const ProductPreviewSection: React.FC<ProductPreviewSectionProps> = ({ onStartPracticing }) => {
  const [selectedItem, setSelectedItem] = useState(24);
  const [selectedOption, setSelectedOption] = useState<string | null>('B');
  const [isFlagged, setIsFlagged] = useState(true);

  // Sample items state simulation
  const answeredItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  const flaggedItems = [8, 15, 24, 42];

  const previewQuestions: Record<number, {
    category: string;
    text: string;
    options: { id: string; text: string }[];
  }> = {
    24: {
      category: 'Numerical Ability • Work Word Problems',
      text: 'An office administrative clerk can encode 1,200 records in 6 hours. If a second clerk joins and together they encode 1,200 records in 2 hours and 24 minutes, how long would it take the second clerk working alone to encode 1,200 records?',
      options: [
        { id: 'A', text: '3 hours 30 minutes' },
        { id: 'B', text: '4 hours 00 minutes' },
        { id: 'C', text: '4 hours 30 minutes' },
        { id: 'D', text: '5 hours 00 minutes' },
        { id: 'E', text: '5 hours 15 minutes' },
      ],
    },
    25: {
      category: 'Verbal Ability • Grammar & Correct Usage',
      text: 'Identify the section containing an error in grammar or structure: "The regional director together with his division heads (A) / are attending (B) / the annual civil service conference (C) / in Baguio City (D) / No error (E)."',
      options: [
        { id: 'A', text: 'together with his division heads' },
        { id: 'B', text: 'are attending' },
        { id: 'C', text: 'the annual civil service conference' },
        { id: 'D', text: 'in Baguio City' },
        { id: 'E', text: 'No error' },
      ],
    },
  };

  const currentQ = previewQuestions[selectedItem] || previewQuestions[24];

  return (
    <section id="simulator-preview" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            See AceCSE in Action
          </h2>
          <p className="text-slate-600 mt-3 text-base sm:text-lg">
            A clean, disturbance-free testing environment designed to mirror the actual Civil Service Examination experience.
          </p>
        </div>

        {/* Simulator Frame Container */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden max-w-5xl mx-auto">
          
          {/* Simulator Top Header */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-100">
                  Civil Service Examination - Professional Level
                </h3>
                <p className="text-xs text-slate-400">Section I: Numerical & Analytical Ability</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs sm:text-sm">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 font-mono">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-200 font-bold">02:24:18</span>
                <span className="text-slate-400 text-xs font-sans">remaining</span>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-slate-400">Progress: </span>
                <span className="text-white font-semibold">{selectedItem} / 170 items</span>
              </div>
            </div>
          </div>

          {/* Simulator Main Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            
            {/* Left Column: Question Area */}
            <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
              <div>
                
                {/* Meta Bar */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    {currentQ.category}
                  </span>
                  <button
                    onClick={() => setIsFlagged(!isFlagged)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      isFlagged
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-600' : ''}`} />
                    <span>{isFlagged ? 'Flagged for Review' : 'Flag Question'}</span>
                  </button>
                </div>

                {/* Item Number & Question Statement */}
                <div className="mb-6">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Question {selectedItem}
                  </span>
                  <p className="text-slate-900 font-medium text-base sm:text-lg leading-relaxed">
                    {currentQ.text}
                  </p>
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedOption(opt.id)}
                        role="radio"
                        aria-checked={selectedOption === opt.id}
                        className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <span className={`text-sm leading-snug text-left ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Bottom Navigation Toolbar */}
              <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedItem((prev) => Math.max(1, prev - 1))}
                  disabled={selectedItem <= 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Click items in palette to jump
                  </span>
                  <button
                    onClick={() => setSelectedItem((prev) => (prev === 24 ? 25 : 24))}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Next Item</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Item Palette Navigation */}
            <div className="lg:col-span-4 p-5 bg-slate-50 flex flex-col justify-between">
              <div>
                
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Question Palette (170 Items)
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    24 Answered
                  </span>
                </div>

                {/* Palette Legend */}
                <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 bg-white rounded border border-slate-200 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600"></span>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400"></span>
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-white border border-slate-300"></span>
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-900"></span>
                    <span>Current</span>
                  </div>
                </div>

                {/* Interactive Grid Preview */}
                <div className="grid grid-cols-6 gap-1.5 max-h-64 overflow-y-auto p-1 bg-white rounded border border-slate-200">
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const num = idx + 1;
                    const isCurrent = num === selectedItem;
                    const isAns = answeredItems.includes(num);
                    const isFlag = flaggedItems.includes(num);

                    let bgClass = 'bg-white text-slate-700 border-slate-200';
                    if (isCurrent) {
                      bgClass = 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400 font-bold';
                    } else if (isFlag) {
                      bgClass = 'bg-amber-100 text-amber-900 border-amber-400 font-semibold';
                    } else if (isAns) {
                      bgClass = 'bg-emerald-600 text-white border-emerald-600 font-medium';
                    }

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          if (previewQuestions[num]) {
                            setSelectedItem(num);
                          } else {
                            setSelectedItem(24);
                          }
                        }}
                        className={`h-7 rounded text-xs flex items-center justify-center border transition-all cursor-pointer ${bgClass}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Submit CTA Box in Palette */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 mb-3">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Your answers automatically save as you navigate through the exam.</span>
                </div>
                <button
                  onClick={onStartPracticing}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Submit Exam & View Diagnostics
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
