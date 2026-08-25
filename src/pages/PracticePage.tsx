import { BookOpen, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Subject } from '@/types';
import { QUESTION_MANIFEST } from '@/data/questionBank';
import { practiceLevelOptions, type PracticeLevelOption } from '@/lib/practiceLevels';
import { EXAM_ROUTE } from '@/navigation/appRoutes';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** The learner-facing Practice subject order. Level actions remain data-derived. */
export const PRACTICE_ALL_SUBJECTS: Subject[] = [
  'Verbal Ability',
  'Numerical Reasoning',
  'General Information',
  'Clerical Ability',
  'Analytical Reasoning',
];

export const PRACTICE_SUBJECT_DESCRIPTORS: Readonly<Record<Subject, string>> = {
  'Verbal Ability': 'Language & Communication',
  'Numerical Reasoning': 'Numbers & Problem Solving',
  'General Information': 'Philippine & General Knowledge',
  'Clerical Ability': 'Office & Records Skills',
  'Analytical Reasoning': 'Logic & Critical Thinking',
};

/** One reusable card per actual subject; no mixed-subject card exists. */
const PRACTICE_CARDS: readonly {
  label: Subject;
  descriptor: string;
  options: PracticeLevelOption[];
}[] = PRACTICE_ALL_SUBJECTS.map((subject) => ({
  label: subject,
  descriptor: PRACTICE_SUBJECT_DESCRIPTORS[subject],
  options: practiceLevelOptions([subject], QUESTION_MANIFEST.subjects),
}));

interface PracticeLaunchCardProps {
  subjectLabel: Subject;
  descriptor: string;
  options: readonly PracticeLevelOption[];
  onStart: (option: PracticeLevelOption) => void;
}

const PracticeLaunchCard: React.FC<PracticeLaunchCardProps> = ({
  subjectLabel,
  descriptor,
  options,
  onStart,
}) => {
  const only = options.length === 1 ? options[0] : null;

  return (
    <article
      data-practice-card={subjectLabel}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{subjectLabel}</h3>
        <div
          data-practice-descriptor={subjectLabel}
          data-testid={`practice-descriptor-${subjectLabel}`}
          className="mt-1 text-xs text-slate-500 dark:text-slate-400"
        >
          {descriptor}
        </div>
        {/* Show a level only when it is a factual single-level distinction. */}
        {only && !only.levelIsLabelOnly && (
          <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {only.level}
          </div>
        )}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-6">
        {options.map((option) => (
          <button
            key={option.level}
            type="button"
            onClick={() => onStart(option)}
            className="inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:w-auto"
            aria-label={only ? `Start ${subjectLabel} Practice` : `Start ${option.level} ${subjectLabel} Practice`}
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            <span>{only ? 'Start Practice' : option.level}</span>
          </button>
        ))}
      </div>
    </article>
  );
};

/**
 * Practice is progressive and inventory-hidden. The engine chooses an initial
 * batch internally, then the shared booklet can append more questions without
 * exposing the bank size or a fixed learner-selected session length. Practice
 * always uses one open-ended elapsed stopwatch; Simulation is the only mode
 * with an exam deadline/countdown.
 *
 * Every subject is on this page at all times. Nothing here reads an app-wide
 * examination level: each card carries the level(s) its own content supports,
 * and the launch is what fixes the level for that one session.
 */
export const PracticePage: React.FC = () => {
  useDocumentTitle('Practice');
  const navigate = useNavigate();

  const startPractice = (option: PracticeLevelOption) => {
    const request: ExamLaunchRequest = {
      kind: 'practice',
      examLevel: option.level,
      questionCount: 0,
      subjects: option.subjects,
      progressive: true,
    };
    navigate(EXAM_ROUTE, { state: { launch: request } });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">Practice</h1>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-950/40 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>Learning Mode</span>
        </div>
        <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-300 sm:text-sm">
          Practice at your own pace. Answer, skip, revisit, and reveal explanations as you learn.
          Start with any subject and show more questions whenever you are ready. The session stopwatch starts automatically.
        </p>
      </div>
      <section aria-labelledby="practice-start-heading" className="space-y-3">
        <div>
          <h2 id="practice-start-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Start Practice
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PRACTICE_CARDS.map((card) => (
            <PracticeLaunchCard
              key={card.label}
              subjectLabel={card.label}
              descriptor={card.descriptor}
              options={card.options}
              onStart={startPractice}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
