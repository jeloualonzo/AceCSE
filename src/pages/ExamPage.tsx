import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { Attempt, ExamSession, OptionId, Question, Subject } from '@/types';
import {
  buildGroupPracticeSession,
  buildPracticeSession,
  buildSimulationSession,
  InsufficientBankError,
  subjectsOfSession,
} from '@/lib/examEngine';
import { gradeSession } from '@/lib/grading';
import { loadContentCatalog } from '@/data/questionBank';
import { getEdqItem } from '@/data/edq';
import type { NormalizedContentCatalog } from '@/data/contentCatalog';
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from '@/lib/sessionStorage';
import { saveAttempt } from '@/services/attempts';
import { useAuth } from '@/context/AuthContext';
import { useCountdown } from '@/hooks/useCountdown';
import { formatHMS } from '@/lib/time';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { ExamFocusLayout } from '@/components/shell/ExamFocusLayout';
import { BookletExamLayout } from '@/components/shell/BookletExamLayout';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { PreExamScreen } from '@/components/exam/PreExamScreen';
import { ResultsScreen } from '@/components/exam/ResultsScreen';

/** Launch request passed via router state from Dashboard / Practice pages. */
export interface ExamLaunchRequest {
  kind: 'simulation' | 'practice';
  examLevel: 'Professional' | 'Subprofessional';
  questionCount: number;
  subjects?: Subject[];
  timed?: boolean;
  /** Practice an explicit item set (group) as a whole, in authored order. */
  groupId?: string;
}

type QuestionIndex = ReadonlyMap<string, Question>;

type Stage =
  | { name: 'conflict'; request: ExamLaunchRequest; saved: ExamSession }
  | { name: 'pre'; session: ExamSession }
  | { name: 'active'; session: ExamSession }
  | { name: 'results'; attempt: Attempt; launch: ExamLaunchRequest; edqCount: number }
  | { name: 'error' };

function buildFromRequest(request: ExamLaunchRequest): Promise<ExamSession> {
  if (request.kind === 'simulation') {
    return buildSimulationSession(request.examLevel, request.questionCount);
  }
  if (request.groupId) {
    return buildGroupPracticeSession(request.examLevel, request.groupId);
  }
  return buildPracticeSession(
    request.examLevel,
    request.subjects ?? [],
    request.questionCount,
    request.timed ?? false
  );
}

function launchFromSession(session: ExamSession): ExamLaunchRequest {
  // A group-practice session is exactly one explicit group item — restarts
  // must rebuild the same item set, not a generic subject drill.
  const soleGroup =
    session.config.mode === 'practice' &&
    session.items?.length === 1 &&
    session.items[0].kind === 'group'
      ? session.items[0].groupId
      : undefined;
  return {
    kind: session.config.mode,
    examLevel: session.config.examLevel,
    questionCount: session.config.questionCount,
    subjects: session.config.subjects,
    timed: session.config.timed,
    groupId: soleGroup,
  };
}

function distributionOf(
  session: ExamSession,
  index: QuestionIndex
): Partial<Record<Subject, number>> {
  const distribution: Partial<Record<Subject, number>> = {};
  for (const id of session.questionIds) {
    const question = index.get(id);
    if (!question) continue;
    distribution[question.subject] = (distribution[question.subject] ?? 0) + 1;
  }
  return distribution;
}

function firstUnansweredIndex(session: ExamSession): number {
  const first = session.questionIds.findIndex((id) => !session.answers[id]);
  return first === -1 ? session.questionIds.length - 1 : first;
}

export const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage | null>(null);
  const [questionIndex, setQuestionIndex] = useState<QuestionIndex | null>(null);
  const [catalog, setCatalog] = useState<NormalizedContentCatalog | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  /** Session id already graded — prevents double submission (modal + timer). */
  const finishedRef = React.useRef<string | null>(null);

  const finishWith = useCallback(
    (finished: ExamSession, index: QuestionIndex, completedAt: number = Date.now()) => {
      // Duplicate-submission / timer-race guard: the submit modal and the
      // countdown expiry can both request finishing; only the first wins.
      if (finishedRef.current === finished.id) return;
      finishedRef.current = finished.id;
      // EDQ items are administrative: they are never in `questionIds`, so
      // gradeSession cannot see them and the Firestore Attempt cannot carry
      // them. Count them only for the honest "presented but not scored" note.
      const edqCount = (finished.items ?? []).filter((item) => item.kind === 'administrative').length;
      const attempt = gradeSession(finished, index, completedAt);
      clearActiveSession();
      setIsSubmitModalOpen(false);
      setStage({ name: 'results', attempt, launch: launchFromSession(finished), edqCount });
      if (user) {
        void saveAttempt(user.uid, attempt).catch(() => setSaveError(true));
      }
    },
    [user]
  );

  /**
   * Load the questions (and their normalized groups) a session needs, then
   * enter its stage. Loading via `loadContentCatalog` rather than the old
   * flat `loadQuestionIndex` is additive, not a behavior change: every
   * legacy question becomes a singleton group with no directions/content,
   * and `catalog.questions` is the exact same Map grading already expects.
   */
  const activateSession = useCallback(async (session: ExamSession, entry: 'pre' | 'active') => {
    setStage(null); // loader while chunks arrive (in-memory + HTTP cached after first load)
    try {
      const loadedCatalog = await loadContentCatalog(subjectsOfSession(session));
      setCatalog(loadedCatalog);
      const index = loadedCatalog.questions;
      setQuestionIndex(index);
      if (entry === 'active') {
        saveActiveSession(session);
        setCurrentIndex(firstUnansweredIndex(session));
      }
      setStage(entry === 'pre' ? { name: 'pre', session } : { name: 'active', session });
    } catch {
      setStage({ name: 'error' });
    }
  }, []);

  /** Build a brand-new session from a launch request and activate it. */
  const launchNew = useCallback(
    async (request: ExamLaunchRequest) => {
      setStage(null);
      setSaveError(false);
      try {
        const session = await buildFromRequest(request);
        await activateSession(session, request.kind === 'simulation' ? 'pre' : 'active');
      } catch (error) {
        if (error instanceof InsufficientBankError) {
          navigate(request.kind === 'simulation' ? '/app/simulation' : '/app/practice', {
            replace: true,
          });
          return;
        }
        setStage({ name: 'error' });
      }
    },
    [activateSession, navigate]
  );

  // ---- Session bootstrap: launch request > resumable session > bail out ----
  useEffect(() => {
    if (stage !== null) return;
    const request = (location.state as { launch?: ExamLaunchRequest } | null)?.launch;
    if (request) {
      // Clear router state so a refresh doesn't rebuild a fresh session.
      window.history.replaceState({}, '');
      // Never silently destroy an in-progress session: ask first.
      const existing = loadActiveSession();
      if (existing && (existing.deadlineAt === null || existing.deadlineAt > Date.now())) {
        setStage({ name: 'conflict', request, saved: existing });
        return;
      }
      void launchNew(request);
      return;
    }

    const saved = loadActiveSession();
    if (!saved) {
      navigate('/app/dashboard', { replace: true });
      return;
    }
    if (saved.deadlineAt !== null && saved.deadlineAt <= Date.now()) {
      // Timed out while away: grade honestly with the answers that exist.
      void loadContentCatalog(subjectsOfSession(saved))
        .then((loadedCatalog) => {
          setCatalog(loadedCatalog);
          setQuestionIndex(loadedCatalog.questions);
          finishWith(saved, loadedCatalog.questions, saved.deadlineAt ?? Date.now());
        })
        .catch(() => setStage({ name: 'error' }));
      return;
    }
    void activateSession(saved, 'active');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session =
    stage && (stage.name === 'pre' || stage.name === 'active') ? stage.session : null;

  useDocumentTitle(
    stage?.name === 'results'
      ? 'Results'
      : session?.config.mode === 'practice'
        ? 'Practice Session'
        : 'Exam Simulation'
  );

  const finishSession = useCallback(
    (finished: ExamSession, completedAt: number = Date.now()) => {
      if (!questionIndex) return;
      finishWith(finished, questionIndex, completedAt);
    },
    [finishWith, questionIndex]
  );

  // Deadline-driven countdown (null while untimed).
  const secondsRemaining = useCountdown(
    stage?.name === 'active' ? stage.session.deadlineAt : null,
    () => {
      if (stage?.name === 'active') {
        finishSession(stage.session, stage.session.deadlineAt ?? Date.now());
      }
    }
  );

  // Persist on every mutation.
  const updateSession = useCallback((updater: (prev: ExamSession) => ExamSession) => {
    setStage((prev) => {
      if (!prev || prev.name !== 'active') return prev;
      const next = updater(prev.session);
      saveActiveSession(next);
      return { name: 'active', session: next };
    });
  }, []);

  const currentQuestionId = session?.questionIds[currentIndex];
  const currentQuestion = currentQuestionId ? questionIndex?.get(currentQuestionId) : undefined;

  const answersByNumber = useMemo(() => {
    const map: Record<number, string> = {};
    session?.questionIds.forEach((id, index) => {
      if (session.answers[id]) map[index + 1] = session.answers[id];
    });
    return map;
  }, [session]);

  const startSimulation = useCallback(() => {
    if (stage?.name !== 'pre') return;
    // Reset the clock to the actual start moment.
    const startedAt = Date.now();
    const durationSeconds = stage.session.config.durationSeconds ?? 0;
    const started: ExamSession = {
      ...stage.session,
      startedAt,
      deadlineAt: stage.session.config.timed ? startedAt + durationSeconds * 1000 : null,
    };
    saveActiveSession(started);
    setStage({ name: 'active', session: started });
    setCurrentIndex(0);
  }, [stage]);

  const handleSelectOption = useCallback(
    (optionId: OptionId) => {
      if (!currentQuestionId) return;
      updateSession((prev) => ({
        ...prev,
        answers: { ...prev.answers, [currentQuestionId]: optionId },
      }));
    },
    [currentQuestionId, updateSession]
  );

  /**
   * Booklet mode: every question is mounted at once, so the answer handler
   * takes the question id explicitly rather than relying on `currentIndex`.
   * Still funnels through the same `updateSession` → `saveActiveSession`
   * path as practice's single-question flow.
   */
  const handleSelectOptionFor = useCallback(
    (questionId: string, optionId: OptionId) => {
      updateSession((prev) => ({
        ...prev,
        answers: { ...prev.answers, [questionId]: optionId },
      }));
    },
    [updateSession]
  );

  const getGroup = useCallback(
    (groupId: string) => catalog?.getGroup(groupId),
    [catalog]
  );

  /**
   * Practice grouped-content compatibility: map each question to its
   * EXPLICIT group (never implicit singletons) so Practice can show shared
   * directions/examples once above a group member. Production legacy
   * questions are all singletons, so this is empty until grouped content
   * ships — zero behavior change for them.
   */
  const explicitGroupByQuestion = useMemo(() => {
    const map = new Map<string, { title?: string; directions?: string; example?: string }>();
    if (!catalog) return map;
    for (const group of catalog.groups.values()) {
      if (group.isImplicitSingleton) continue;
      if (!group.directions && !group.example && !group.title) continue;
      for (const qid of group.questionIds) {
        map.set(qid, { title: group.title ?? group.questionType, directions: group.directions, example: group.example });
      }
    }
    return map;
  }, [catalog]);

  /**
   * EDQ responses are OPTIONAL practice input. They persist only inside the
   * local session (localStorage) and are excluded from grading by
   * construction — never sent to Firestore.
   */
  const handleSelectEdq = useCallback(
    (edqItemId: string, option: string) => {
      updateSession((prev) => ({
        ...prev,
        edqAnswers: { ...(prev.edqAnswers ?? {}), [edqItemId]: option },
      }));
    },
    [updateSession]
  );

  const handleToggleEdqMode = useCallback(() => {
    updateSession((prev) => ({ ...prev, edqResponseMode: !prev.edqResponseMode }));
  }, [updateSession]);

  const handleExit = useCallback(() => {
    // The session is persisted; exiting never destroys progress.
    navigate('/app/dashboard');
  }, [navigate]);

  const handleRetake = useCallback(
    (launch: ExamLaunchRequest) => {
      setCurrentIndex(0);
      void launchNew(launch);
    },
    [launchNew]
  );

  if (!stage) {
    return <FullScreenLoader />;
  }

  if (stage.name === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-md w-full text-center"
          role="alert"
        >
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
            Could not load questions
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            The question set for this session could not be downloaded. Check your connection and
            try again — any in-progress session stays saved on this device.
          </p>
          <button
            onClick={() => navigate('/app/dashboard', { replace: true })}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (stage.name === 'conflict') {
    const resumeSaved = () => void activateSession(stage.saved, 'active');
    const discardAndStart = () => {
      clearActiveSession();
      setCurrentIndex(0);
      void launchNew(stage.request);
    };
    const savedMode = stage.saved.config.mode === 'simulation' ? 'simulation' : 'practice session';
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-md w-full"
          role="alertdialog"
          aria-labelledby="conflict-title"
        >
          <h1 id="conflict-title" className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
            You have an unfinished {savedMode}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {Object.keys(stage.saved.answers).length} of {stage.saved.questionIds.length} questions
            answered{stage.saved.deadlineAt ? ' — its timer is still running' : ''}. Starting a new
            session will discard it permanently.
          </p>
          <div className="space-y-3">
            <button
              onClick={resumeSaved}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            >
              Resume Unfinished Session
            </button>
            <button
              onClick={discardAndStart}
              className="w-full min-h-[48px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Discard It and Start New
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage.name === 'pre') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
        <main className="flex-1">
          <PreExamScreen
            examLevel={stage.session.config.examLevel}
            questionCount={stage.session.config.questionCount}
            edqCount={(stage.session.items ?? []).filter((item) => item.kind === 'administrative').length}
            durationSeconds={stage.session.config.durationSeconds ?? 0}
            distribution={questionIndex ? distributionOf(stage.session, questionIndex) : {}}
            isFullExam={false}
            onStartExam={startSimulation}
            onBack={() => navigate('/app/simulation')}
          />
        </main>
      </div>
    );
  }

  if (stage.name === 'results') {
    return (
      <>
        {saveError && (
          <div
            className="bg-amber-500 text-amber-950 text-xs sm:text-sm font-semibold text-center px-4 py-2"
            role="alert"
          >
            This result could not be synced to your account yet. It will remain on screen — check
            your connection and retake later if it does not appear in History.
          </div>
        )}
        <ResultsScreen
          attempt={stage.attempt}
          questionIndex={questionIndex ?? new Map()}
          edqPresented={stage.edqCount}
          onRetake={() => handleRetake(stage.launch)}
          onReturnToDashboard={() => navigate('/app/dashboard')}
        />
      </>
    );
  }

  // Active stage
  const activeSession = stage.session;
  const totalQuestions = activeSession.questionIds.length;
  const answeredCount = Object.keys(activeSession.answers).length;
  const isPractice = activeSession.config.mode === 'practice';

  return (
    <>
      {isPractice ? (
        // Practice keeps its original single-question flow, unchanged.
        <ExamFocusLayout
          examLevel={activeSession.config.examLevel}
          timeRemainingFormatted={
            secondsRemaining !== null ? formatHMS(secondsRemaining) : 'Untimed'
          }
          onExitExam={handleExit}
          onSubmitExam={() => setIsSubmitModalOpen(true)}
          currentQuestionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
          userAnswers={answersByNumber}
          exitLabel="Exit Practice"
          onRestart={() => handleRetake(launchFromSession(activeSession))}
          onSelectQuestionNumber={(num) => setCurrentIndex(num - 1)}
          onPrevQuestion={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          onNextQuestion={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
        >
          {currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              groupContext={explicitGroupByQuestion.get(currentQuestion.id)}
              selectedOptionId={activeSession.answers[currentQuestion.id] ?? null}
              onSelectOption={handleSelectOption}
              instantFeedback
            />
          ) : (
            <div className="text-center text-slate-400 text-sm">Question unavailable.</div>
          )}
        </ExamFocusLayout>
      ) : (
        // Simulation: continuous booklet. Renders every section/group/question
        // from session.items (or a flat fallback for a legacy saved session).
        <BookletExamLayout
          key={activeSession.id}
          examLevel={activeSession.config.examLevel}
          timeRemainingFormatted={
            secondsRemaining !== null ? formatHMS(secondsRemaining) : 'Untimed'
          }
          onExitExam={handleExit}
          onSubmitExam={() => setIsSubmitModalOpen(true)}
          session={activeSession}
          getGroup={getGroup}
          questionIndex={questionIndex ?? new Map()}
          onSelectOption={handleSelectOptionFor}
          edq={{
            getItem: getEdqItem,
            answers: activeSession.edqAnswers ?? {},
            responseMode: activeSession.edqResponseMode ?? false,
            onSelect: handleSelectEdq,
            onToggleResponseMode: handleToggleEdqMode,
          }}
        />
      )}

      {isSubmitModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/60 dark:bg-slate-950/80 flex items-center justify-center p-4 font-sans"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h3 id="submit-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Submit {isPractice ? 'Practice' : 'Exam'}?
              </h3>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 mb-6 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total questions</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Answered</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Unanswered</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{totalQuestions - answeredCount}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Keep Working
              </button>
              <button
                onClick={() => finishSession(activeSession)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
