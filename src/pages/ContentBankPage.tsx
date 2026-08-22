import { ArrowRight, ClipboardList, Layers3, ListChecks, Search, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { allClassifications } from '@/data/taxonomy';
import {
  buildSubjectDashboardSummaries,
  CONTENT_BANK_SUBJECTS,
  getWorkspaceRefinementBatches,
  slugForSubject,
  workspaceStatusLabel,
  type SubjectDashboardSummary,
} from '@/data/contentBankWorkspace';
import type { Subject } from '@/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppContext } from '@/components/shell/AppLayout';
import { CONTENT_BANK_ROUTE } from '@/App';

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

function statusClass(status: SubjectDashboardSummary['status']): string {
  if (status === 'Complete') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (status === 'Almost Complete') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
  if (status === 'In Progress') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function familySummary(summary: SubjectDashboardSummary): string[] {
  return summary.families.slice(0, 3).map((family) =>
    `${family.family}: ${family.activeQuestionIds.length} active · ${family.frozenQuestionIds.length} frozen · ${family.remainingQuestionIds.length} remaining`
  );
}

function SubjectCard({ summary }: { summary: SubjectDashboardSummary }) {
  const frozenRatio = summary.activeQuestionCount === 0
    ? 0
    : Math.round((summary.frozenQuestionCount / summary.activeQuestionCount) * 100);
  return (
    <Link
      to={`${CONTENT_BANK_ROUTE}/${slugForSubject(summary.subject)}`}
      data-testid={`subject-card-${summary.subject}`}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{summary.subject}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatCount(summary.activeQuestionCount)} active questions · {summary.familyCount} families
            </p>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" aria-hidden="true" />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(summary.status)}`}>
          {workspaceStatusLabel(summary.status)}
        </span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{frozenRatio}% frozen</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`${frozenRatio}% frozen`}>
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${frozenRatio}%` }} />
      </div>
      <ul className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        {familySummary(summary).map((line) => <li key={line} className="truncate">{line}</li>)}
        {summary.families.length > 3 && <li className="font-semibold text-slate-400">+ {summary.families.length - 3} more families</li>}
      </ul>
      <div className="mt-5 text-xs font-bold text-emerald-700 dark:text-emerald-400">Open Subject Workspace</div>
    </Link>
  );
}

export const ContentBankPage: React.FC = () => {
  useDocumentTitle('Content Bank');
  const { examLevel } = useAppContext();
  const batches = useMemo(() => getWorkspaceRefinementBatches(), []);
  const summaries = useMemo(() => buildSubjectDashboardSummaries(batches), [batches]);
  const currentSubjects = useMemo(() => [...new Set([
    ...SUBJECTS_BY_LEVEL.Professional,
    ...SUBJECTS_BY_LEVEL.Subprofessional,
  ])], []);
  const recentBatches = batches.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Internal content workflow</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Content Bank</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Choose a subject to inspect its families, see what is frozen or ready for QA, select the next questions, and prepare a review batch.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-700 dark:bg-slate-950">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active level</div>
          <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{examLevel}</div>
        </div>
      </header>

      <section aria-labelledby="subject-selector-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="subject-selector-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject Workspaces</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Progress is derived from the active catalog and the separate QA refinement registry.</p>
          </div>
          <span data-testid="content-bank-subject-count" className="text-xs text-slate-500 dark:text-slate-400">{currentSubjects.length} subjects · {formatCount(summaries.reduce((total, summary) => total + summary.activeQuestionCount, 0))} active questions</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => <SubjectCard key={summary.subject} summary={summary} />)}
        </div>
      </section>

      <section aria-labelledby="workflow-overview-heading" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h2 id="workflow-overview-heading" className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Derived progress</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Frozen membership marks completed work. Ready for QA remains visible separately, and duplicate batch references count once.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ListChecks className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Next-question picker</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Select unresolved active questions by family, difficulty, structure, or search instead of hunting through JSON.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Review-ready exports</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Copy synchronized learner and authoring Markdown, or the exact production question JSON, in batch order.</p>
        </article>
      </section>

      <section aria-labelledby="recent-batches-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="recent-batches-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent QA batches</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open a subject workspace to inspect exact IDs, practice, and copy review exports.</p>
          </div>
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {recentBatches.map((batch) => {
            const batchSubject = CONTENT_BANK_SUBJECTS.find((subject) => summaries.find((summary) => summary.subject === subject)?.families.some((family) => family.activeQuestionIds.some((id) => batch.questionIds.includes(id))));
            return (
              <div key={batch.id} data-refinement-batch={batch.id} className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{batch.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${batch.status === 'frozen' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}`}>{batch.status === 'frozen' ? 'Frozen' : 'Ready for QA'}</span>
                  </div>
                  <p data-testid={`refinement-count-${batch.id}`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{batch.questionIds.length} questions · {batchSubject ?? batch.family}</p>
                </div>
                {batchSubject && <Link to={`${CONTENT_BANK_ROUTE}/${slugForSubject(batchSubject)}?batch=${encodeURIComponent(batch.id)}`} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400">Open Workspace</Link>}
              </div>
            );
          })}
          {recentBatches.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No refinement batches registered.</p>}
        </div>
      </section>
    </div>
  );
};

export default ContentBankPage;
