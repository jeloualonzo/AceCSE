import { ArrowLeft, Check, Copy, Download, ExternalLink, PlayCircle, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CONTENT_BANK_ROUTE } from '@/App';
import {
  buildSubjectWorkspaceData,
  createRawBatchJson,
  createReviewMarkdown,
  createWorkspaceRefinementBatch,
  getBatchQuestions,
  getNextRemainingQuestionIds,
  getQuestionPreview,
  getWorkspaceRefinementBatches,
  persistWorkspaceRefinementBatch,
  slugForSubject,
  subjectFromSlug,
  workspaceStateLabel,
  workspaceStatusLabel,
  type SubjectWorkspaceData,
  type WorkspaceProgressStatus,
  type WorkspaceQuestion,
  type WorkspaceQuestionState,
} from '@/data/contentBankWorkspace';
import { loadContentCatalog } from '@/data/questionBank';
import { refinementStatusLabel, type RefinementBatch, type RefinementBatchStatus } from '@/data/refinementBatches';
import type { Difficulty, Subject } from '@/types';
import type { ExamLaunchRequest } from '@/pages/ExamPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppContext } from '@/components/shell/AppLayout';

const ALL = 'All';
type StateFilter = typeof ALL | WorkspaceQuestionState;
type StructureFilter = typeof ALL | 'structured' | 'legacy';
type DifficultyFilter = typeof ALL | Difficulty;

function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

function statusClass(status: WorkspaceProgressStatus): string {
  if (status === 'Complete') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (status === 'Almost Complete') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
  if (status === 'In Progress') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function stateClass(state: WorkspaceQuestionState): string {
  if (state === 'frozen') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (state === 'ready-for-qa') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function formatCreatedAt(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : value;
}

async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
  await navigator.clipboard.writeText(text);
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex min-w-[145px] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProgressTable({ workspace }: { workspace: SubjectWorkspaceData }) {
  return (
    <section aria-labelledby="subject-progress-heading" className="space-y-3">
      <div>
        <h2 id="subject-progress-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject Progress</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Frozen questions count as completed. Ready for QA remains visible until it is frozen.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-bold">Family / topic</th>
                <th className="px-3 py-3 text-right font-bold">Active</th>
                <th className="px-3 py-3 text-right font-bold">Frozen</th>
                <th className="px-3 py-3 text-right font-bold">Ready for QA</th>
                <th className="px-3 py-3 text-right font-bold">Remaining</th>
                <th className="px-4 py-3 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {workspace.families.map((family) => (
                <tr key={family.key} className="text-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{family.family}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{family.taskFormat}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{family.activeQuestionIds.length}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">{family.frozenQuestionIds.length}</td>
                  <td className="px-3 py-3 text-right font-semibold text-amber-700 dark:text-amber-400">{family.readyForQaQuestionIds.length}</td>
                  <td className="px-3 py-3 text-right font-semibold">{family.remainingQuestionIds.length}</td>
                  <td className="px-4 py-3 text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(family.status)}`}>{workspaceStatusLabel(family.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {workspace.families.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No classified content is available for this subject.</p>}
      </div>
    </section>
  );
}

function BatchDetail({
  batch,
  workspace,
  onPractice,
  onCopyMarkdown,
  onCopyJson,
  exportMessage,
}: {
  batch: RefinementBatch;
  workspace: SubjectWorkspaceData;
  onPractice: (batch: RefinementBatch) => void;
  onCopyMarkdown: (batch: RefinementBatch) => void;
  onCopyJson: (batch: RefinementBatch) => void;
  exportMessage: string;
}) {
  const rows = batch.questionIds.map((id) => workspace.questions.find((item) => item.question.id === id));
  const missing = batch.questionIds.filter((_, index) => !rows[index]);
  return (
    <section aria-labelledby="batch-detail-heading" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="batch-detail-heading" className="text-base font-extrabold text-slate-900 dark:text-white">{batch.title}</h2>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${batch.status === 'frozen' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}`}>{refinementStatusLabel(batch.status)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{batch.family} · {batch.questionIds.length} questions · created {formatCreatedAt(batch.createdAt)}</p>
          <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">Batch ID: {batch.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onPractice(batch)} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><PlayCircle className="h-4 w-4" aria-hidden="true" />Practice Batch</button>
          <button type="button" onClick={() => onCopyMarkdown(batch)} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"><Copy className="h-4 w-4" aria-hidden="true" />Copy Review Markdown</button>
          <button type="button" onClick={() => onCopyJson(batch)} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Download className="h-4 w-4" aria-hidden="true" />Copy Raw JSON</button>
        </div>
      </div>
      {exportMessage && <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300">{exportMessage}</p>}
      {missing.length > 0 && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">Could not fully resolve this batch in the selected subject: {missing.join(', ')}. Exports are disabled by the validation path until every active ID resolves.</p>}
      <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-emerald-900/50 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Exact question list</h3>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Order preserved</span>
        </div>
        <ol className="grid grid-cols-1 gap-1.5 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300">
          {rows.map((item, index) => item ? <li key={item.question.id} className="flex gap-2"><span className="font-mono text-slate-400">{index + 1}.</span><span><strong className="font-mono text-slate-900 dark:text-white">{item.question.id}</strong> — {getQuestionPreview(item.question, 82)}</span></li> : <li key={`${batch.questionIds[index]}-missing`} className="font-mono text-red-700">{batch.questionIds[index]} — unresolved</li>)}
        </ol>
      </div>
    </section>
  );
}

function CreateBatchPanel({
  workspace,
  selectedIds,
  selectedFamily,
  onCreated,
}: {
  workspace: SubjectWorkspaceData;
  selectedIds: ReadonlySet<string>;
  selectedFamily: string;
  onCreated: (batch: RefinementBatch) => void;
}) {
  const defaultFamily = selectedFamily !== ALL ? selectedFamily : workspace.questions.find((item) => selectedIds.has(item.question.id))?.family ?? workspace.subject;
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [title, setTitle] = useState(`${workspace.subject} — Refinement Batch`);
  const [family, setFamily] = useState(defaultFamily);
  const [status, setStatus] = useState<RefinementBatchStatus>('ready-for-qa');
  const [errors, setErrors] = useState<string[]>([]);
  const familyOptions = [...new Set(workspace.families.map((candidate) => candidate.family))];

  useEffect(() => {
    if (!open) return;
    setFamily(defaultFamily);
  }, [defaultFamily, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = createWorkspaceRefinementBatch({ id, title, family, status, questionIds: [...selectedIds] }, new Set(workspace.questions.map((item) => item.question.id)));
    if (!result.batch) {
      setErrors(result.errors);
      return;
    }
    const persistErrors = persistWorkspaceRefinementBatch(result.batch, new Set(workspace.questions.map((item) => item.question.id)));
    if (persistErrors.length > 0) {
      setErrors(persistErrors);
      return;
    }
    setErrors([]);
    setOpen(false);
    setId('');
    onCreated(result.batch);
  };

  return (
    <section aria-labelledby="create-batch-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="create-batch-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Create Refinement Batch</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The selected IDs become a separate QA registry entry; production question JSON is never edited.</p>
        </div>
        <button type="button" onClick={() => { setErrors([]); setOpen((value) => !value); }} disabled={selectedIds.size === 0} className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Plus className="h-4 w-4" aria-hidden="true" />{open ? 'Close' : 'Create Refinement Batch'} ({selectedIds.size})</button>
      </div>
      {open && (
        <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-slate-800">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Batch ID<input value={id} onChange={(event) => setId(event.target.value)} placeholder="e.g. verbal-batch-01" className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Family / topic<select value={family} onChange={(event) => setFamily(event.target.value)} className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{familyOptions.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}<option value={workspace.subject}>{workspace.subject}</option></select></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Initial status<select value={status} onChange={(event) => setStatus(event.target.value as RefinementBatchStatus)} className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="ready-for-qa">Ready for QA</option><option value="frozen">Frozen</option></select></label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{selectedIds.size} exact active question IDs selected.</p>
            <button type="submit" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Check className="h-4 w-4" aria-hidden="true" />Save QA Batch</button>
          </div>
          {errors.length > 0 && <div role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><strong>Batch could not be saved.</strong><ul className="mt-1 list-disc pl-4">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        </form>
      )}
    </section>
  );
}

function QuestionBrowser({
  workspace,
  selectedIds,
  setSelectedIds,
}: {
  workspace: SubjectWorkspaceData;
  selectedIds: ReadonlySet<string>;
  setSelectedIds: (ids: Set<string>) => void;
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string>(ALL);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(ALL);
  const [structure, setStructure] = useState<StructureFilter>(ALL);
  const [state, setState] = useState<StateFilter>('remaining');
  const [nextCount, setNextCount] = useState('10');
  const normalizedQuery = query.trim().toLowerCase();
  const families = useMemo(() => [ALL, ...new Set(workspace.families.map((item) => item.family))], [workspace.families]);
  const visibleQuestions = useMemo(() => workspace.questions.filter((item) => {
    if (family !== ALL && item.family !== family) return false;
    if (difficulty !== ALL && item.question.difficulty !== difficulty) return false;
    if (structure !== ALL && (item.question.structuredExplanation ? 'structured' : 'legacy') !== structure) return false;
    if (state !== ALL && item.state !== state) return false;
    if (!normalizedQuery) return true;
    return [item.question.id, item.question.question, item.family, item.question.topic, item.question.subtopic ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery));
  }), [difficulty, family, normalizedQuery, state, structure, workspace.questions]);
  const visibleRemaining = visibleQuestions.filter((item) => item.state === 'remaining');

  const toggle = (item: WorkspaceQuestion) => {
    if (item.state !== 'remaining') return;
    const next = new Set(selectedIds);
    if (next.has(item.question.id)) next.delete(item.question.id);
    else next.add(item.question.id);
    setSelectedIds(next);
  };
  const selectAllRemaining = () => setSelectedIds(new Set(workspace.remainingQuestionIds));
  const selectVisibleRemaining = () => setSelectedIds(new Set(visibleRemaining.map((item) => item.question.id)));
  const selectNext = () => {
    const count = Number.parseInt(nextCount, 10);
    if (!Number.isFinite(count) || count <= 0) return;
    setSelectedIds(new Set(getNextRemainingQuestionIds({ questions: visibleQuestions }, count)));
  };
  const clear = () => setSelectedIds(new Set());

  return (
    <section aria-labelledby="next-questions-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="next-questions-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next Questions / Question Browser</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Remaining means active production content not represented by frozen or ready-for-QA registry work.</p>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400"><span data-testid="visible-question-count">{visibleQuestions.length}</span> shown · <span data-testid="selected-question-count">{selectedIds.size}</span> selected</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="relative min-w-0 flex-[2] text-xs font-semibold text-slate-600 dark:text-slate-300"><span className="mb-1.5 block">Search ID or question text</span><Search className="pointer-events-none absolute left-3 top-[31px] h-4 w-4 text-slate-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, topic, or question preview" className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <FilterSelect label="Family / topic" value={family} onChange={setFamily} options={families} />
          <FilterSelect label="Difficulty" value={difficulty} onChange={(value) => setDifficulty(value as DifficultyFilter)} options={[ALL, 'Easy', 'Medium', 'Hard']} />
          <FilterSelect label="Structure" value={structure} onChange={(value) => setStructure(value as StructureFilter)} options={[ALL, 'structured', 'legacy']} />
          <FilterSelect label="Refinement state" value={state} onChange={(value) => setState(value as StateFilter)} options={[ALL, 'remaining', 'ready-for-qa', 'frozen']} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={selectAllRemaining} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400"><ListChecksIcon />Select All Remaining</button>
          <button type="button" onClick={selectVisibleRemaining} disabled={visibleRemaining.length === 0} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden="true" />Select Visible</button>
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Next N<input value={nextCount} onChange={(event) => setNextCount(event.target.value)} inputMode="numeric" className="min-h-[36px] w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <button type="button" onClick={selectNext} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">Select Next N</button>
          <button type="button" onClick={clear} disabled={selectedIds.size === 0} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-400 dark:hover:text-red-400"><X className="h-3.5 w-3.5" aria-hidden="true" />Clear</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><tr><th className="w-10 px-3 py-3"></th><th className="px-3 py-3 font-bold">Question</th><th className="px-3 py-3 font-bold">Family / topic</th><th className="px-3 py-3 font-bold">Difficulty</th><th className="px-3 py-3 font-bold">Structure</th><th className="px-3 py-3 font-bold">State</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleQuestions.map((item) => {
                const canSelect = item.state === 'remaining';
                return <tr key={item.question.id} data-question-row={item.question.id} className={`${canSelect ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20' : 'opacity-80'} text-slate-700 dark:text-slate-300`}>
                  <td className="px-3 py-3 align-top"><input type="checkbox" aria-label={`Select ${item.question.id}`} checked={selectedIds.has(item.question.id)} disabled={!canSelect} onChange={() => toggle(item)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="max-w-[420px] px-3 py-3 align-top"><div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">{item.question.id}</div><div className="mt-1 leading-5">{getQuestionPreview(item.question)}</div></td>
                  <td className="px-3 py-3 align-top"><div className="font-semibold">{item.family}</div><div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.question.subtopic ?? item.question.topic}</div></td>
                  <td className="px-3 py-3 align-top">{item.question.difficulty}</td>
                  <td className="px-3 py-3 align-top">{item.question.structuredExplanation ? 'Structured' : 'Legacy'}</td>
                  <td className="px-3 py-3 align-top"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${stateClass(item.state)}`}>{workspaceStateLabel(item.state)}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {visibleQuestions.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">No questions match these filters.</p>}
      </div>

      {selectedIds.size > 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"><strong>{selectedIds.size} selected.</strong> Review the exact IDs above, then create a QA batch below.</div>}
    </section>
  );
}

function ListChecksIcon() {
  return <Check className="h-3.5 w-3.5" aria-hidden="true" />;
}

function SubjectWorkspace({ subject }: { subject: Subject }) {
  useDocumentTitle(`${subject} Content Workspace`);
  const navigate = useNavigate();
  const { examLevel } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadContentCatalog>> | null>(null);
  const [loadError, setLoadError] = useState('');
  const [batches, setBatches] = useState<RefinementBatch[]>(() => getWorkspaceRefinementBatches());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    let active = true;
    setCatalog(null);
    setLoadError('');
    loadContentCatalog([subject]).then((nextCatalog) => {
      if (active) setCatalog(nextCatalog);
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Could not load this subject workspace.');
    });
    return () => { active = false; };
  }, [subject]);

  useEffect(() => {
    setSelectedIds(new Set());
    setExportMessage('');
  }, [subject]);

  const workspace = useMemo(() => catalog ? buildSubjectWorkspaceData(subject, catalog, batches) : null, [batches, catalog, subject]);
  const batchParam = searchParams.get('batch');
  const subjectBatches = useMemo(() => workspace?.batches.filter((batch) => batch.questionIds.some((id) => workspace.questions.some((item) => item.question.id === id))) ?? [], [workspace]);
  const selectedBatch = subjectBatches.find((batch) => batch.id === batchParam);

  if (!subjectFromSlug(slugForSubject(subject))) return <Navigate to={CONTENT_BANK_ROUTE} replace />;
  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p></div>;
  if (!workspace || !catalog) return <div className="mx-auto max-w-7xl px-4 py-8"><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Loading {subject} workspace…</div></div>;

  const launchBatch = (batch: RefinementBatch) => {
    const launch: ExamLaunchRequest = { kind: 'practice', examLevel, questionCount: batch.questionIds.length, questionIds: [...batch.questionIds] };
    navigate('/app/exam', { state: { launch } });
  };
  const setBatch = (batchId?: string) => {
    if (batchId) setSearchParams({ batch: batchId });
    else setSearchParams({});
    setExportMessage('');
  };
  const copyMarkdown = async (batch: RefinementBatch) => {
    try {
      await copyToClipboard(createReviewMarkdown(batch, getBatchQuestions(batch, catalog)));
      setExportMessage(`Copied ${batch.questionIds.length} questions as review Markdown.`);
    } catch (error: unknown) {
      setExportMessage(error instanceof Error ? error.message : 'Could not export batch as review Markdown.');
    }
  };
  const copyJson = async (batch: RefinementBatch) => {
    try {
      await copyToClipboard(createRawBatchJson(batch, getBatchQuestions(batch, catalog)));
      setExportMessage(`Copied ${batch.questionIds.length} questions as JSON.`);
    } catch (error: unknown) {
      setExportMessage(error instanceof Error ? error.message : 'Could not export batch as JSON.');
    }
  };
  const onCreated = (batch: RefinementBatch) => {
    setBatches(getWorkspaceRefinementBatches());
    setSelectedIds(new Set());
    setBatch(batch.id);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <Link to={CONTENT_BANK_ROUTE} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back to Content Bank</Link>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Subject Workspace</p>
          <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{subject}</h1><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(workspace.status)}`}>{workspaceStatusLabel(workspace.status)}</span></div>
          <p data-testid="workspace-summary" className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{formatCount(workspace.activeQuestionCount)} active questions · {workspace.frozenQuestionIds.length} frozen · {workspace.readyForQaQuestionIds.length} ready for QA · {workspace.remainingQuestionIds.length} remaining</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><div className="text-lg font-extrabold text-slate-900 dark:text-white">{workspace.frozenQuestionIds.length}</div><div className="text-[10px] text-slate-500 dark:text-slate-400">Frozen</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><div className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{workspace.readyForQaQuestionIds.length}</div><div className="text-[10px] text-slate-500 dark:text-slate-400">Ready for QA</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><div className="text-lg font-extrabold text-slate-900 dark:text-white">{workspace.remainingQuestionIds.length}</div><div className="text-[10px] text-slate-500 dark:text-slate-400">Remaining</div></div></div>
      </header>

      {workspace.invalidBatchReferences.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><strong>QA registry references need attention.</strong><ul className="mt-1 list-disc pl-4">{workspace.invalidBatchReferences.map((entry) => <li key={entry.batchId}>Batch <span className="font-mono">{entry.batchId}</span> references question IDs that are not in the active production catalog: <span className="font-mono">{entry.missingQuestionIds.join(', ')}</span>.</li>)}</ul></div>}
      {batchParam && !selectedBatch && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><span>Batch <strong className="font-mono">{batchParam}</strong> is not registered for this subject workspace.</span><button type="button" onClick={() => setBatch()} aria-label="Close batch error"><X className="h-4 w-4" aria-hidden="true" /></button></div>}
      {selectedBatch && <BatchDetail batch={selectedBatch} workspace={workspace} onPractice={launchBatch} onCopyMarkdown={copyMarkdown} onCopyJson={copyJson} exportMessage={exportMessage} />}

      <ProgressTable workspace={workspace} />
      <QuestionBrowser workspace={workspace} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
      <CreateBatchPanel workspace={workspace} selectedIds={selectedIds} selectedFamily={ALL} onCreated={onCreated} />

      <section aria-labelledby="workspace-batches-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3"><div><h2 id="workspace-batches-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject QA Batches</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Newest first. Each batch keeps its exact question order and status.</p></div><span className="text-xs text-slate-500 dark:text-slate-400">{subjectBatches.length} batches</span></div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {subjectBatches.map((batch) => <article key={batch.id} data-workspace-batch={batch.id} className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${batch.id === batchParam ? 'border-emerald-400 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-800'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{batch.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{batch.questionIds.length} questions · {refinementStatusLabel(batch.status)}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{batch.id}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${batch.status === 'frozen' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}`}>{refinementStatusLabel(batch.status)}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setBatch(batch.id)} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Open Details</button><button type="button" onClick={() => launchBatch(batch)} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400"><PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />Practice</button></div></article>)}
        </div>
        {subjectBatches.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">No QA batches include active questions from this subject yet.</p>}
      </section>
    </div>
  );
}

export default function ContentBankWorkspacePage() {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const subject = subjectFromSlug(subjectSlug ?? '');
  return subject ? <SubjectWorkspace subject={subject} /> : <Navigate to={CONTENT_BANK_ROUTE} replace />;
}
