import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Grid, RotateCcw, XCircle } from 'lucide-react';
import type { ExamLevel, ExamSession, NormalizedQuestionGroup, OptionId, Question } from '@/types';
import {
  buildBooklet,
  computeAnswerCounts,
  computeSectionAnswerCounts,
  isLegacyBooklet,
  navigatorBlocks,
  sectionQuestionNumberMap,
  sectionQuestionOrder,
  sectionTitle,
  type BookletSection,
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
 * Continuous CSE-booklet exam experience — continuous WITHIN a subject, not
 * across the whole exam. A subject tab switcher selects one section at a
 * time; only that section is mounted and scrolled. Previous/Next and the
 * navigator scroll/focus an already-rendered question within the active
 * subject; crossing a subject boundary switches sections deliberately
 * rather than folding everything into one 165-question scroll.
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

  // Structural data is stable for the session's lifetime (only `answers`
  // mutates on every keystroke), so this never re-derives on every answer.
  const sections = useMemo(() => buildBooklet(session), [session.id, session.items, session.questionIds]);
  const isLegacy = isLegacyBooklet(sections);

  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    if (sections.length === 0) return '';
    const withUnanswered = sections.find((sec) =>
      sectionQuestionOrder(sec).some((id) => !session.answers[id])
    );
    return (withUnanswered ?? sections[0]).sectionId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const activeSection: BookletSection | undefined = useMemo(
    () => sections.find((s) => s.sectionId === activeSectionId) ?? sections[0],
    [sections, activeSectionId]
  );

  const localOrder = useMemo(() => (activeSection ? sectionQuestionOrder(activeSection) : []), [activeSection]);
  const localNumbers = useMemo(
    () => (activeSection ? sectionQuestionNumberMap(activeSection) : new Map<string, number>()),
    [activeSection]
  );
  const localCounts = activeSection
    ? computeSectionAnswerCounts(activeSection, session.answers)
    : { total: 0, answered: 0, unanswered: 0 };
  const globalCounts = computeAnswerCounts(session);
  const blocks = useMemo(() => (activeSection ? navigatorBlocks(activeSection) : []), [activeSection]);

  const lastPositionRef = useRef<Record<string, string>>({});
  const pendingTargetRef = useRef<string | null>(null);

  const scrollToQuestion = useCallback((questionId: string, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`#question-${CSS.escape(questionId)}`);
    if (!target) return;
    target.scrollIntoView({ behavior, block: 'start' });
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
    setCurrentQuestionId(questionId);
  }, []);

  // Lands on the right question every time the active section changes —
  // covers first mount, tab switches, and Previous/Next crossing a subject
  // boundary (via pendingTargetRef, which wins over the remembered/first-
  // unanswered default when a boundary crossing set an explicit target).
  useEffect(() => {
    if (!activeSection) return;
    const order = sectionQuestionOrder(activeSection);
    if (order.length === 0) return;

    let target: string;
    if (pendingTargetRef.current && order.includes(pendingTargetRef.current)) {
      target = pendingTargetRef.current;
    } else {
      const remembered = lastPositionRef.current[activeSectionId];
      target =
        remembered && order.includes(remembered)
          ? remembered
          : order.find((id) => !session.answers[id]) ?? order[0];
    }
    pendingTargetRef.current = null;
    scrollToQuestion(target, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId, activeSection]);

  // Scroll-spy within the active section only — the DOM never holds more
  // than one subject's questions at a time.
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
  }, [activeSectionId, activeSection]);

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

  /** Manual subject switch (tab click / navigator jump to another subject's item). */
  const switchSection = useCallback(
    (sectionId: string) => {
      if (sectionId === activeSectionId) return;
      if (currentQuestionId) lastPositionRef.current[activeSectionId] = currentQuestionId;
      setActiveSectionId(sectionId);
    },
    [activeSectionId, currentQuestionId]
  );

  const jumpTo = useCallback(
    (questionId: string) => {
      scrollToQuestion(questionId);
      closeNavigator();
    },
    [scrollToQuestion, closeNavigator]
  );

  const goPrev = useCallback(() => {
    if (!activeSection) return;
    const idx = currentQuestionId ? localOrder.indexOf(currentQuestionId) : -1;
    if (idx > 0) {
      scrollToQuestion(localOrder[idx - 1]);
      return;
    }
    const sectionIdx = sections.findIndex((s) => s.sectionId === activeSectionId);
    if (sectionIdx > 0) {
      const prevSection = sections[sectionIdx - 1];
      const prevOrder = sectionQuestionOrder(prevSection);
      if (prevOrder.length === 0) return;
      if (currentQuestionId) lastPositionRef.current[activeSectionId] = currentQuestionId;
      pendingTargetRef.current = prevOrder[prevOrder.length - 1];
      setActiveSectionId(prevSection.sectionId);
    }
  }, [activeSection, activeSectionId, currentQuestionId, localOrder, scrollToQuestion, sections]);

  const goNext = useCallback(() => {
    if (!activeSection) return;
    const idx = currentQuestionId ? localOrder.indexOf(currentQuestionId) : -1;
    if (idx !== -1 && idx < localOrder.length - 1) {
      scrollToQuestion(localOrder[idx + 1]);
      return;
    }
    const sectionIdx = sections.findIndex((s) => s.sectionId === activeSectionId);
    if (sectionIdx !== -1 && sectionIdx < sections.length - 1) {
      const nextSection = sections[sectionIdx + 1];
      const nextOrder = sectionQuestionOrder(nextSection);
      if (nextOrder.length === 0) return;
      if (currentQuestionId) lastPositionRef.current[activeSectionId] = currentQuestionId;
      pendingTargetRef.current = nextOrder[0];
      setActiveSectionId(nextSection.sectionId);
    }
  }, [activeSection, activeSectionId, currentQuestionId, localOrder, scrollToQuestion, sections]);

  const isFirstSection = sections.findIndex((s) => s.sectionId === activeSectionId) <= 0;
  const isLastSection = sections.findIndex((s) => s.sectionId === activeSectionId) >= sections.length - 1;
  const localIdx = currentQuestionId ? localOrder.indexOf(currentQuestionId) : -1;
  const isPrevDisabled = isFirstSection && localIdx <= 0;
  const isNextDisabled = isLastSection && (localIdx === -1 || localIdx >= localOrder.length - 1);

  const currentLocalNumber = localIdx === -1 ? 1 : localIdx + 1;
  const isProfessional = examLevel === 'Professional';

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
      aria-label={`Submit exam. ${globalCounts.answered} of ${globalCounts.total} answered overall.`}
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

          <div className="flex flex-col items-center justify-self-center min-w-0">{timerBadge}</div>

          <div className="flex items-center gap-2 justify-self-end">
            <button
              ref={navTriggerRef}
              onClick={() => setIsNavigatorOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-expanded={isNavigatorOpen}
              aria-label={`Open question navigation, question ${currentLocalNumber} of ${localOrder.length} in ${sectionTitle(activeSectionId)}, ${examLevel} level session`}
            >
              <Grid className={`w-4 h-4 shrink-0 ${isProfessional ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} aria-hidden="true" />
              <span>
                Q {currentLocalNumber} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {localOrder.length}</span>
              </span>
            </button>
            {submitButton('hidden sm:inline-flex')}
          </div>
        </div>

        {/* Subject tabs — the whole point of this iteration: continuous WITHIN a subject, not across the exam. */}
        {!isLegacy && sections.length > 0 && (
          <div role="tablist" aria-label="Exam subjects" className="flex gap-1.5 overflow-x-auto px-4 sm:px-6 pb-2 pt-1 scrollbar-hide">
            {sections.map((section) => {
              const isActive = section.sectionId === activeSectionId;
              const counts = computeSectionAnswerCounts(section, session.answers);
              return (
                <button
                  key={section.sectionId}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchSection(section.sectionId)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{sectionTitle(section.sectionId)}</span>
                  <span className={isActive ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}>
                    {counts.answered}/{counts.total}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${localCounts.total === 0 ? 0 : Math.round((localCounts.answered / localCounts.total) * 100)}%` }}
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Positioning matches the existing Practice navigator exactly: absolute
            within this body row (flush under the header, no gap), left-anchored,
            same z-index and overlay treatment on both desktop and mobile. */}
        {isNavigatorOpen && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Exam navigator"
            className="absolute inset-y-0 left-0 z-30 w-full sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <span className="flex items-baseline gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {sectionTitle(activeSectionId)}
                <span
                  className={`text-[10px] font-bold tracking-widest ${
                    isProfessional ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                  title={`${examLevel} level session`}
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

            {/* One continuous grid for the active subject. A real multi-question
                group gets a small label above its ids without breaking the grid
                into a vertical stack — singleton legacy questions never get their
                own mini-grid. */}
            <nav aria-label={`${sectionTitle(activeSectionId)} questions`} className="space-y-3">
              {blocks.map((block, blockIndex) => (
                <div key={block.groupId ?? `block-${blockIndex}`}>
                  {block.groupId && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                      {getGroup(block.groupId)?.questionType ?? 'Item Set'}
                    </p>
                  )}
                  <div className="grid grid-cols-5 gap-2">
                    {block.ids.map((id) => {
                      const num = localNumbers.get(id) ?? 0;
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
              ))}
            </nav>
          </div>
        )}

        <main ref={scrollRef} className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="w-full max-w-2xl mx-auto space-y-14 pb-24">
            {activeSection && (
              <SectionRenderer
                section={activeSection}
                getGroup={getGroup}
                questionIndex={questionIndex}
                questionNumbers={localNumbers}
                answers={session.answers}
                onSelectOption={onSelectOption}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile action bar — Previous/Next are secondary scroll/focus controls
          within the active subject; they cross subject boundaries only at the
          very start/end of one, deliberately, never by scrolling past it. */}
      <footer className="sm:hidden min-h-[64px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between shrink-0">
        <button
          onClick={goPrev}
          disabled={isPrevDisabled}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Previous question"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Prev</span>
        </button>
        {submitButton('inline-flex')}
        <button
          onClick={goNext}
          disabled={isNextDisabled}
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
          disabled={isPrevDisabled}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Previous question"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Prev</span>
        </button>
        <button
          onClick={goNext}
          disabled={isNextDisabled}
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
