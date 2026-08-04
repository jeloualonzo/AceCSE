import React, { useState, useEffect } from 'react';
import { SAMPLE_QUESTIONS } from '../data/landingData';
import { ShieldCheck, Clock, Flag, ChevronLeft, ChevronRight, X, Lightbulb, RotateCcw, Award, Grid } from 'lucide-react';

interface ActiveSimulatorViewProps {
  level: 'Professional' | 'Subprofessional';
  mode: 'simulation' | 'practice';
  subjectScope: string;
  onExit: () => void;
}

export const ActiveSimulatorView: React.FC<ActiveSimulatorViewProps> = ({
  level,
  mode,
  subjectScope,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(mode === 'practice');
  const [secondsRemaining, setSecondsRemaining] = useState(3 * 3600 + 10 * 60);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isSubmitted || mode === 'practice') return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, mode]);

  const questions = SAMPLE_QUESTIONS;
  const currentQ = questions[currentIndex] || questions[0];

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  const toggleFlag = () => {
    setFlaggedIds((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    });
    return {
      correctCount,
      totalCount: questions.length,
      percentage: Math.round((correctCount / questions.length) * 100),
      passed: (correctCount / questions.length) * 100 >= 80,
    };
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scoreResult = calculateScore();

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-300 shadow-md p-8">
          
          <div className="text-center pb-6 border-b border-slate-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Exam Simulation Complete
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Civil Service Examination — {level} Level
            </p>
          </div>

          <div className="py-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Your Score</span>
              <span className="text-3xl font-extrabold text-slate-900">{scoreResult.percentage}%</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Correct Items</span>
              <span className="text-3xl font-extrabold text-slate-900">{scoreResult.correctCount} / {scoreResult.totalCount}</span>
            </div>

            <div className={`p-4 rounded-lg border ${scoreResult.passed ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
              <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Status (80% Pass Mark)</span>
              <span className={`text-2xl font-extrabold ${scoreResult.passed ? 'text-emerald-800' : 'text-amber-800'}`}>
                {scoreResult.passed ? 'PASSED' : 'NEEDS PRACTICE'}
              </span>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200">
              Detailed Question Rationale Review
            </h3>

            {questions.map((q, idx) => {
              const uAns = userAnswers[q.id];
              const isCorrect = uAns === q.correctOptionId;
              return (
                <div key={q.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Item {idx + 1} ({q.category})</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 font-medium mb-3">{q.question}</p>
                  <div className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200">
                    <span className="font-bold text-emerald-800">Explanation: </span>
                    {q.explanation.summary}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setIsSubmitted(false);
                setUserAnswers({});
                setCurrentIndex(0);
              }}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Practice</span>
            </button>

            <button
              onClick={onExit}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <span>Return to Landing Page</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* Top Bar */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">
              AceCSE Simulator — {level} Level
            </h1>
            <p className="text-xs text-slate-400 capitalize">{mode} mode • Item {currentIndex + 1} of {questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'simulation' && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded text-xs font-mono border border-slate-700">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-bold">{formatTimer(secondsRemaining)}</span>
            </div>
          )}

          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors cursor-pointer"
          >
            <Grid className="w-4 h-4 text-emerald-400" />
            <span>Grid</span>
          </button>

          <button
            onClick={onExit}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Exit Exam</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative">
        
        {/* Minimal Question Navigation Palette Drawer */}
        {isPaletteOpen && (
          <div className="absolute top-2 left-4 right-4 z-30 bg-slate-900 text-white border border-slate-800 rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Question Navigation
              </span>
              <button
                onClick={() => setIsPaletteOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Status Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-3 border-b border-slate-800 mb-3">
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

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-60 overflow-y-auto">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!userAnswers[q.id];
                const isFlagged = !!flaggedIds[q.id];

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPaletteOpen(false);
                    }}
                    className={`relative min-h-[36px] rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-extrabold ring-2 ring-emerald-400 shadow-md'
                        : isAnswered
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50'
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Question Container */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 sm:p-8 mb-6">
          
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              {currentQ.category}
            </span>
            <button
              onClick={toggleFlag}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border cursor-pointer ${
                flaggedIds[currentQ.id]
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${flaggedIds[currentQ.id] ? 'fill-amber-500 text-amber-600' : ''}`} />
              <span>{flaggedIds[currentQ.id] ? 'Flagged' : 'Flag Question'}</span>
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-6 whitespace-pre-line">
            {currentQ.question}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt) => {
              const isSelected = userAnswers[currentQ.id] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {opt.id}
                  </div>
                  <span className={`text-sm ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    {opt.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Instant Rationale for Practice Mode */}
          {mode === 'practice' && userAnswers[currentQ.id] && (
            <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-slate-800">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-4 h-4 text-emerald-700" />
                <span>Instant Answer Explanation:</span>
              </div>
              <p className="mb-2 text-slate-700">{currentQ.explanation.summary}</p>
              <div className="p-2 bg-white rounded border border-emerald-200 font-medium text-xs">
                <strong>Key Rule: </strong> {currentQ.explanation.keyTakeaway}
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-white rounded-xl border border-slate-300 p-4 flex items-center justify-between gap-4 shadow-sm">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <span>Next Item</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitted(true)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                <span>Submit Exam</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
