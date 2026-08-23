import { useMemo, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import {
  createWorkspaceRefinementBatch,
  slugForFamily,
} from '@/data/contentBankWorkspace';
import {
  DEFAULT_REFINEMENT_STATUS,
  generateRefinementBatchName,
  refinementStatusLabel,
  type RefinementBatch,
} from '@/data/refinementBatches';
import type { Subject } from '@/types';

/**
 * Creates a refinement batch for one family.
 *
 * The admin supplies exactly one thing: which questions go in. Everything else
 * is derived —
 *
 * - the id and title come from {@link generateRefinementBatchName}, so numbering
 *   is automatic and there is no text field in which to invent a colliding id;
 * - the family comes from the route, so a batch cannot be filed under a family
 *   its questions do not belong to;
 * - the status is always the first step of the workflow, because a batch that
 *   has not been written yet cannot honestly start at "Ready for QA".
 *
 * The generated id is shown before saving rather than after, so the batch that
 * gets created is the one that was on screen.
 */
export function CreateBatchPanel({
  subject,
  family,
  selectedIds,
  knownQuestionIds,
  existingBatches,
  writeTarget,
  onCreate,
  onCreated,
}: {
  subject: Subject;
  family: string;
  selectedIds: ReadonlySet<string>;
  knownQuestionIds: ReadonlySet<string>;
  existingBatches: readonly RefinementBatch[];
  writeTarget: 'firestore' | 'local';
  onCreate: (batch: RefinementBatch) => Promise<boolean>;
  onCreated: (batch: RefinementBatch) => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const generated = useMemo(() => generateRefinementBatchName(family, existingBatches), [existingBatches, family]);
  const familyBatchCount = useMemo(
    () => existingBatches.filter((batch) => slugForFamily(batch.family) === slugForFamily(family)).length,
    [existingBatches, family],
  );

  const save = async () => {
    const result = createWorkspaceRefinementBatch(
      {
        id: generated.id,
        title: generated.title,
        family,
        status: DEFAULT_REFINEMENT_STATUS,
        questionIds: [...selectedIds],
      },
      knownQuestionIds,
      existingBatches,
    );
    if (!result.batch) {
      setErrors(result.errors);
      return;
    }
    const batch: RefinementBatch = { ...result.batch, subject, sequence: generated.sequence };
    setErrors([]);
    setSaving(true);
    try {
      const saved = await onCreate(batch);
      if (saved) onCreated(batch);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="create-batch-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="create-batch-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Create refinement batch
      </h2>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Batch ID</dt>
          <dd data-testid="generated-batch-id" className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
            {generated.id}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</dt>
          <dd data-testid="generated-batch-title" className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {generated.title}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Family</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{family}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Starting status</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {refinementStatusLabel(DEFAULT_REFINEMENT_STATUS)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        The ID, title, and number are generated from the family — {familyBatchCount}{' '}
        {familyBatchCount === 1 ? 'batch exists' : 'batches exist'} here already. Every batch starts at{' '}
        {refinementStatusLabel(DEFAULT_REFINEMENT_STATUS)} and is advanced from its own workspace. Creating a batch records
        question IDs only; production question JSON is never edited.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {selectedIds.size === 0
            ? 'Select at least one remaining question above.'
            : `${selectedIds.size} ${selectedIds.size === 1 ? 'question' : 'questions'} selected${
                writeTarget === 'local' ? ' — will be saved in this browser only' : ''
              }.`}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={selectedIds.size === 0 || saving}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : selectedIds.size === 0 ? (
            <Plus className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          Create batch
        </button>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <strong>Batch could not be created.</strong>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default CreateBatchPanel;
