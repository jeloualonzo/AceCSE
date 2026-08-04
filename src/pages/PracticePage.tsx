import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlayCircle, Timer } from 'lucide-react';
import type { Subject } from '@/types';
import { PRACTICE_SIZES, SUBJECTS_BY_LEVEL } from '@/config/exam';
import { subjectAvailability } from '@/lib/examEngine';
import { useAppContext } from '@/components/shell/AppLayout';
import type { ExamLaunchRequest } from '@/pages/ExamPage';

/**
 * Practice — for learning, not pressure. Untimed by default, instant
 * explanations after every answer, skip and change answers freely,
 * restart anytime.
 */
export const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const { examLevel } = useAppContext();

  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [practiceSize, setPracticeSize] = useState<number>(PRACTICE_SIZES[0]);
  const [practiceTimed, setPracticeTimed] = useState(false);

  const availability = useMemo(() => subjectAvailability(examLevel), [examLevel]);

  const toggleSubject = (subject: Subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const selectedSupply = selectedSubjects.reduce((sum, s) => sum + availability[s], 0);
  const effectiveSize = Math.min(practiceSize, selectedSupply);
  const canStart = selectedSubjects.length > 0 && effectiveSize > 0;

  const start = () => {
    if (!canStart) return;
    const request: ExamLaunchRequest = {
      kind: 'practice',
      examLevel,
      questionCount: effectiveSize,
      subjects: selectedSubjects,
      timed: practiceTimed,
    };
    navigate('/app/exam', { state: { launch: request } });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Practice</h1>

      {/* What practice means — the opposite of the simulation contract */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>Learning Mode</span>
        </div>
        <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 leading-relaxed">
          No pressure here. See the correct answer and a full explanation the moment you answer.
          Skip questions, change answers, and restart anytime. Untimed unless you want a timer.
        </p>
      </div>

      {/* Subject selection */}
      <section aria-labelledby="subjects-heading" className="space-y-3">
        <h2 id="subjects-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Choose Subjects
        </h2>
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
                    ? 'bg-slate-50 dark:bg-slate-800/60 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed'
                    : isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/30 border-2 cursor-pointer'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold ${isEmpty ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {subject}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      isEmpty
                        ? 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {supply} questions
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Session options */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Questions</legend>
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
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2" id="timer-label">
              Timer
            </p>
            <button
              role="switch"
              aria-checked={practiceTimed}
              aria-labelledby="timer-label"
              onClick={() => setPracticeTimed((t) => !t)}
              className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                practiceTimed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Timer className="w-4 h-4" aria-hidden="true" />
              {practiceTimed ? '1 minute per question' : 'Untimed'}
            </button>
          </div>
        </div>

        {selectedSubjects.length > 0 && effectiveSize < practiceSize && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
            Only {selectedSupply} unique questions are available in the selected subject
            {selectedSubjects.length > 1 ? 's' : ''} right now, so this session will have{' '}
            {effectiveSize} questions.
          </p>
        )}

        <button
          onClick={start}
          disabled={!canStart}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        >
          <PlayCircle className="w-4 h-4" aria-hidden="true" />
          {selectedSubjects.length === 0
            ? 'Select at least one subject'
            : `Start Practice (${effectiveSize} questions)`}
        </button>
      </section>
    </div>
  );
};
