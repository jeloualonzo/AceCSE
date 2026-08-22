import refinementBatchesJson from '../../content/qa/refinement-batches.json';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import type { Subject } from '@/types';

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

/**
 * Every production subject either level can draw on — the same union the
 * exact-ID Practice builder loads (`buildQuestionIdsPracticeSession`), so
 * "exists" means exactly the same thing to this validator and to the session
 * it guards.
 */
const ALL_PRODUCTION_SUBJECTS: Subject[] = [
  ...new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional]),
];

/**
 * Returns all structural errors without imposing future workflow policy.
 *
 * `knownQuestionIds` is the resolution seam: pass the id set of the ACTIVE
 * production catalog and every referenced question must exist in it, so a
 * registry entry can never expose a Practice Batch button for an ID that is
 * not in the bank. Omitting it runs structure-only — which is all the
 * synchronous module-load gate below can do, because question payloads ship as
 * lazy per-subject chunks and there is no synchronous list of active ids
 * (`virtual:question-manifest` carries supply counts, not ids). Use
 * `validateRefinementBatchesAgainstCatalog` for the full contract.
 */
export function validateRefinementBatches(
  value: unknown,
  knownQuestionIds?: ReadonlySet<string>,
): string[] {
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
      if (knownQuestionIds) {
        for (const questionId of questionIds) {
          // Non-string / blank entries are already reported above; reporting
          // them again as "unresolved" would just be noise.
          if (typeof questionId !== 'string' || questionId.trim() === '') continue;
          if (!knownQuestionIds.has(questionId)) {
            errors.push(
              `${where}.questionIds references a question that is not in the active production catalog: ${questionId}`
            );
          }
        }
      }
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

/**
 * The full registry contract: structure AND resolution of every `questionId`
 * against the active production catalog.
 *
 * Async because the bank ships as lazy per-subject chunks, so the synchronous
 * gate above can only enforce structure. Resolution reuses the production
 * loader's own `loadQuestionIndex` — the same questions, past the same
 * `isValidQuestion` admission gate, keyed exactly as the exact-ID Practice
 * builder keys them — rather than re-parsing ids here.
 *
 * `questionBank` is imported dynamically on purpose. The dependency runs QA →
 * production and never the reverse, and keeping it out of this module's static
 * graph means importing the QA registry can never drag the production question
 * loader (or its manifest/taxonomy graph) along with it.
 */
export async function validateRefinementBatchesAgainstCatalog(
  value: unknown = REFINEMENT_BATCHES,
): Promise<string[]> {
  const { loadQuestionIndex } = await import('@/data/questionBank');
  const activeQuestions = await loadQuestionIndex(ALL_PRODUCTION_SUBJECTS);
  return validateRefinementBatches(value, new Set(activeQuestions.keys()));
}

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
