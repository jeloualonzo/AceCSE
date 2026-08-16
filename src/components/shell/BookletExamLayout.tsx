import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Grid, XCircle } from 'lucide-react';
import type { ExamLevel, ExamSession, NormalizedQuestionGroup, OptionId, Question } from '@/types';
import {
  buildBooklet,
  computeAnswerCounts,
  computeSectionAnswerCounts,
  isLegacyBooklet,
  navigatorBlocks,
  sectionItemOrder,
  sectionQuestionOrder,
  sectionShortTitle,
  sectionTitle,
  sessionNumberMap,
  type BookletSection,
} from '@/lib/examViewModel';
import { EDQ_SECTION_ID } from '@/data/edq';
import { SectionRenderer, type EdqRenderContext } from '@/components/exam/booklet/SectionRenderer';

export interface BookletExamLayoutProps {
  examLevel: ExamLevel;
  timeRemainingFormatted: string;
  onExitExam: () => void;
  onSubmitExam: () => void;
  exitLabel?: string;
  session: ExamSession;
  getGroup: (groupId: string) => NormalizedQuestionGroup | undefined;
  questionIndex: ReadonlyMap<string, Question>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  /** Progressive Practice only: append the next internal batch. */
  onLoadMore?: () => void;
  hasMorePractice?: boolean;
  /** EDQ rendering context — present only for sessions that carry an EDQ section. */
  edq?: EdqRenderContext;
}

/**
 * Continuous CSE-booklet exam experience — continuous WITHIN a subject, not
 * across the whole exam. Subject switching lives inside the navigator
 * drawer (not the header), so the header/chrome stays compact: Exit + Submit
 * + Grid/Navigator on the left, Timer centered, and Previous/Next on the right.
 * Only the active section is mounted and scrolled; the navigator drawer shows
 * subject grids so the user can jump straight to any encountered question.
 *
 * Practice and Simulation both use this component. The session mode is
 * passed to scored item renderers so only Practice exposes explanations.
 */
export const BookletExamLayout: React.FC<BookletExamLayoutProps> = ({
  examLevel,
  timeRemainingFormatted,
  onExitExam,
  onSubmitExam,
  exitLabel = 'Exit Exam',
  session,
  getGroup,
  questionIndex,
  onSelectOption,
  onLoadMore,
  hasMorePractice = false,
  edq,
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
    // A brand-new session starts at the very beginning — the EDQ, exactly
    // like the real booklet. A resumed session with scored answers already
    // in progress lands on the first subject with unanswered questions.
    const hasAnyScoredAnswer = Object.keys(session.answers).length > 0;
    if (!hasAnyScoredAnswer) return sections[0].sectionId;
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

  const localOrder = useMemo(() => (activeSection ? sectionItemOrder(activeSection) : []), [activeSection]);
  // SESSION-BASED numbering: one continuous sequence across the whole
  // booklet (EDQ occupies 1–20, first scored item is 21, numbers never
  // reset between subjects). Content ids stay permanent; these numbers are
  // this session's booklet positions.
  const displayNumbers = useMemo(() => sessionNumberMap(sections), [sections]);
  const presentedTotal = displayNumbers.size;
  const globalCounts = computeAnswerCounts(session);

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
  // covers first mount, subject switches, and Previous/Next crossing a
  // subject boundary (via pendingTargetRef, which wins over the remembered/
  // first-unanswered default when a boundary crossing set an explicit target).
  useEffect(() => {
    if (!activeSection) return;
    const order = sectionItemOrder(activeSection);
    if (order.length === 0) return;

    if (!pendingTargetRef.current && currentQuestionId && order.includes(currentQuestionId)) return;

    let target: string;
    if (pendingTargetRef.current && order.includes(pendingTargetRef.current)) {
      target = pendingTargetRef.current;
    } else {
      const remembered = lastPositionRef.current[activeSectionId];
      target =
        remembered && order.includes(remembered)
          ? remembered
          : order.find((id) => !session.answers[id] && !(session.edqAnswers ?? {})[id]) ?? order[0];
    }
    pendingTargetRef.current = null;
    scrollToQuestion(target, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId, activeSection, currentQuestionId]);

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

  const toggleNavigator = (btnEl?: HTMLButtonElement | null) => {
    if (btnEl) navTriggerRef.current = btnEl;
    setIsNavigatorOpen((prev) => {
      const next = !prev;
      if (!next && navTriggerRef.current) setTimeout(() => navTriggerRef.current?.focus(), 0);
      return next;
    });
  };

  useEffect(() => {
    if (!isNavigatorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNavigator();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isNavigatorOpen, closeNavigator]);

  /** Subject-switcher button in the drawer: goes to that subject's remembered/first-unanswered question. */
  const switchSection = useCallback(
    (sectionId: string) => {
      if (sectionId !== activeSectionId) {
        if (currentQuestionId) lastPositionRef.current[activeSectionId] = currentQuestionId;
        setActiveSectionId(sectionId);
      }
      closeNavigator();
    },
    [activeSectionId, currentQuestionId, closeNavigator]
  );

  /** Clicking a specific question number in the drawer — may belong to a non-active subject. */
  const jumpToQuestion = useCallback(
    (sectionId: string, questionId: string) => {
      if (sectionId === activeSectionId) {
        scrollToQuestion(questionId);
      } else {
        if (currentQuestionId) lastPositionRef.current[activeSectionId] = currentQuestionId;
        pendingTargetRef.current = questionId;
        setActiveSectionId(sectionId);
      }
      closeNavigator();
    },
    [activeSectionId, currentQuestionId, scrollToQuestion, closeNavigator]
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
      const prevOrder = sectionItemOrder(prevSection);
      if (prevOrder.length === 0) return;
      if (currentQuestionId) lastPositionRef.current[activeSectionId] = currentQuestionId;
      pendingTargetRef.current = prevOrder[prevOrder.length - 1];
      setActiveSectionId(prevSection.sectionId);
    }
  }, [activeSection, activeSectionId, currentQuestionId, localOrder, scrollToQuestion, sections]);

  const skipEdq = useCallback(() => {
    if (activeSectionId !== EDQ_SECTION_ID) return;
    const edqIndex = sections.findIndex((section) => section.sectionId === EDQ_SECTION_ID);
    const nextScored = sections.slice(Math.max(0, edqIndex + 1)).find((section) => sectionQuestionOrder(section).length > 0);
    if (!nextScored) return;
    const nextOrder = sectionItemOrder(nextScored);
    if (nextOrder.length === 0) return;
    pendingTargetRef.current = nextOrder[0];
    setActiveSectionId(nextScored.sectionId);
  }, [activeSectionId, sections]);

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
      const nextOrder = sectionItemOrder(nextSection);
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
  const isPractice = session.config.mode === 'practice';
  const isPracticeLast = isPractice && isNextDisabled;

  const currentDisplayNumber =
    (currentQuestionId ? displayNumbers.get(currentQuestionId) : undefined) ??
    displayNumbers.get(localOrder[0] ?? '') ??
    1;
  const isProfessional = examLevel === 'Professional';
  const gridIconColor = isProfessional ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400';

  // Same trigger, same two render sites (left of header on desktop, right on
  // mobile) as ExamFocusLayout's paletteButton — this is deliberately the
  // same control in the same place, not a new one.
  const navigatorButton = (displayClasses: string) => (
    <button
      onClick={(e) => toggleNavigator(e.currentTarget)}
      className={`${displayClasses} items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
      aria-expanded={isNavigatorOpen}
      aria-label={isPractice
        ? `Open question navigation, item ${currentDisplayNumber}, in ${sectionTitle(activeSectionId)}, ${examLevel} level practice`
        : `Open question navigation, item ${currentDisplayNumber} of ${presentedTotal}, in ${sectionTitle(activeSectionId)}, ${examLevel} level session`}
    >
      <Grid className={`w-4 h-4 shrink-0 ${gridIconColor}`} aria-hidden="true" />
      <span>
        Q {currentDisplayNumber}
        {!isPractice && <span className="text-slate-400 dark:text-slate-500 font-normal"> / {presentedTotal}</span>}
      </span>
    </button>
  );

  const timerBadge = (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700/80 font-mono text-xs sm:text-sm font-bold">
      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
      <span>{timeRemainingFormatted}</span>
    </div>
  );

  const submitButton = (displayClasses: string) => (
    <button
      onClick={onSubmitExam}
      className={`${displayClasses} items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
      aria-label={`Submit ${isPractice ? 'practice' : 'exam'}. ${globalCounts.answered} of ${globalCounts.total} answered overall.`}
    >
      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
      <span>Submit</span>
    </button>
  );

  const nextButton = (displayClasses: string) => (
    <button
      onClick={goNext}
      disabled={isNextDisabled}
      className={`${displayClasses} items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
      aria-label="Next question"
    >
      <span>Next</span>
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Header — identical layout/positions to Practice's ExamFocusLayout.
          Exit/Submit/Grid stay on the left, Timer centered, Previous/Next
          on the right. Practice has no in-session restart control.
          No subject switcher and no "Question X of Y" text live here. */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative shrink-0">
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
            {submitButton('hidden sm:inline-flex')}
            {navigatorButton('hidden sm:inline-flex')}
          </div>

          <div className="justify-self-center">{timerBadge}</div>

          <div className="flex items-center gap-2 justify-self-end">
            {navigatorButton('inline-flex sm:hidden')}
            <button
              onClick={goPrev}
              disabled={isPrevDisabled}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Previous question"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Previous</span>
            </button>
            {nextButton('hidden sm:inline-flex')}
          </div>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${globalCounts.total === 0 ? 0 : Math.round((globalCounts.answered / globalCounts.total) * 100)}%` }}
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Positioned exactly like Practice's navigator: absolute within this
            body row, flush under the header, left-anchored, same z-index and
            overlay treatment on both desktop and mobile. */}
        {isNavigatorOpen && (
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

            {/* Subject switcher lives HERE, not in the header. 2-column grid. */}
            {!isLegacy && sections.length > 0 && (
              <div className="pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Subjects</h3>
                <div className="grid grid-cols-2 gap-2">
                  {sections.map((section) => {
                    const isActive = section.sectionId === activeSectionId;
                    const counts = computeSectionAnswerCounts(section, session.answers);
                    return (
                      <button
                        key={section.sectionId}
                        onClick={() => switchSection(section.sectionId)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="truncate">{sectionShortTitle(section.sectionId)}</div>
                        {!isPractice && (
                          <div className={isActive ? 'text-emerald-100 font-normal' : 'text-slate-400 dark:text-slate-500 font-normal'}>
                            {section.sectionId === EDQ_SECTION_ID ? 'Not scored' : `${counts.answered}/${counts.total}`}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Every subject's grid, so any question is one click away — a real
                multi-question group still gets its own labeled sub-block, but
                consecutive plain/singleton questions always share one flat grid. */}
            <div className="space-y-5">
              {sections.map((section) => {
                const blocks = navigatorBlocks(section);
                if (blocks.length === 0) return null;
                const order = sectionItemOrder(section);
                const first = displayNumbers.get(order[0] ?? '') ?? 0;
                const last = displayNumbers.get(order[order.length - 1] ?? '') ?? 0;
                return (
                  <div key={section.sectionId}>
                    {!isLegacy && (
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                        {sectionShortTitle(section.sectionId)}
                        {!isPractice && (
                          <span className="text-slate-400 dark:text-slate-500 font-semibold"> {first}–{last}</span>
                        )}
                      </h3>
                    )}
                    <div className="space-y-2">
                      {blocks.map((block, blockIndex) => (
                        <div key={block.groupId ?? block.poolId ?? `${section.sectionId}-block-${blockIndex}`}>
                          <div className="grid grid-cols-5 gap-2">
                            {block.ids.map((id) => {
                              const num = displayNumbers.get(id) ?? 0;
                              const isCurrent = section.sectionId === activeSectionId && id === currentQuestionId;
                              const isAnswered = block.administrative
                                ? Boolean((session.edqAnswers ?? {})[id])
                                : Boolean(session.answers[id]);
                              return (
                                <button
                                  key={id}
                                  onClick={() => jumpToQuestion(section.sectionId, id)}
                                  aria-current={isCurrent ? 'true' : undefined}
                                  className={`relative min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                    isCurrent
                                      ? 'bg-emerald-600 text-white font-extrabold ring-2 ring-emerald-400 shadow-md'
                                      : isAnswered
                                        ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50'
                                        : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                  aria-label={`Go to item ${num} in ${sectionTitle(section.sectionId)}${block.administrative ? ', administrative, not scored' : isAnswered ? ', answered' : ', unanswered'}${isCurrent ? ', current' : ''}`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <main ref={scrollRef} className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="w-full max-w-5xl mx-auto space-y-14 pb-24">
            {!isLegacy && activeSection && (
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {sectionTitle(activeSectionId)}
                </h2>
              </div>
            )}
            {activeSectionId === EDQ_SECTION_ID && edq && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 space-y-3 -mt-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  These are administrative items and are not scored. On exam day, booklet items
                  1–20 ask about the examinee — the test proper starts at item 21. Answering here
                  is optional; nothing you select leaves this device.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={edq.onToggleResponseMode}
                    role="switch"
                    aria-checked={edq.responseMode}
                    className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      edq.responseMode
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {edq.responseMode ? 'EDQ Response Mode: On' : 'Enable EDQ Response Mode'}
                  </button>
                  <button
                    type="button"
                    onClick={edq.onSkip ?? skipEdq}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    aria-label="Skip EDQ and continue to test proper"
                  >
                    <span>Skip EDQ</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            {activeSection && (
              <SectionRenderer
                section={activeSection}
                getGroup={getGroup}
                questionIndex={questionIndex}
                questionNumbers={displayNumbers}
                answers={session.answers}
                onSelectOption={onSelectOption}
                edq={edq ? { ...edq, onSkip: skipEdq } : undefined}
                practiceMode={session.config.mode === 'practice'}
              />
            )}
            {isPractice && onLoadMore && hasMorePractice && (
              <div className="flex justify-center pt-2" data-progressive-practice="true">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  aria-label="Show more Practice questions"
                >
                  Show More
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile-only footer — shared across modes. Practice shows Next until
          the last item and then Submit; Simulation keeps Submit and Next. */}
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
        {isPractice
          ? (isPracticeLast ? submitButton('inline-flex') : nextButton('inline-flex'))
          : <>
              {submitButton('inline-flex')}
              {nextButton('inline-flex')}
            </>}
      </footer>
    </div>
  );
};
