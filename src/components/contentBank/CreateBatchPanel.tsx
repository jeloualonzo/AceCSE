import { useMemo, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { createWorkspaceRefinementBatch } from '@/data/contentBankWorkspace';
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
 * All of it is shown before saving rather than after — the generated id, the
 * title, and the question ids in the exact order they will be stored — and the
 * button repeats the whole thing ("Create Filing & Alphabetizing — Batch 3
 * (2 questions)"), so the batch that gets created is the one that was on screen.
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
  /** Ordered, and stored in this order — see `orderQuestionSelection`. */
  selectedIds: readonly string[];
  knownQuestionIds: ReadonlySet<string>;
  existingBatches: readonly RefinementBatch[];
  writeTarget: 'firestore' | 'local';
  onCreate: (batch: RefinementBatch) => Promise<boolean>;
  onCreated: (batch: RefinementBatch) => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const generated = useMemo(() => generateRefinementBatchName(family, existingBatches), [existingBatches, family]);
  const count = selectedIds.length;
  const questionLabel = `${count} ${count === 1 ? 'question' : 'questions'}`;
  // Requirement of the workflow, not decoration: the action names the batch it
  // will create, so nothing is created that was not read first.
  const createLabel = count === 0 ? `Create ${generated.title}` : `Create ${generated.title} (${questionLabel})`;

  const save = async () => {
    const result = createWorkspaceRefinementBatch(
      {
        id: generated.id,
        title: generated.title,
        family,
        status: DEFAULT_REFINEMENT_STATUS,
        questionIds: selectedIds,
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

      <div className="mt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Question IDs to be recorded ({questionLabel})
        </h3>
        {count === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Nothing selected yet. Pick questions above and they appear here in the order they will be stored.
          </p>
        ) : (
          // Listed in full, in batch order, because this order is what the review
          // export renders and what the exact-ID Practice session runs.
          <ol
            data-testid="selected-question-ids"
            className="mt-1.5 flex max-h-24 flex-wrap gap-x-2 gap-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            {selectedIds.map((questionId, index) => (
              <li key={questionId}>
                <span className="text-slate-400 dark:text-slate-500">{index + 1}.</span> {questionId}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {count === 0
            ? 'Select at least one remaining question above.'
            : `${questionLabel} selected${writeTarget === 'local' ? ' — will be saved in this browser only' : ''}.`}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={count === 0 || saving}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-left text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : count === 0 ? (
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {createLabel}
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
