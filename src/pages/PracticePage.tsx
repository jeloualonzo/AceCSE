import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlayCircle, Timer } from 'lucide-react';
import type { Subject } from '@/types';
import { PRACTICE_SIZES, SUBJECTS_BY_LEVEL } from '@/config/exam';
import { subjectAvailability } from '@/lib/examEngine';
import { QUESTION_MANIFEST } from '@/data/questionBank';
import { getCanonicalPool } from '@/data/taxonomy';
import { getVisiblePracticeItemSets } from '@/data/practiceCatalog';
import { useAppContext } from '@/components/shell/AppLayout';
import { ExamLevelSwitch } from '@/components/shell/ExamLevelSwitch';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** A preset question count, or the entire available supply. */
type PracticeSize = (typeof PRACTICE_SIZES)[number] | 'all';

/**
 * Practice — for learning, not pressure. Untimed by default, instant
 * explanations after every answer, skip and change answers freely,
 * restart anytime.
 */
export const PracticePage: React.FC = () => {
  useDocumentTitle('Practice');
  const navigate = useNavigate();
  const { examLevel, setExamLevel } = useAppContext();

  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [practiceSize, setPracticeSize] = useState<PracticeSize>(PRACTICE_SIZES[0]);
  const [practiceTimed, setPracticeTimed] = useState(false);

  const availability = useMemo(() => subjectAvailability(examLevel), [examLevel]);
  const spellingCount = getCanonicalPool('clerical-spelling')?.entries.length ?? 0;

  // Explicit item sets applicable to this level (sync, from the manifest).
  const itemSets = useMemo(
    () => getVisiblePracticeItemSets(QUESTION_MANIFEST.groups, examLevel, SUBJECTS_BY_LEVEL[examLevel]),
    [examLevel]
  );

  const startItemSet = (groupId: string, size: number) => {
    const request: ExamLaunchRequest = {
      kind: 'practice',
      examLevel,
      questionCount: size,
      groupId,
      timed: false,
    };
    navigate('/app/exam', { state: { launch: request } });
  };

  const startTaskFormat = (taskFormat: string, questionCount: number) => {
    const request: ExamLaunchRequest = {
      kind: 'practice',
      examLevel,
      questionCount,
      taskFormat,
      timed: false,
    };
    navigate('/app/exam', { state: { launch: request } });
  };

  // Switching examination level drops any selected subject the new level
  // does not test (e.g. Clerical Ability disappears under Professional).
  useEffect(() => {
    setSelectedSubjects((prev) => prev.filter((s) => SUBJECTS_BY_LEVEL[examLevel].includes(s)));
  }, [examLevel]);

  const selectedSupply = selectedSubjects.reduce((sum, s) => sum + (availability[s] ?? 0), 0);

  const toggleSubject = (subject: Subject) => {
    setSelectedSubjects((prev) => {
      const next = prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject];
      // Keep the size choice honest: if the new supply can no longer fill the
      // chosen preset, fall back to the largest preset that still fits.
      const nextSupply = next.reduce((sum, s) => sum + availability[s], 0);
      setPracticeSize((size) => {
        if (size === 'all' || size <= nextSupply) return size;
        const largestFitting = [...PRACTICE_SIZES].reverse().find((s) => s <= nextSupply);
        return largestFitting ?? 'all';
      });
      return next;
    });
  };

  const effectiveSize = practiceSize === 'all' ? selectedSupply : Math.min(practiceSize, selectedSupply);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Practice</h1>
        <ExamLevelSwitch value={examLevel} onChange={setExamLevel} />
      </div>

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

      {/* Filing task-format practice — one semantic block, not historical Set 1/2/3 cards. */}
      {examLevel === 'Subprofessional' && (
        <section aria-labelledby="filing-task-heading" className="space-y-3">
          <h2 id="filing-task-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filing and Alphabetizing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shared Filing directions and examples appear once; each existing Filing question remains individually answerable with immediate explanations.
          </p>
          <button
            onClick={() => startTaskFormat('shared_filing_task', 26)}
            className="w-full sm:w-auto text-left rounded-xl border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Filing task</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                26 items
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Personal names, business names, offices, and subject filing.</p>
          </button>
        </section>
      )}

      {examLevel === 'Subprofessional' && spellingCount > 0 && (
        <section aria-labelledby="spelling-task-heading" className="space-y-3">
          <h2 id="spelling-task-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Spelling
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shared Spelling directions appear once; each existing word-choice item remains individually answerable with immediate explanations.
          </p>
          <button
            onClick={() => startTaskFormat('shared_spelling_task', spellingCount)}
            className="w-full sm:w-auto text-left rounded-xl border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Spelling task</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                {spellingCount} items
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Correctly spelled and misspelled word variants.</p>
          </button>
        </section>
      )}

      {/* Item sets — practice a complete group with its shared directions */}
      {itemSets.length > 0 && (
        <section aria-labelledby="itemsets-heading" className="space-y-3">
          <h2 id="itemsets-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Item Sets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Practice a complete question set the way it appears in the booklet — shared directions
            once, related questions together, instant explanations for each answer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {itemSets.map((set) => (
              <button
                key={set.id}
                onClick={() => startItemSet(set.id, set.size)}
                className="text-left rounded-xl border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{set.title}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shrink-0">
                    {set.size} items
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{set.subject}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Session options */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Questions</legend>
            <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Number of questions">
              {PRACTICE_SIZES.map((size) => {
                const unavailable = selectedSubjects.length > 0 && size > selectedSupply;
                return (
                  <button
                    key={size}
                    role="radio"
                    aria-checked={practiceSize === size}
                    disabled={unavailable}
                    onClick={() => setPracticeSize(size)}
                    className={`min-w-[52px] min-h-[40px] rounded-lg text-sm font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      unavailable
                        ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600 border-dashed border-slate-200 dark:border-slate-700 cursor-not-allowed'
                        : practiceSize === size
                          ? 'bg-emerald-600 text-white border-emerald-600 cursor-pointer'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
              <button
                role="radio"
                aria-checked={practiceSize === 'all'}
                onClick={() => setPracticeSize('all')}
                className={`min-h-[40px] px-3.5 rounded-lg text-sm font-bold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  practiceSize === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                All{selectedSubjects.length > 0 ? ` (${selectedSupply})` : ''}
              </button>
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
