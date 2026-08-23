import { refinementStatusLabel, type RefinementBatchStatus } from '@/data/refinementBatches';
import {
  workspaceStateLabel,
  workspaceStatusLabel,
  type WorkspaceProgressStatus,
  type WorkspaceQuestionState,
} from '@/data/contentBankWorkspace';

/**
 * Shared Content Bank badges and the progress bar.
 *
 * One place decides what colour each status is, so the same word cannot mean
 * amber on one page and emerald on the next. Colour is never the only signal —
 * every badge carries its label as text.
 */

const PROGRESS_CLASSES: Record<WorkspaceProgressStatus, string> = {
  Complete: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  'Almost Complete': 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  'Not Started': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const WORKFLOW_CLASSES: Record<RefinementBatchStatus, string> = {
  frozen: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  'ready-for-qa': 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  builder: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  'needs-content': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATE_CLASSES: Record<WorkspaceQuestionState, string> = {
  frozen: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  'ready-for-qa': 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  remaining: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const BADGE = 'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide';

export function ProgressBadge({ status }: { status: WorkspaceProgressStatus }) {
  return <span className={`${BADGE} ${PROGRESS_CLASSES[status]}`}>{workspaceStatusLabel(status)}</span>;
}

export function WorkflowBadge({ status }: { status: RefinementBatchStatus }) {
  return <span className={`${BADGE} ${WORKFLOW_CLASSES[status]}`}>{refinementStatusLabel(status)}</span>;
}

export function QuestionStateBadge({ state }: { state: WorkspaceQuestionState }) {
  return <span className={`${BADGE} ${STATE_CLASSES[state]}`}>{workspaceStateLabel(state)}</span>;
}

/**
 * Frozen share of a family or subject.
 *
 * Reports 0% for an empty pool rather than dividing by zero, and labels itself
 * so the bar is not the only way to read the number.
 */
export function FrozenProgressBar({ frozen, active }: { frozen: number; active: number }) {
  const percent = active === 0 ? 0 : Math.round((frozen / active) * 100);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-500 dark:text-slate-400">Frozen</span>
        <span className="font-bold text-slate-900 dark:text-white">
          {frozen} of {active} ({percent}%)
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="img"
        aria-label={`${percent}% of active questions are frozen`}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Stacked label/value pair — the house style instead of inline separators. */
export function StatFigure({ label, value, tone }: { label: string; value: string | number; tone?: 'emerald' | 'blue' | 'amber' }) {
  const valueClass =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'blue'
        ? 'text-blue-700 dark:text-blue-400'
        : tone === 'amber'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-slate-900 dark:text-white';
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
      <div className={`text-lg font-extrabold ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
