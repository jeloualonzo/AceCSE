import { ArrowRight, Layers3, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { allClassifications } from '@/data/taxonomy';
import {
  buildSubjectDashboardSummaries,
  type SubjectDashboardSummary,
} from '@/data/contentBankWorkspace';
import type { Subject } from '@/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRefinementBatches } from '@/hooks/useRefinementBatches';
import { StoreDegradedNotice } from '@/components/contentBank/StoreDegradedNotice';
import { BatchCard } from '@/components/contentBank/BatchCard';
import { FrozenProgressBar, ProgressBadge } from '@/components/contentBank/badges';
import { contentBankSubjectPath } from '@/navigation/contentBankRoutes';

export type QAGroupStatus = 'Frozen' | 'Pilot' | 'Active' | 'Standard' | 'Fixed Context';

/**
 * Kept as a compatibility export for the existing QA focus catalog. Subject
 * Workspaces are now the primary route, but these canonical predicates remain
 * useful to tests and internal callers that need the existing task groups.
 */
export interface QAFocusGroupConfig {
  id: string;
  label: string;
  subject: Subject;
  poolId: string;
  taskFormat: string;
  sortOrder: number;
  status: QAGroupStatus;
  matches: (record: ReturnType<typeof allClassifications>[number]) => boolean;
}

export const QA_FOCUS_GROUPS: readonly QAFocusGroupConfig[] = [
  {
    id: 'grammar-sentence-correction',
    label: 'Grammar — Sentence Correction',
    subject: 'Verbal Ability',
    poolId: 'verbal-grammar-usage',
    taskFormat: 'shared_grammar_sentence_correction',
    sortOrder: 1,
    status: 'Pilot',
    matches: (record) =>
      record.subject === 'Verbal Ability' &&
      record.poolId === 'verbal-grammar-usage' &&
      record.taskFormat === 'shared_grammar_sentence_correction',
  },
  {
    id: 'number-series',
    label: 'Number Series',
    subject: 'Numerical Reasoning',
    poolId: 'numerical-number-sequence',
    taskFormat: 'number_sequence',
    sortOrder: 2,
    status: 'Frozen',
    matches: (record) =>
      record.subject === 'Numerical Reasoning' &&
      record.poolId === 'numerical-number-sequence' &&
      record.taskFormat === 'number_sequence',
  },
  {
    id: 'spelling',
    label: 'Spelling',
    subject: 'Clerical Ability',
    poolId: 'clerical-spelling',
    taskFormat: 'shared_spelling_task',
    sortOrder: 3,
    status: 'Frozen',
    matches: (record) =>
      record.subject === 'Clerical Ability' &&
      record.poolId === 'clerical-spelling' &&
      record.taskFormat === 'shared_spelling_task',
  },
  {
    id: 'filing-alphabetizing',
    label: 'Filing & Alphabetizing',
    subject: 'Clerical Ability',
    poolId: 'clerical-filing',
    taskFormat: 'shared_filing_task',
    sortOrder: 4,
    status: 'Frozen',
    matches: (record) => record.subject === 'Clerical Ability' && record.topic === 'Filing & Alphabetizing',
  },
];

export interface QAFocusGroup {
  config: QAFocusGroupConfig;
  questionIds: string[];
  count: number;
}

export function getQAFocusGroups(
  configs: readonly QAFocusGroupConfig[] = QA_FOCUS_GROUPS,
): QAFocusGroup[] {
  const classifications = allClassifications();
  return [...configs].sort((left, right) => left.sortOrder - right.sortOrder).map((config) => {
    const questionIds = classifications.filter(config.matches).map((record) => record.questionId);
    return { config, questionIds, count: questionIds.length };
  });
}

function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

function SubjectCard({ summary }: { summary: SubjectDashboardSummary }) {
  const topFamilies = summary.families.slice(0, 3);
  return (
    <Link
      to={contentBankSubjectPath(summary.subject)}
      data-testid={`subject-card-${summary.subject}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{summary.subject}</h2>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatCount(summary.activeQuestionCount)} active questions</span>
              <span>{summary.familyCount} families</span>
            </div>
          </div>
        </div>
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600"
          aria-hidden="true"
        />
      </div>

      <div className="mt-5">
        <ProgressBadge status={summary.status} />
      </div>
      <div className="mt-3">
        <FrozenProgressBar frozen={summary.frozenQuestionCount} active={summary.activeQuestionCount} />
      </div>

      <table className="mt-4 w-full text-left text-xs">
        <caption className="sr-only">Largest families in {summary.subject}</caption>
        <thead className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <tr>
            <th scope="col" className="pb-1 font-semibold">
              Family
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Frozen
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Left
            </th>
          </tr>
        </thead>
        <tbody className="text-slate-600 dark:text-slate-300">
          {topFamilies.map((family) => (
            <tr key={family.key}>
              <th scope="row" className="max-w-[160px] truncate py-0.5 pr-2 font-medium">
                {family.family}
              </th>
              <td className="py-0.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                {family.frozenQuestionIds.length}
              </td>
              <td className="py-0.5 text-right font-semibold">{family.remainingQuestionIds.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary.families.length > topFamilies.length && (
        <p className="mt-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
          {summary.families.length - topFamilies.length} more families
        </p>
      )}

      <div className="mt-5 text-xs font-bold text-emerald-700 dark:text-emerald-400">Open Subject Workspace</div>
    </Link>
  );
}

export const ContentBankPage: React.FC = () => {
  useDocumentTitle('Content Bank');
  const state = useRefinementBatches();
  const summaries = useMemo(() => buildSubjectDashboardSummaries(state.batches), [state.batches]);
  const subjectCount = useMemo(
    () => new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional]).size,
    [],
  );
  const recentBatches = state.batches.slice(0, 6);
  const activeTotal = summaries.reduce((total, summary) => total + summary.activeQuestionCount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        {/* No "Admin only" eyebrow: this page now lives inside the admin shell,
            whose header and navigation already say where you are. */}
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Content Bank</h1>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Refinement batches
            </dt>
            <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {state.loading ? '—' : formatCount(state.batches.length)}
            </dd>
          </div>
        </dl>
      </header>

      {!state.loading && <StoreDegradedNotice state={state} />}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <section aria-labelledby="subject-selector-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="subject-selector-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Subject Workspaces
          </h2>
          <span
            data-testid="content-bank-subject-count"
            className="flex flex-wrap gap-x-4 text-xs text-slate-500 dark:text-slate-400"
          >
            <span>{subjectCount} subjects</span>
            <span>{formatCount(activeTotal)} active questions</span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => (
            <SubjectCard key={summary.subject} summary={summary} />
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-batches-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="recent-batches-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent refinement batches
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Newest first</span>
        </div>
        {state.loading ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-8 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading refinement batches…
          </p>
        ) : recentBatches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No refinement batches yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recentBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ContentBankPage;
