import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ListTree, RotateCcw, XCircle } from 'lucide-react';
import type { ExamLevel, ExamSession, NormalizedQuestionGroup, OptionId, Question } from '@/types';
import {
  bookletQuestionOrder,
  buildBooklet,
  computeAnswerCounts,
  isLegacyBooklet,
  questionNumberMap,
  sectionTitle,
} from '@/lib/examViewModel';
import { SectionRenderer } from '@/components/exam/booklet/SectionRenderer';

export interface BookletExamLayoutProps {
  examLevel: ExamLevel;
  timeRemainingFormatted: string;
  onExitExam: () => void;
  onSubmitExam: () => void;
  onRestart?: () => void;
  exitLabel?: string;
  session: ExamSession;
  getGroup: (groupId: string) => NormalizedQuestionGroup | undefined;
  questionIndex: ReadonlyMap<string, Question>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
}

/**
 * Continuous CSE-booklet exam experience: read straight through directions,
 * groups, and questions instead of paging one question at a time. Previous
 * question, Next question, and the navigator all SCROLL/FOCUS an already-
 * rendered question — none of them change what's mounted. Answer state
 * stays entirely in `session.answers`, owned by the caller.
 *
 * Practice mode does not use this component — it keeps the original
 * `ExamFocusLayout` + `QuestionCard` single-question flow unchanged.
 */
export const BookletExamLayout: React.FC<BookletExamLayoutProps> = ({
  examLevel,
  timeRemainingFormatted,
  onExitExam,
  onSubmitExam,
  onRestart,
  exitLabel = 'Exit Exam',
  session,
  getGroup,
  questionIndex,
  onSelectOption,
}) => {
  const scrollRef = useRef<HTMLElement | null>(null);
  const navTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const hasScrolledToInitial = useRef(false);

  // Structural data is stable for the session's lifetime (only `answers`
  // mutates on every keystroke), so this never re-derives on every answer.
  const sections = useMemo(() => buildBooklet(session), [session.id, session.items, session.questionIds]);
  const showHeadings = !isLegacyBooklet(sections);
  const order = useMemo(() => bookletQuestionOrder(sections), [sections]);
  const numbers = useMemo(() => questionNumberMap(sections), [sections]);
  const counts = computeAnswerCounts(session);

  const scrollToQuestion = useCallback((questionId: string, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`#question-${CSS.escape(questionId)}`);
    if (!target) return;
    target.scrollIntoView({ behavior, block: 'start' });
    // scrollIntoView is synchronous w.r.t. layout; give the browser one frame
    // before moving focus so it doesn't fight the scroll animation.
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
    setCurrentQuestionId(questionId);
  }, []);

  // On first mount, land on the first unanswered question (or the first
  // question if everything is answered) without an animated scroll.
  useEffect(() => {
    if (hasScrolledToInitial.current || order.length === 0) return;
    hasScrolledToInitial.current = true;
    const target = order.find((id) => !session.answers[id]) ?? order[0];
    scrollToQuestion(target, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Scroll-spy: track whichever question is nearest the top of the visible
  // area so the header/navigator can show "current" without re-rendering
  // the whole booklet on every scroll frame.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-question-id]'));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((best, entry) =>
          entry.boundingClientRect.top < best.boundingClientRect.top ? entry : best
        );
        const id = topmost.target.getAttribute('data-question-id');
        if (id) setCurrentQuestionId(id);
      },
      { root: container, rootMargin: '0px 0px -70% 0px', threshold: [0, 1] }
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  const isProfessional = examLevel === 'Professional';

  const currentIndex = currentQuestionId ? order.indexOf(currentQuestionId) : -1;
  const currentNumber = currentIndex === -1 ? 1 : currentIndex + 1;
  const currentSectionId = useMemo(() => {
    if (!currentQuestionId) return null;
    for (const section of sections) {
      for (const node of section.nodes) {
        if (node.kind === 'question' && node.questionId === currentQuestionId) return section.sectionId;
        if (node.kind === 'group' && node.questionIds.includes(currentQuestionId)) return section.sectionId;
      }
    }
    return null;
  }, [currentQuestionId, sections]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) scrollToQuestion(order[currentIndex - 1]);
  }, [currentIndex, order, scrollToQuestion]);

  const goNext = useCallback(() => {
    if (currentIndex !== -1 && currentIndex < order.length - 1) scrollToQuestion(order[currentIndex + 1]);
  }, [currentIndex, order, scrollToQuestion]);

  const closeNavigator = useCallback(() => {
    setIsNavigatorOpen(false);
    setTimeout(() => navTriggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!isNavigatorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNavigator();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isNavigatorOpen, closeNavigator]);

  const jumpTo = useCallback(
    (questionId: string) => {
      scrollToQuestion(questionId);
      closeNavigator();
    },
    [scrollToQuestion, closeNavigator]
  );

  const timerBadge = (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700/80 font-mono text-xs sm:text-sm font-bold">
      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
      <span>{timeRemainingFormatted}</span>
    </div>
  );

  const submitButton = (className: string) => (
    <button
      onClick={onSubmitExam}
      className={`${className} items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
      aria-label={`Submit exam. ${counts.answered} of ${counts.total} answered.`}
    >
      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
      <span>Submit</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Sticky header — Submit is ALWAYS enabled here, never gated on reaching the last question. */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="h-14 sm:h-16 px-4 sm:px-6 grid grid-cols-3 items-center">
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
          </div>

          <div className="flex flex-col items-center justify-self-center min-w-0">
            {timerBadge}
          </div>

          <div className="flex items-center gap-2 justify-self-end">
            <button
              ref={navTriggerRef}
              onClick={() => setIsNavigatorOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-expanded={isNavigatorOpen}
              aria-label={`Open navigator. Question ${currentNumber} of ${order.length}. ${counts.answered} answered, ${counts.unanswered} unanswered.`}
            >
              <ListTree className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>
                {counts.answered}<span className="text-slate-400 dark:text-slate-500 font-normal">/{counts.total}</span>
              </span>
            </button>
            {submitButton('hidden sm:inline-flex')}
          </div>
        </div>

        {currentSectionId && showHeadings && (
          <div className="px-4 sm:px-6 pb-2 -mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">
            {sectionTitle(currentSectionId)} &middot; Question {currentNumber} of {order.length}
          </div>
        )}

        <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${counts.total === 0 ? 0 : Math.round((counts.answered / counts.total) * 100)}%` }}
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {isNavigatorOpen && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Exam navigator"
            className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-30 w-full sm:w-96 max-h-[80vh] sm:max-h-none sm:h-full rounded-t-2xl sm:rounded-none bg-white dark:bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0">
              <span className="flex items-baseline gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Navigator
                <span
                  className={`text-[10px] font-bold tracking-widest ${
                    isProfessional ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                  title={`${examLevel} level session`}
                  aria-label={`${examLevel} level session`}
                >
                  {isProfessional ? 'PRO' : 'SUBPRO'}
                </span>
              </span>
              <button
                onClick={closeNavigator}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0">
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

            <nav aria-label="Sections and questions">
              {sections.map((section) => (
                <div key={section.sectionId} className="mb-5">
                  {showHeadings && (
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                      {sectionTitle(section.sectionId)}
                    </h3>
                  )}
                  {section.nodes.map((node, nodeIndex) => {
                    if (node.kind === 'administrative') {
                      return (
                        <p key={`admin-${nodeIndex}`} className="text-[11px] italic text-slate-400 dark:text-slate-500 mb-3">
                          {node.id} (not scored)
                        </p>
                      );
                    }
                    const ids = node.kind === 'group' ? node.questionIds : [node.questionId];
                    const group = node.kind === 'group' ? getGroup(node.groupId) : undefined;
                    return (
                      <div key={`nav-${nodeIndex}`} className="mb-3">
                        {group?.questionType && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                            {group.questionType}
                          </p>
                        )}
                        <div className="grid grid-cols-5 gap-2">
                          {ids.map((id) => {
                            const num = numbers.get(id) ?? 0;
                            const isCurrent = id === currentQuestionId;
                            const isAnswered = Boolean(session.answers[id]);
                            return (
                              <button
                                key={id}
                                onClick={() => jumpTo(id)}
                                aria-current={isCurrent ? 'true' : undefined}
                                className={`relative min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                  isCurrent
                                    ? 'bg-emerald-600 text-white font-extrabold ring-2 ring-emerald-400 shadow-md'
                                    : isAnswered
                                      ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50'
                                      : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                aria-label={`Go to question ${num}${isAnswered ? ', answered' : ', unanswered'}${isCurrent ? ', current' : ''}`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        )}

        <main ref={scrollRef} className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="w-full max-w-2xl mx-auto space-y-14 pb-24">
            {sections.map((section, index) => (
              <SectionRenderer
                key={section.sectionId}
                section={section}
                sectionNumber={index + 1}
                totalSections={sections.length}
                getGroup={getGroup}
                questionIndex={questionIndex}
                questionNumbers={numbers}
                answers={session.answers}
                onSelectOption={onSelectOption}
                showHeading={showHeadings}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Mobile action bar — Previous/Next are secondary scroll/focus controls, never what determines the rendered question. Submit stays reachable without scrolling back to the header. */}
      <footer className="sm:hidden min-h-[64px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between shrink-0">
        <button
          onClick={goPrev}
          disabled={currentIndex <= 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Previous question"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Prev</span>
        </button>
        {submitButton('inline-flex')}
        <button
          onClick={goNext}
          disabled={currentIndex === -1 || currentIndex >= order.length - 1}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Next question"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </footer>

      {/* Desktop Previous/Next — secondary, floats above the bottom-right of the scroll area. */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-20 items-center gap-2">
        <button
          onClick={goPrev}
          disabled={currentIndex <= 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Previous question"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Prev</span>
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === -1 || currentIndex >= order.length - 1}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Next question"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
