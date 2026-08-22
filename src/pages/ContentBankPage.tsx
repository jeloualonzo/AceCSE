import { ChevronDown, Filter, PlayCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { QUESTION_MANIFEST, subjectAvailability } from '@/data/questionBank';
import { allClassifications, taskFormatLabel } from '@/data/taxonomy';
import { getRefinementBatches, type RefinementBatch } from '@/data/refinementBatches';
import { RefinementBatchSection } from '@/components/contentBank/RefinementBatchSection';
import { useAppContext } from '@/components/shell/AppLayout';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import type { ExamLevel, Subject } from '@/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type QAGroupStatus = 'Frozen' | 'Pilot' | 'Active' | 'Standard' | 'Fixed Context';

const INVENTORY_SUBJECTS: Subject[] = [...new Set([
  ...SUBJECTS_BY_LEVEL.Professional,
  ...SUBJECTS_BY_LEVEL.Subprofessional,
])];

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

/**
 * Internal QA focus groups. Membership remains canonical: this configuration
 * describes the supported pool/task predicates, but never stores question IDs
 * or counts. Adding another completed task family only requires one entry.
 */
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
  configs: readonly QAFocusGroupConfig[] = QA_FOCUS_GROUPS
): QAFocusGroup[] {
  const classifications = allClassifications();
  return [...configs].sort((left, right) => left.sortOrder - right.sortOrder).map((config) => {
    const questionIds = classifications.filter(config.matches).map((record) => record.questionId);
    return { config, questionIds, count: questionIds.length };
  });
}

function totalSubjectCount(subject: Subject): number {
  const supply = QUESTION_MANIFEST.subjects[subject];
  return supply ? supply.professional + supply.subprofessional + supply.both : 0;
}

function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

function statusClass(status: QAGroupStatus): string {
  if (status === 'Pilot') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  }
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
}

interface SubjectBreakdownRow {
  subject: Subject;
  topic: string;
  taskFormat: string;
  poolId: string | null;
  count: number;
}

function subjectBreakdown(): SubjectBreakdownRow[] {
  const rows = new Map<string, SubjectBreakdownRow>();
  for (const record of allClassifications()) {
    const key = [record.subject, record.topic, record.taskFormat, record.poolId ?? '—'].join('|');
    const row = rows.get(key);
    if (row) {
      row.count += 1;
    } else {
      rows.set(key, {
        subject: record.subject,
        topic: record.topic,
        taskFormat: taskFormatLabel(record.questionType, record.taskFormat),
        poolId: record.poolId,
        count: 1,
      });
    }
  }
  return [...rows.values()].sort((left, right) => {
    const subjectOrder = SUBJECTS_BY_LEVEL.Professional.indexOf(left.subject) - SUBJECTS_BY_LEVEL.Professional.indexOf(right.subject);
    if (subjectOrder !== 0) return subjectOrder;
    return left.topic.localeCompare(right.topic) || left.taskFormat.localeCompare(right.taskFormat);
  });
}

function activeAvailability(level: ExamLevel, subject: Subject): number {
  return subjectAvailability(level)[subject] ?? 0;
}

interface QAFocusSectionProps {
  groups: QAFocusGroup[];
  expandedGroups: Set<string>;
  examLevel: ExamLevel;
  onLaunch: (group: QAFocusGroup) => void;
  onToggle: (groupId: string) => void;
}

function QAFocusSection({ groups, expandedGroups, examLevel, onLaunch, onToggle }: QAFocusSectionProps) {
  return (
    <section aria-labelledby="qa-focus-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="qa-focus-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">QA focus groups</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Practice uses only the canonical group selected below.</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{groups.length} groups</span>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {groups.map((group) => {
          const { config } = group;
          const expanded = expandedGroups.has(config.id);
          return (
            <article key={config.id} data-qa-group={config.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{config.label}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(config.status)}`}>{config.status}</span>
                  </div>
                  <p data-testid={`qa-count-${config.id}`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{config.subject} · {formatCount(group.count)} questions</p>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunch(group)}
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  aria-label={`Practice ${config.label}`}
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Practice</span>
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800 sm:grid-cols-3">
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Task format</dt><dd className="mt-0.5 break-words font-mono text-[11px] text-slate-700 dark:text-slate-300">{config.taskFormat}</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pool</dt><dd className="mt-0.5 break-words font-mono text-[11px] text-slate-700 dark:text-slate-300">{config.poolId}</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active-level supply</dt><dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">{formatCount(activeAvailability(examLevel, config.subject))}</dd></div>
              </dl>
              <button
                type="button"
                onClick={() => onToggle(config.id)}
                className="mt-3 inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
                aria-expanded={expanded}
                aria-controls={`${config.id}-members`}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                {expanded ? 'Hide' : 'Show'} question IDs ({formatCount(group.count)})
              </button>
              {expanded && (
                <div id={`${config.id}-members`} className="mt-2 max-h-44 overflow-y-auto rounded-lg bg-slate-50 p-2 dark:bg-slate-950">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 sm:grid-cols-3">
                    {group.questionIds.map((questionId) => <li key={questionId}>{questionId}</li>)}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {groups.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">No matching QA focus groups.</p>}
    </section>
  );
}

export const ContentBankPage: React.FC = () => {
  useDocumentTitle('Content Bank');
  const navigate = useNavigate();
  const { examLevel } = useAppContext();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'All' | Subject>('All');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => getQAFocusGroups(), []);
  const refinementBatches = useMemo(() => getRefinementBatches(), []);
  const breakdown = useMemo(() => subjectBreakdown(), []);
  const subjects = INVENTORY_SUBJECTS;
  const availability = useMemo(() => subjectAvailability(examLevel), [examLevel]);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredRows = breakdown.filter((row) => {
    if (subjectFilter !== 'All' && row.subject !== subjectFilter) return false;
    if (!normalizedQuery) return true;
    return [row.subject, row.topic, row.taskFormat, row.poolId ?? ''].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });

  const filteredGroups = groups.filter(({ config }) => {
    if (subjectFilter !== 'All' && config.subject !== subjectFilter) return false;
    if (!normalizedQuery) return true;
    return [config.label, config.subject, config.poolId, config.taskFormat, config.status].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });

  const launchGroup = (group: QAFocusGroup) => {
    const launch: ExamLaunchRequest = {
      kind: 'practice',
      examLevel,
      questionCount: 0,
      subjects: [group.config.subject],
      taskFormat: group.config.taskFormat,
    };
    navigate('/app/exam', { state: { launch } });
  };

  const launchRefinementBatch = (batch: RefinementBatch) => {
    const launch: ExamLaunchRequest = {
      kind: 'practice',
      examLevel,
      questionCount: batch.questionIds.length,
      questionIds: [...batch.questionIds],
    };
    navigate('/app/exam', { state: { launch } });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Internal QA utility
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Content Bank</h1>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Inspect canonical inventory and launch the real Practice flow for one controlled question family.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active level</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{examLevel}</div>
        </div>
      </header>

      <section aria-labelledby="inventory-summary-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="inventory-summary-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Inventory summary
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Canonical build-time manifest</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <article className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/30 sm:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total questions</div>
            <div data-testid="content-bank-total" className="mt-1 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
              {formatCount(QUESTION_MANIFEST.totalQuestions)}
            </div>
          </article>
          {subjects.map((subject) => (
            <article key={subject} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{subject}</div>
              <div data-testid={`subject-total-${subject}`} className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                {formatCount(totalSubjectCount(subject))}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                {formatCount(availability[subject] ?? 0)} available at {examLevel}
              </div>
            </article>
          ))}
        </div>
      </section>

      <QAFocusSection
        groups={filteredGroups}
        expandedGroups={expandedGroups}
        examLevel={examLevel}
        onLaunch={launchGroup}
        onToggle={toggleGroup}
      />

      <RefinementBatchSection batches={refinementBatches} onLaunch={launchRefinementBatch} />

      <section aria-labelledby="content-filter-heading" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <h2 id="content-filter-heading">Filter inventory</h2>
          </div>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search subjects, topics, tasks, or pools</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subjects, topics, tasks, or pools"
              className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="sr-only">Filter by subject</span>
            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value as 'All' | Subject)}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All subjects</option>
              {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section aria-labelledby="subject-breakdown-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="subject-breakdown-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject breakdown</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Topic, task format, pool, and count from the classification manifest.</p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{filteredRows.length} rows</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Subject</th>
                  <th className="px-3 py-2.5 font-bold">Topic</th>
                  <th className="px-3 py-2.5 font-bold">Task format</th>
                  <th className="px-3 py-2.5 font-bold">Pool</th>
                  <th className="px-3 py-2.5 text-right font-bold">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row) => (
                  <tr key={[row.subject, row.topic, row.taskFormat, row.poolId].join('|')} className="text-slate-700 dark:text-slate-300">
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">{row.subject}</td>
                    <td className="px-3 py-2.5">{row.topic}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.taskFormat}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.poolId ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{formatCount(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No matching inventory rows.</p>}
        </div>
      </section>

    </div>
  );
};

export default ContentBankPage;
