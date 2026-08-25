import { BookOpen, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Subject } from '@/types';
import { QUESTION_MANIFEST } from '@/data/questionBank';
import { practiceLevelOptions, type PracticeLevelOption } from '@/lib/practiceLevels';
import { EXAM_ROUTE } from '@/navigation/appRoutes';
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

/** The mixed card's label. Not "All Subjects": no single examination level
 * contains all five, so one mixed run is the four subjects of its level. */
const MIXED_LABEL = 'Mixed Practice';

/**
 * One card per selection, resolved once at module load.
 *
 * The manifest is build-time data and `practiceLevelOptions` is pure, so the
 * level choices a card offers cannot change while the app is running — and
 * there is no selected level to recompute against. A subject tested at one
 * level gets one action; a subject whose two levels would draw the same pool
 * gets one action too; the mixed card gets two, because the levels genuinely
 * test different subject sets.
 */
const PRACTICE_CARDS: readonly {
  label: string;
  mixed: boolean;
  options: PracticeLevelOption[];
}[] = [
  {
    label: MIXED_LABEL,
    mixed: true,
    options: practiceLevelOptions(PRACTICE_ALL_SUBJECTS, QUESTION_MANIFEST.subjects),
  },
  ...PRACTICE_ALL_SUBJECTS.map((subject) => ({
    label: subject,
    mixed: false,
    options: practiceLevelOptions([subject], QUESTION_MANIFEST.subjects),
  })),
];

interface PracticeLaunchCardProps {
  subjectLabel: string;
  mixed?: boolean;
  options: readonly PracticeLevelOption[];
  onStart: (option: PracticeLevelOption) => void;
}

const PracticeLaunchCard: React.FC<PracticeLaunchCardProps> = ({
  subjectLabel,
  mixed = false,
  options,
  onStart,
}) => {
  const only = options.length === 1 ? options[0] : null;
  const subject = mixed ? 'Mixed' : subjectLabel;

  return (
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
        {/* The level only when it is a fact about the subject, not a choice.
            A subject authored for both levels draws one shared pool, so naming
            a level there would invent a distinction. */}
        {only && !only.levelIsLabelOnly && (
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {only.level}
          </p>
        )}
      </div>
      <div className="mt-auto pt-6 flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.level}
            type="button"
            onClick={() => onStart(option)}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label={only ? `Start ${subject} Practice` : `Start ${option.level} ${subject} Practice`}
          >
            <PlayCircle className="w-4 h-4" aria-hidden="true" />
            <span>{only ? (mixed ? 'Start Mixed Practice' : 'Start Practice') : option.level}</span>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Practice</h1>
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
            Choose a subject, or mix the subject areas of one examination level.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {PRACTICE_CARDS.map((card) => (
            <PracticeLaunchCard
              key={card.label}
              subjectLabel={card.label}
              mixed={card.mixed}
              options={card.options}
              onStart={startPractice}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
