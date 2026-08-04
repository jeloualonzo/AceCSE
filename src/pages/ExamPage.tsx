import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { Attempt, ExamSession, OptionId, Subject } from '@/types';
import {
  buildPracticeSession,
  buildSimulationSession,
  InsufficientBankError,
} from '@/lib/examEngine';
import { gradeSession } from '@/lib/grading';
import { QUESTION_INDEX } from '@/data/questionBank';
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from '@/lib/sessionStorage';
import { saveAttempt } from '@/services/attempts';
import { useAuth } from '@/context/AuthContext';
import { useCountdown } from '@/hooks/useCountdown';
import { formatHMS } from '@/lib/time';
import { ExamFocusLayout } from '@/components/shell/ExamFocusLayout';
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
}

type Stage =
  | { name: 'conflict'; request: ExamLaunchRequest; saved: ExamSession }
  | { name: 'pre'; session: ExamSession }
  | { name: 'active'; session: ExamSession }
  | { name: 'results'; attempt: Attempt; launch: ExamLaunchRequest };

function buildFromRequest(request: ExamLaunchRequest): ExamSession {
  if (request.kind === 'simulation') {
    return buildSimulationSession(request.examLevel, request.questionCount);
  }
  return buildPracticeSession(
    request.examLevel,
    request.subjects ?? [],
    request.questionCount,
    request.timed ?? false
  );
}

function launchFromSession(session: ExamSession): ExamLaunchRequest {
  return {
    kind: session.config.mode,
    examLevel: session.config.examLevel,
    questionCount: session.config.questionCount,
    subjects: session.config.subjects,
    timed: session.config.timed,
  };
}

function distributionOf(session: ExamSession): Partial<Record<Subject, number>> {
  const distribution: Partial<Record<Subject, number>> = {};
  for (const id of session.questionIds) {
    const question = QUESTION_INDEX.get(id);
    if (!question) continue;
    distribution[question.subject] = (distribution[question.subject] ?? 0) + 1;
  }
  return distribution;
}

export const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // ---- Session bootstrap: launch request > resumable session > bail out ----
  useEffect(() => {
    if (stage !== null) return;
    const request = (location.state as { launch?: ExamLaunchRequest } | null)?.launch;
    if (request) {
      // Never silently destroy an in-progress session: ask first.
      const existing = loadActiveSession();
      if (existing && (existing.deadlineAt === null || existing.deadlineAt > Date.now())) {
        setStage({ name: 'conflict', request, saved: existing });
        window.history.replaceState({}, '');
        return;
      }
      try {
        const session = buildFromRequest(request);
        setStage(request.kind === 'simulation' ? { name: 'pre', session } : { name: 'active', session });
        if (request.kind === 'practice') saveActiveSession(session);
      } catch (error) {
        if (error instanceof InsufficientBankError) {
          navigate(request.kind === 'simulation' ? '/app/simulation' : '/app/practice', {
            replace: true,
          });
          return;
        }
        throw error;
      }
      // Clear router state so a refresh doesn't rebuild a fresh session.
      window.history.replaceState({}, '');
      return;
    }

    const saved = loadActiveSession();
    if (!saved) {
      navigate('/app/dashboard', { replace: true });
      return;
    }
    if (saved.deadlineAt !== null && saved.deadlineAt <= Date.now()) {
      // Timed out while away: grade honestly with the answers that exist.
      finishSession(saved, saved.deadlineAt);
      return;
    }
    setStage({ name: 'active', session: saved });
    // Resume at the first unanswered question.
    const firstUnanswered = saved.questionIds.findIndex((id) => !saved.answers[id]);
    setCurrentIndex(firstUnanswered === -1 ? saved.questionIds.length - 1 : firstUnanswered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session =
    stage && (stage.name === 'pre' || stage.name === 'active') ? stage.session : null;

  const finishSession = useCallback(
    (finished: ExamSession, completedAt: number = Date.now()) => {
      const attempt = gradeSession(finished, QUESTION_INDEX, completedAt);
      clearActiveSession();
      setIsSubmitModalOpen(false);
      setStage({
        name: 'results',
        attempt,
        launch: launchFromSession(finished),
      });
      if (user) {
        void saveAttempt(user.uid, attempt).catch(() => setSaveError(true));
      }
    },
    [user]
  );

  // Deadline-driven countdown (null while untimed).
  const secondsRemaining = useCountdown(
    stage?.name === 'active' ? stage.session.deadlineAt : null,
    () => {
      if (stage?.name === 'active') finishSession(stage.session, stage.session.deadlineAt ?? Date.now());
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
  const currentQuestion = currentQuestionId ? QUESTION_INDEX.get(currentQuestionId) : undefined;

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

  const handleExit = useCallback(() => {
    // The session is persisted; exiting never destroys progress.
    navigate('/app/dashboard');
  }, [navigate]);

  const handleRetake = useCallback(
    (launch: ExamLaunchRequest) => {
      setStage(null);
      setCurrentIndex(0);
      setSaveError(false);
      navigate('/app/exam', { replace: true, state: { launch } });
      // Rebuild directly since the effect above only runs on mount.
      try {
        const rebuilt = buildFromRequest(launch);
        setStage(
          launch.kind === 'simulation' ? { name: 'pre', session: rebuilt } : { name: 'active', session: rebuilt }
        );
        if (launch.kind === 'practice') saveActiveSession(rebuilt);
      } catch {
        navigate('/app/dashboard', { replace: true });
      }
    },
    [navigate]
  );

  if (!stage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  if (stage.name === 'conflict') {
    const resumeSaved = () => {
      const saved = stage.saved;
      setStage({ name: 'active', session: saved });
      const firstUnanswered = saved.questionIds.findIndex((id) => !saved.answers[id]);
      setCurrentIndex(firstUnanswered === -1 ? saved.questionIds.length - 1 : firstUnanswered);
    };
    const discardAndStart = () => {
      clearActiveSession();
      try {
        const session = buildFromRequest(stage.request);
        setStage(
          stage.request.kind === 'simulation' ? { name: 'pre', session } : { name: 'active', session }
        );
        if (stage.request.kind === 'practice') saveActiveSession(session);
        setCurrentIndex(0);
      } catch {
        navigate('/app/dashboard', { replace: true });
      }
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
            durationSeconds={stage.session.config.durationSeconds ?? 0}
            distribution={distributionOf(stage.session)}
            isFullExam={false}
            onStartExam={startSimulation}
            onBack={() => navigate('/app/practice')}
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
          questionIndex={QUESTION_INDEX}
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
      <ExamFocusLayout
        timeRemainingFormatted={
          secondsRemaining !== null ? formatHMS(secondsRemaining) : 'Untimed'
        }
        onExitExam={handleExit}
        onSubmitExam={() => setIsSubmitModalOpen(true)}
        currentQuestionNumber={currentIndex + 1}
        totalQuestions={totalQuestions}
        userAnswers={answersByNumber}
        exitLabel={isPractice ? 'Exit Practice' : 'Exit Exam'}
        onRestart={isPractice ? () => handleRetake(launchFromSession(activeSession)) : undefined}
        onSelectQuestionNumber={(num) => setCurrentIndex(num - 1)}
        onPrevQuestion={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        onNextQuestion={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
      >
        {currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            selectedOptionId={activeSession.answers[currentQuestion.id] ?? null}
            onSelectOption={handleSelectOption}
            instantFeedback={isPractice}
          />
        ) : (
          <div className="text-center text-slate-400 text-sm">Question unavailable.</div>
        )}
      </ExamFocusLayout>

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
