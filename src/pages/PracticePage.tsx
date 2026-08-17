import { BookOpen, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Subject } from '@/types';
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

/** All five subject identities remain available in mixed Practice. */
export const PRACTICE_ALL_SUBJECTS: Subject[] = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
];

interface PracticeLaunchCardProps {
  subjectLabel: string;
  description: string;
  mixed?: boolean;
  onStart: () => void;
}

const PracticeLaunchCard: React.FC<PracticeLaunchCardProps> = ({
  subjectLabel,
  description,
  mixed = false,
  onStart,
}) => (
  <article
    data-practice-card={subjectLabel}
    className={`rounded-xl border p-4 sm:p-5 min-h-[170px] shadow-sm ${
      mixed
        ? 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
    }`}
  >
    <div>
      <h3 className={`text-sm font-bold ${mixed ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>
        {subjectLabel}
      </h3>
    </div>
    <p className={`text-xs leading-relaxed mt-2 ${mixed ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
      {description}
    </p>
    <div className="mt-4">
      <button
        type="button"
        onClick={onStart}
        className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label={mixed ? 'Start Mixed Practice' : `Start ${subjectLabel} Practice`}
      >
        <PlayCircle className="w-4 h-4" aria-hidden="true" />
        <span>{mixed ? 'Start Mixed Practice' : 'Start Practice'}</span>
      </button>
    </div>
  </article>
);

/**
 * Practice is progressive and inventory-hidden. The engine chooses an initial
 * batch internally, then the shared booklet can append more questions without
 * exposing the bank size or a fixed learner-selected session length. Practice
 * always uses one open-ended elapsed stopwatch; Simulation is the only mode
 * with an exam deadline/countdown.
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
      progressive: true,
    };
    navigate('/app/exam', { state: { launch: request } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
          Start with any subject and show more questions whenever you are ready. The session stopwatch starts automatically.
        </p>
      </div>

      <section aria-labelledby="practice-start-heading" className="space-y-3">
        <div>
          <h2 id="practice-start-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Start Practice
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a subject or mix all five subject areas. Your session grows as you work.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <PracticeLaunchCard
            subjectLabel="All Subjects"
            description="Mix all five subject areas for a broader learning session."
            mixed
            onStart={() => startPractice(PRACTICE_ALL_SUBJECTS)}
          />
          {PRACTICE_ALL_SUBJECTS.map((subject) => (
            <PracticeLaunchCard
              key={subject}
              subjectLabel={subject}
              description={SUBJECT_DESCRIPTIONS[subject]}
              onStart={() => startPractice([subject])}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
