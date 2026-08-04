import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { NavItem } from '../../navigation/navConfig';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AppBottomNav } from './AppBottomNav';
import { ExamFocusLayout } from './ExamFocusLayout';
import { PreExamScreen } from '../exam/PreExamScreen';
import { QuestionCard, QuestionData } from '../exam/QuestionCard';
import { PostExamResultsScreen, EvaluatedQuestion, SubjectPerformance } from '../exam/PostExamResultsScreen';
import { ExamSessionItem } from '../../types';
import { generateExamSession } from '../../lib/examGenerator';

import { DashboardPlaceholder } from '../views/DashboardPlaceholder';
import { PracticePlaceholder } from '../views/PracticePlaceholder';
import { AnalyticsPlaceholder } from '../views/AnalyticsPlaceholder';
import { SettingsPlaceholder } from '../views/SettingsPlaceholder';

interface AppShellProps {
  onReturnToLanding: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ onReturnToLanding }) => {
  const [currentTab, setCurrentTab] = useState<NavItem['id']>('dashboard');
  const [examLevel, setExamLevel] = useState<'Professional' | 'Subprofessional'>('Professional');
  
  // Focus Mode State
  const [examStage, setExamStage] = useState<'idle' | 'pre-exam' | 'active' | 'results'>('idle');
  const [activeExamSession, setActiveExamSession] = useState<ExamSessionItem[]>([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  
  // Timer & Modal State
  const [secondsRemaining, setSecondsRemaining] = useState(11400);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Evaluated Exam Results State
  const [evaluatedResults, setEvaluatedResults] = useState<{
    score: number;
    percentage: number;
    isPassed: boolean;
    subjectBreakdown: SubjectPerformance[];
    evaluatedQuestions: EvaluatedQuestion[];
  } | null>(null);

  const totalQuestions = activeExamSession.length || (examLevel === 'Professional' ? 170 : 165);
  
  const currentItem = activeExamSession[currentQuestionNumber - 1];
  const currentQuestionData: QuestionData = currentItem ? {
    id: currentItem.question.id,
    number: currentItem.itemNumber,
    total: totalQuestions,
    subject: currentItem.question.subject,
    topic: currentItem.question.topic,
    passage: currentItem.question.passage,
    questionText: currentItem.question.question,
    options: currentItem.question.choices,
    correctOptionId: currentItem.question.correctOptionId,
    explanation: currentItem.question.explanation,
  } : {
    id: `q${currentQuestionNumber}`,
    number: currentQuestionNumber,
    total: totalQuestions,
    subject: examLevel === 'Professional' ? 'Numerical Reasoning' : 'Numerical Reasoning',
    questionText: 'Loading question...',
    options: [],
  };

  const handleOpenPreExam = () => {
    setExamStage('pre-exam');
  };

  const handleStartExam = () => {
    const session = generateExamSession(examLevel);
    setActiveExamSession(session);
    setCurrentQuestionNumber(1);
    setUserAnswers({});
    setFlaggedQuestions({});
    setIsSubmitModalOpen(false);
    setEvaluatedResults(null);
    setExamStage('active');
  };

  const handleSelectOption = (optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionNumber]: optionId,
    }));
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQuestionNumber]: !prev[currentQuestionNumber],
    }));
  };

  const handleExitExam = () => {
    if (window.confirm('Are you sure you want to exit the active exam session? Your progress will be saved as draft.')) {
      setExamStage('idle');
      setIsSubmitModalOpen(false);
    }
  };

  const handleDirectSubmit = useCallback(() => {
    // Dynamic Grading Logic using the immutable active session generated at exam launch
    const evaluated: EvaluatedQuestion[] = [];
    let correctCount = 0;

    const subjectsMap: Record<string, { total: number; correct: number }> = {
      'Numerical Reasoning': { total: 0, correct: 0 },
      'Analytical Reasoning': { total: 0, correct: 0 },
      'Verbal Ability': { total: 0, correct: 0 },
      'Clerical Ability': { total: 0, correct: 0 },
      'General Information': { total: 0, correct: 0 },
    };

    activeExamSession.forEach((item) => {
      const num = item.itemNumber;
      const q = item.question;
      const qData: QuestionData = {
        id: q.id,
        number: num,
        total: activeExamSession.length,
        subject: q.subject,
        topic: q.topic,
        passage: q.passage,
        questionText: q.question,
        options: q.choices,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
      };

      const userAnswer = userAnswers[num] || null;
      const isUnanswered = !userAnswer;
      const isCorrect = userAnswer === q.correctOptionId;
      const isFlagged = !!flaggedQuestions[num];

      if (isCorrect) {
        correctCount++;
      }

      if (!subjectsMap[q.subject]) {
        subjectsMap[q.subject] = { total: 0, correct: 0 };
      }
      subjectsMap[q.subject].total += 1;
      if (isCorrect) {
        subjectsMap[q.subject].correct += 1;
      }

      evaluated.push({
        question: qData,
        userAnswer,
        isCorrect,
        isUnanswered,
        isFlagged,
      });
    });

    const totalCount = activeExamSession.length || 1;
    const percentage = Math.round((correctCount / totalCount) * 100);
    const isPassed = percentage >= 80;

    const subjectBreakdown: SubjectPerformance[] = Object.entries(subjectsMap)
      .filter(([_, data]) => data.total > 0)
      .map(([subject, data]) => ({
        subject,
        total: data.total,
        correct: data.correct,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }));

    setEvaluatedResults({
      score: correctCount,
      percentage,
      isPassed,
      subjectBreakdown,
      evaluatedQuestions: evaluated,
    });

    setIsSubmitModalOpen(false);
    setExamStage('results');
  }, [activeExamSession, userAnswers, flaggedQuestions]);

  const directSubmitRef = useRef(handleDirectSubmit);
  useEffect(() => {
    directSubmitRef.current = handleDirectSubmit;
  }, [handleDirectSubmit]);

  // Live Timer Effect
  useEffect(() => {
    if (examStage !== 'active') return;

    const initialSecs = examLevel === 'Professional' ? 11400 : 9600;
    setSecondsRemaining(initialSecs);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          directSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStage, examLevel]);

  const formatTimeHHMMSS = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  // If in Pre-Exam instruction screen
  if (examStage === 'pre-exam') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        <AppHeader
          onReturnToLanding={onReturnToLanding}
          examLevel={examLevel}
          onToggleExamLevel={(lvl) => setExamLevel(lvl)}
        />
        <main className="flex-1">
          <PreExamScreen
            examLevel={examLevel}
            onStartExam={handleStartExam}
            onBackToDashboard={() => setExamStage('idle')}
          />
        </main>
      </div>
    );
  }

  // If in Post-Exam Results Screen
  if (examStage === 'results' && evaluatedResults) {
    return (
      <PostExamResultsScreen
        examTitle={`Civil Service Exam - ${examLevel} Scope`}
        totalQuestions={totalQuestions}
        score={evaluatedResults.score}
        percentage={evaluatedResults.percentage}
        isPassed={evaluatedResults.isPassed}
        subjectBreakdown={evaluatedResults.subjectBreakdown}
        evaluatedQuestions={evaluatedResults.evaluatedQuestions}
        onRetake={handleStartExam}
        onReturnToDashboard={() => setExamStage('idle')}
      />
    );
  }

  // If active exam mode, completely bypass header/sidebar/bottomnav for total focus
  if (examStage === 'active') {
    return (
      <>
        <ExamFocusLayout
          examTitle={`Civil Service Exam - ${examLevel} Scope`}
          currentSubject={currentQuestionData.subject}
          timeRemainingFormatted={formatTimeHHMMSS(secondsRemaining)}
          onExitExam={handleExitExam}
          onSubmitExam={() => setIsSubmitModalOpen(true)}
          currentQuestionNumber={currentQuestionNumber}
          totalQuestions={totalQuestions}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          onSelectQuestionNumber={(num) => setCurrentQuestionNumber(num)}
          onPrevQuestion={() => setCurrentQuestionNumber((prev) => Math.max(1, prev - 1))}
          onNextQuestion={() => setCurrentQuestionNumber((prev) => Math.min(totalQuestions, prev + 1))}
        >
          <QuestionCard
            question={currentQuestionData}
            selectedOptionId={userAnswers[currentQuestionNumber] || null}
            isFlagged={!!flaggedQuestions[currentQuestionNumber]}
            onSelectOption={handleSelectOption}
            onToggleFlag={handleToggleFlag}
          />
        </ExamFocusLayout>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-100">
              <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <h3 id="submit-modal-title" className="text-lg font-bold text-white">
                  Submit Exam Confirmation
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                Are you sure you want to finalize and submit your exam? Please verify your progress below:
              </p>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400 font-medium">Total Questions</span>
                  <span className="font-bold text-white">{totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400 font-medium">Answered Questions</span>
                  <span className="font-bold text-emerald-400">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400 font-medium">Unanswered Questions</span>
                  <span className="font-bold text-amber-400">{unansweredCount}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDirectSubmit}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. App Header */}
      <AppHeader
        onReturnToLanding={onReturnToLanding}
        examLevel={examLevel}
        onToggleExamLevel={(lvl) => setExamLevel(lvl)}
      />

      {/* 2. Main Body Layout (Sidebar + Canvas) */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <AppSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          examLevel={examLevel}
        />

        {/* Dynamic Route View Content */}
        <div className="flex-1 overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardPlaceholder onStartExam={handleOpenPreExam} examLevel={examLevel} />
          )}
          {currentTab === 'practice' && (
            <PracticePlaceholder onStartExam={handleOpenPreExam} examLevel={examLevel} />
          )}
          {currentTab === 'history' && (
            <AnalyticsPlaceholder examLevel={examLevel} onStartExam={handleOpenPreExam} />
          )}
          {currentTab === 'settings' && (
            <SettingsPlaceholder
              examLevel={examLevel}
              onToggleExamLevel={(lvl) => setExamLevel(lvl)}
            />
          )}
        </div>
      </div>

      {/* 3. Mobile Bottom Navigation */}
      <AppBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />
    </div>
  );
};

