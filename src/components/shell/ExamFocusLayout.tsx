import React, { useState, useEffect, useRef } from 'react';
import { Clock, XCircle, ArrowLeft, ArrowRight, CheckCircle2, Grid, RotateCcw } from 'lucide-react';

interface ExamFocusLayoutProps {
  /** Formatted time remaining, or a label like "Untimed" for practice. */
  timeRemainingFormatted: string;
  onExitExam: () => void;
  onSubmitExam: () => void;
  /** Practice mode: restart the session with fresh questions. */
  onRestart?: () => void;
  /** Label for the exit control ("Exit Exam" / "Exit Practice"). */
  exitLabel?: string;
  children: React.ReactNode;
  currentQuestionNumber: number;
  totalQuestions: number;
  userAnswers?: Record<number, string>;
  onSelectQuestionNumber?: (num: number) => void;
  onPrevQuestion?: () => void;
  onNextQuestion?: () => void;
}

export const ExamFocusLayout: React.FC<ExamFocusLayoutProps> = ({
  timeRemainingFormatted,
  onExitExam,
  onSubmitExam,
  onRestart,
  exitLabel = 'Exit Exam',
  children,
  currentQuestionNumber,
  totalQuestions,
  userAnswers = {},
  onSelectQuestionNumber,
  onPrevQuestion,
  onNextQuestion,
}) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const progressPercent = Math.min(100, Math.round((currentQuestionNumber / totalQuestions) * 100));

  const togglePalette = (btnEl?: HTMLButtonElement | null) => {
    if (btnEl) {
      triggerButtonRef.current = btnEl;
    }
    setIsPaletteOpen((prev) => {
      const next = !prev;
      if (!next && triggerButtonRef.current) {
        setTimeout(() => triggerButtonRef.current?.focus(), 0);
      }
      return next;
    });
  };

  const closePalette = () => {
    setIsPaletteOpen(false);
    if (triggerButtonRef.current) {
      setTimeout(() => triggerButtonRef.current?.focus(), 0);
    }
  };

  // Keyboard accessibility: Escape key closes palette and returns focus
  useEffect(() => {
    if (!isPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* Streamlined Focus Header */}
      <header className="bg-slate-900 border-b border-slate-800 relative shrink-0">
        <div className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between">
          
          {/* Left: Exit + optional Restart */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExitExam}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 min-h-[40px] rounded-lg border border-slate-700/80 hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label={exitLabel}
            >
              <XCircle className="w-4 h-4 text-slate-400" />
              <span>{exitLabel}</span>
            </button>
            {onRestart && (
              <button
                onClick={onRestart}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 min-h-[40px] rounded-lg border border-slate-700/80 hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>Restart</span>
              </button>
            )}
          </div>

          {/* Center: Current Question & Palette Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => togglePalette(e.currentTarget)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-expanded={isPaletteOpen}
              aria-label="Toggle Question Navigation Palette"
            >
              <Grid className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Q {currentQuestionNumber} <span className="text-slate-500 font-normal">/ {totalQuestions}</span></span>
            </button>
          </div>

          {/* Right: Remaining Time */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 text-emerald-400 px-3 py-1.5 min-h-[38px] rounded-lg border border-slate-700/80 font-mono text-xs sm:text-sm font-bold">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{timeRemainingFormatted}</span>
          </div>
        </div>

        {/* High-Visibility Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Container with Optional Question Palette Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Minimal Question Navigation Palette Drawer */}
        {isPaletteOpen && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Question navigation"
            className="absolute inset-y-0 left-0 z-30 w-full sm:w-80 bg-slate-900 border-r border-slate-800 shadow-xl flex flex-col p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Question Navigation
              </span>
              <button
                onClick={closePalette}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Close
              </button>
            </div>

            {/* Status Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-900 ring-2 ring-emerald-400" />
                <span>Current</span>
              </div>
            </div>

            {/* Question Numbers Grid */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
                const isCurrent = num === currentQuestionNumber;
                const isAnswered = !!userAnswers[num];

                return (
                  <button
                    key={num}
                    onClick={() => {
                      if (onSelectQuestionNumber) onSelectQuestionNumber(num);
                      closePalette();
                    }}
                    className={`relative min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-extrabold ring-2 ring-emerald-400 shadow-md'
                        : isAnswered
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50'
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    aria-label={`Go to question ${num}${isAnswered ? ', answered' : ', unanswered'}`}
                  >
                    <span>{num}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Focus Content Body */}
        <main className="flex-1 bg-slate-950 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Focus Mode Footer Navigation Bar */}
      <footer className="min-h-[64px] bg-slate-900 border-t border-slate-800 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between shrink-0">
        <button
          onClick={onPrevQuestion}
          disabled={currentQuestionNumber <= 1}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          onClick={(e) => togglePalette(e.currentTarget)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Grid className="w-3.5 h-3.5 text-emerald-400" />
          <span>Question Grid</span>
        </button>

        {currentQuestionNumber < totalQuestions ? (
          <button
            onClick={onNextQuestion}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSubmitExam}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Exam</span>
          </button>
        )}
      </footer>
    </div>
  );
};


