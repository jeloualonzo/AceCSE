import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, PlayCircle, Timer } from 'lucide-react';
import type { Subject } from '@/types';
import { PRACTICE_SIZES, SUBJECTS_BY_LEVEL } from '@/config/exam';
import { simulationOptions, subjectAvailability } from '@/lib/examEngine';
import { formatDuration } from '@/lib/time';
import { useAppContext } from '@/components/shell/AppLayout';
import type { ExamLaunchRequest } from '@/pages/ExamPage';

export const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const { examLevel } = useAppContext();

  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [practiceSize, setPracticeSize] = useState<number>(PRACTICE_SIZES[0]);
  const [practiceTimed, setPracticeTimed] = useState(false);

  const options = useMemo(() => simulationOptions(examLevel), [examLevel]);
  const availability = useMemo(() => subjectAvailability(examLevel), [examLevel]);

  const toggleSubject = (subject: Subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const selectedSupply = selectedSubjects.reduce((sum, s) => sum + availability[s], 0);
  const effectiveSize = Math.min(practiceSize, selectedSupply);
  const canStartPractice = selectedSubjects.length > 0 && effectiveSize > 0;

  const launch = (request: ExamLaunchRequest) => navigate('/app/exam', { state: { launch: request } });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Practice & Exam</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Timed simulations follow official CSC subject proportions. Sizes unlock as the validated
          question bank grows — questions are never repeated or relabeled to fake a longer exam.
        </p>
      </div>

      {/* Timed simulations */}
      <section aria-labelledby="simulations-heading" className="space-y-4">
        <h2 id="simulations-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Timed Simulations — {examLevel} Level
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {options.map((option) => (
            <div
              key={option.questionCount}
              className={`rounded-xl border p-5 flex flex-col ${
                option.available
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50 border-dashed border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {option.questionCount}
                </span>
                {option.isFullExam && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Full Exam
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">questions</p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-4">
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {formatDuration(option.durationSeconds)}
              </p>
              {option.available ? (
                <button
                  onClick={() =>
                    launch({
                      kind: 'simulation',
                      examLevel,
                      questionCount: option.questionCount,
                    })
                  }
                  className="mt-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <PlayCircle className="w-4 h-4" aria-hidden="true" />
                  Start
                </button>
              ) : (
                <div className="mt-auto">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    Locked
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Needs more validated {option.missingSubjects.join(', ')} questions.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Subject practice */}
      <section aria-labelledby="practice-heading" className="space-y-4">
        <div>
          <h2 id="practice-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Subject Practice
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Instant feedback and explanations after every answer. Untimed by default.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUBJECTS_BY_LEVEL[examLevel].map((subject) => {
            const isSelected = selectedSubjects.includes(subject);
            const supply = availability[subject];
            const isEmpty = supply === 0;
            return (
              <button
                key={subject}
                onClick={() => !isEmpty && toggleSubject(subject)}
                disabled={isEmpty}
                aria-pressed={isSelected}
                className={`text-left rounded-xl border p-4 min-h-[64px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isEmpty
                    ? 'bg-slate-50 border-dashed border-slate-300 cursor-not-allowed'
                    : isSelected
                      ? 'bg-emerald-50 border-emerald-500 border-2 cursor-pointer'
                      : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-bold ${isEmpty ? 'text-slate-400' : 'text-slate-900'}`}
                  >
                    {subject}
                  </span>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isEmpty ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {supply} available
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <fieldset>
              <legend className="text-xs font-semibold text-slate-500 mb-2">Questions</legend>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Number of questions">
                {PRACTICE_SIZES.map((size) => (
                  <button
                    key={size}
                    role="radio"
                    aria-checked={practiceSize === size}
                    onClick={() => setPracticeSize(size)}
                    className={`min-w-[52px] min-h-[40px] rounded-lg text-sm font-bold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      practiceSize === size
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2" id="timer-label">
                Timer
              </p>
              <button
                role="switch"
                aria-checked={practiceTimed}
                aria-labelledby="timer-label"
                onClick={() => setPracticeTimed((t) => !t)}
                className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  practiceTimed
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-300 text-slate-600'
                }`}
              >
                <Timer className="w-4 h-4" aria-hidden="true" />
                {practiceTimed ? '1 min per question' : 'Untimed'}
              </button>
            </div>
          </div>

          {selectedSubjects.length > 0 && effectiveSize < practiceSize && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Only {selectedSupply} unique questions are available in the selected subject
              {selectedSubjects.length > 1 ? 's' : ''} right now, so this session will have{' '}
              {effectiveSize} questions.
            </p>
          )}

          <button
            onClick={() =>
              canStartPractice &&
              launch({
                kind: 'practice',
                examLevel,
                questionCount: effectiveSize,
                subjects: selectedSubjects,
                timed: practiceTimed,
              })
            }
            disabled={!canStartPractice}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            <PlayCircle className="w-4 h-4" aria-hidden="true" />
            {selectedSubjects.length === 0
              ? 'Select at least one subject'
              : `Start Practice (${effectiveSize} questions)`}
          </button>
        </div>
      </section>
    </div>
  );
};
