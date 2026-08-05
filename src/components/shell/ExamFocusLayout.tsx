import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Grid,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { ExamLevel } from '@/types';

interface ExamFocusLayoutProps {
  /**
   * The SESSION's examination level (never the current preference) — a
   * resumed session keeps its own level. Indicated quietly: the grid icon
   * is emerald for Professional, neutral for Subprofessional, and the
   * navigation drawer carries a small muted PRO/SUBPRO label.
   */
  examLevel: ExamLevel;
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

/**
 * Distraction-free exam chrome.
 *
 * Desktop: everything lives in the header — question indicator (left),
 * timer (center), Previous/Next/Submit (right). No footer.
 * Mobile: timer is centered in the header (it deserves the attention);
 * navigation stays in a thumb-friendly footer.
 */
export const ExamFocusLayout: React.FC<ExamFocusLayoutProps> = ({
  examLevel,
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
  const scrollRef = useRef<HTMLElement | null>(null);
  const isLastQuestion = currentQuestionNumber >= totalQuestions;
  const progressPercent = Math.min(100, Math.round((currentQuestionNumber / totalQuestions) * 100));

  // Every question starts at the top — never hidden under the header.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentQuestionNumber]);

  const togglePalette = (btnEl?: HTMLButtonElement | null) => {
    if (btnEl) triggerButtonRef.current = btnEl;
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

  useEffect(() => {
    if (!isPaletteOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePalette();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen]);

  /**
   * Question navigation trigger. Rendered exactly once per breakpoint: on the
   * left of the header on desktop, on the right on mobile.
   *
   * `displayClasses` MUST carry the display utility. It is deliberately absent
   * from the base string: Tailwind emits `.inline-flex` after `.hidden`, so an
   * element carrying both `inline-flex` and `hidden` resolves to inline-flex and
   * the "hidden" instance renders anyway — which is how this button previously
   * appeared twice on mobile.
   */
  // The grid icon doubles as the session-level indicator: emerald accent for
  // Professional, neutral for Subprofessional. Quiet enough to ignore,
  // instant for anyone who knows the mapping.
  const isProfessional = examLevel === 'Professional';
  const gridIconColor = isProfessional
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-slate-500 dark:text-slate-400';

  const paletteButton = (displayClasses: string) => (
    <button
      onClick={(e) => togglePalette(e.currentTarget)}
      className={`${displayClasses} items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
      aria-expanded={isPaletteOpen}
      aria-label={`Open question navigation, question ${currentQuestionNumber} of ${totalQuestions}, ${examLevel} level session`}
    >
      <Grid className={`w-4 h-4 shrink-0 ${gridIconColor}`} aria-hidden="true" />
      <span>
        Q {currentQuestionNumber} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {totalQuestions}</span>
      </span>
    </button>
  );

  const timerBadge = (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700/80 font-mono text-xs sm:text-sm font-bold">
      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
      <span>{timeRemainingFormatted}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative shrink-0">
        <div className="h-14 sm:h-16 px-4 sm:px-6 grid grid-cols-3 items-center">
          {/* Left: exit (+restart) + question indicator on desktop */}
          <div className="flex items-center gap-2 justify-self-start">
            <button
              onClick={onExitExam}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label={exitLabel}
            >
              <XCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span className="hidden sm:inline">{exitLabel}</span>
            </button>
            {onRestart && (
              <button
                onClick={onRestart}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span>Restart</span>
              </button>
            )}
            {paletteButton('hidden sm:inline-flex')}
          </div>

          {/* Center: the timer — most important element in an exam */}
          <div className="justify-self-center">{timerBadge}</div>

          {/* Right: desktop navigation / mobile question-palette trigger */}
          <div className="flex items-center gap-2 justify-self-end">
            {paletteButton('inline-flex sm:hidden')}
            <button
              onClick={onPrevQuestion}
              disabled={currentQuestionNumber <= 1}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Previous</span>
            </button>
            {isLastQuestion ? (
              <button
                onClick={onSubmitExam}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Submit</span>
              </button>
            ) : (
              <button
                onClick={onNextQuestion}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Body with optional palette drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {isPaletteOpen && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Question navigation"
            className="absolute inset-y-0 left-0 z-30 w-full sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <span className="flex items-baseline gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Question Navigation
                <span
                  className={`text-[10px] font-bold tracking-widest ${
                    isProfessional
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  title={`${examLevel} level session`}
                  aria-label={`${examLevel} level session`}
                >
                  {isProfessional ? 'PRO' : 'SUBPRO'}
                </span>
              </span>
              <button
                onClick={closePalette}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white dark:bg-slate-900 ring-2 ring-emerald-400" />
                <span>Current</span>
              </div>
            </div>

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
                          ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50'
                          : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    aria-label={`Go to question ${num}${isAnswered ? ', answered' : ', unanswered'}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/*
          Content area. Note: never `items-center` on an overflow container —
          content taller than the viewport gets clipped above the scroll area.
          Auto margins on the child center it safely instead.
        */}
        <main
          ref={scrollRef}
          className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto lg:overflow-hidden p-4 sm:p-6 lg:p-8 flex"
        >
          <div className="w-full max-w-3xl lg:max-w-7xl mx-auto my-auto lg:my-0 lg:h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile-only footer navigation */}
      <footer className="sm:hidden min-h-[64px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between shrink-0">
        <button
          onClick={onPrevQuestion}
          disabled={currentQuestionNumber <= 1}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Previous</span>
        </button>

        {onRestart && (
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Restart</span>
          </button>
        )}

        {isLastQuestion ? (
          <button
            onClick={onSubmitExam}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Submit</span>
          </button>
        ) : (
          <button
            onClick={onNextQuestion}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </footer>
    </div>
  );
};
