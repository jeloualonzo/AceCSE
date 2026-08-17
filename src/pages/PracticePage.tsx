import { PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Subject } from '@/types';
import { useAppContext } from '@/components/shell/AppLayout';
import { ExamLevelSwitch } from '@/components/shell/ExamLevelSwitch';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

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
  mixed?: boolean;
  onStart: () => void;
}

const PracticeLaunchCard: React.FC<PracticeLaunchCardProps> = ({
  subjectLabel,
  mixed = false,
  onStart,
}) => (
  <article
    data-practice-card={subjectLabel}
    className={`flex flex-col rounded-xl border p-4 sm:p-5 shadow-sm ${
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
    <div className="mt-auto pt-6">
      <button
        type="button"
        onClick={onStart}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
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

      <section aria-label="Practice choices">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <PracticeLaunchCard
            subjectLabel="All Subjects"
            mixed
            onStart={() => startPractice(PRACTICE_ALL_SUBJECTS)}
          />
          {PRACTICE_ALL_SUBJECTS.map((subject) => (
            <PracticeLaunchCard
              key={subject}
              subjectLabel={subject}
              onStart={() => startPractice([subject])}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
