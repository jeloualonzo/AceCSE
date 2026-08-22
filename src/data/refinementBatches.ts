import refinementBatchesJson from '../../content/qa/refinement-batches.json';

export type RefinementBatchStatus = 'ready-for-qa' | 'frozen';

export interface RefinementBatch {
  id: string;
  title: string;
  family: string;
  status: RefinementBatchStatus;
  createdAt: string;
  questionIds: string[];
}

const VALID_STATUSES = new Set<RefinementBatchStatus>(['ready-for-qa', 'frozen']);
const STATUS_LABELS: Record<RefinementBatchStatus, string> = {
  'ready-for-qa': 'Ready for QA',
  frozen: 'Frozen',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Returns all structural errors without imposing future workflow policy. */
export function validateRefinementBatches(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) return ['refinement batch data must be an array'];

  const batchIds = new Set<string>();
  value.forEach((candidate, index) => {
    const where = `batch[${index}]`;
    if (!isObject(candidate)) {
      errors.push(`${where} must be an object`);
      return;
    }
    const batch = candidate as Partial<RefinementBatch>;
    if (typeof batch.id !== 'string' || batch.id.trim() === '') errors.push(`${where}.id must be non-empty`);
    else if (batchIds.has(batch.id)) errors.push(`${where}.id is duplicated: ${batch.id}`);
    else batchIds.add(batch.id);
    if (typeof batch.title !== 'string' || batch.title.trim() === '') errors.push(`${where}.title must be non-empty`);
    if (typeof batch.family !== 'string' || batch.family.trim() === '') errors.push(`${where}.family must be non-empty`);
    if (typeof batch.status !== 'string' || !VALID_STATUSES.has(batch.status as RefinementBatchStatus)) {
      errors.push(`${where}.status is invalid: ${String(batch.status)}`);
    }
    if (typeof batch.createdAt !== 'string' || !batch.createdAt.trim() || !Number.isFinite(Date.parse(batch.createdAt))) {
      errors.push(`${where}.createdAt must be a valid deterministic date string`);
    }
    if (!Array.isArray(batch.questionIds) || batch.questionIds.length === 0) {
      errors.push(`${where}.questionIds must contain at least one ID`);
    } else {
      const questionIds = batch.questionIds as unknown[];
      if (questionIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
        errors.push(`${where}.questionIds must contain only non-empty strings`);
      }
      if (new Set(questionIds).size !== questionIds.length) errors.push(`${where}.questionIds contains duplicates`);
    }
  });

  return errors;
}

const rawBatches: unknown = refinementBatchesJson;
const validationErrors = validateRefinementBatches(rawBatches);
if (validationErrors.length > 0) {
  throw new Error(`Invalid refinement-batch data:\n${validationErrors.join('\n')}`);
}

export const REFINEMENT_BATCHES = rawBatches as RefinementBatch[];

/** Sorts by explicit chronology, with a stable ID tie-breaker for determinism. */
export function getRefinementBatches(
  batches: readonly RefinementBatch[] = REFINEMENT_BATCHES,
): RefinementBatch[] {
  return [...batches].sort((left, right) => {
    const dateOrder = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    return dateOrder || right.id.localeCompare(left.id);
  });
}

export function refinementStatusLabel(status: RefinementBatchStatus): string {
  return STATUS_LABELS[status];
}
