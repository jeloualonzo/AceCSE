import React from 'react';
import { BookOpen, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Subject } from '@/types';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { useAppContext } from '@/components/shell/AppLayout';
import { ExamLevelSwitch } from '@/components/shell/ExamLevelSwitch';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const SUBJECT_DESCRIPTIONS: Record<Subject, string> = {
  'Numerical Reasoning': 'Build speed with operations, word problems, ratios, data, and series.',
  'Verbal Ability': 'Strengthen vocabulary, grammar, reading comprehension, and organization.',
  'Analytical Reasoning': 'Practice logic, syllogisms, patterns, and structured problem solving.',
  'Clerical Ability': 'Review filing, spelling, coding, and practical office procedures.',
  'General Information': 'Review constitutional, legal, environmental, and civic knowledge.',
};

/**
 * Practice is progressive and inventory-hidden. The engine chooses an initial
 * batch internally, then the shared booklet can append more questions without
 * exposing the bank size or a fixed learner-selected session length.
 */
export const PracticePage: React.FC = () => {
  useDocumentTitle('Practice');
  const navigate = useNavigate();
  const { examLevel, setExamLevel } = useAppContext();

  const startPractice = (subjects: Subject[]) => {
    const request: ExamLaunchRequest = {
      kind: 'practice',
      examLevel,
      questionCount: 0,
      subjects,
      timed: false,
      progressive: true,
    };
    navigate('/app/exam', { state: { launch: request } });
  };

  const subjects = SUBJECTS_BY_LEVEL[examLevel];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Practice</h1>
        <ExamLevelSwitch value={examLevel} onChange={setExamLevel} />
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>Learning Mode</span>
        </div>
        <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 leading-relaxed">
          Practice at your own pace. Answer, skip, revisit, and reveal explanations as you learn.
          Start with any subject and show more questions whenever you are ready.
        </p>
      </div>

      <section aria-labelledby="practice-start-heading" className="space-y-3">
        <div>
          <h2 id="practice-start-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Start Practice
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a subject or mix the configured exam subjects. Your practice session grows as you work.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => startPractice([subject])}
              className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 min-h-[128px] hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={`Start ${subject} Practice`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{subject}</span>
                <PlayCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-2">
                {SUBJECT_DESCRIPTIONS[subject]}
              </p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Start Practice <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => startPractice(subjects)}
            className="text-left rounded-xl border border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 sm:p-5 min-h-[128px] hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Start All Subjects Practice"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">All Subjects</span>
              <PlayCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300 mt-2">
              Mix the subjects included in this exam level for a broader learning session.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Start Mixed Practice <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
