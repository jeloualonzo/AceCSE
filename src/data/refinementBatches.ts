import refinementBatchesJson from '../../content/qa/refinement-batches.json';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import type { Subject } from '@/types';

/**
 * The controlled refinement workflow, in order.
 *
 * A batch only ever moves along this sequence through the transition map below —
 * never by free text. `needs-content` and `builder` were added after the first
 * nine batches shipped, so every value the seed registry already uses stays
 * valid and no existing entry has to be rewritten.
 */
export const REFINEMENT_STATUS_SEQUENCE = [
  'needs-content',
  'builder',
  'ready-for-qa',
  'frozen',
] as const;

export type RefinementBatchStatus = (typeof REFINEMENT_STATUS_SEQUENCE)[number];

/** Where a newly created batch starts: claimed, but not yet written. */
export const DEFAULT_REFINEMENT_STATUS: RefinementBatchStatus = 'needs-content';

export interface RefinementBatch {
  id: string;
  title: string;
  family: string;
  status: RefinementBatchStatus;
  createdAt: string;
  questionIds: string[];
  /**
   * Optional persistence metadata. Absent in the shipped seed registry and
   * populated by the Firestore store, which is why every field is optional —
   * the seed file must keep validating unchanged.
   */
  subject?: string;
  sequence?: number;
  updatedAt?: string;
}

const VALID_STATUSES = new Set<string>(REFINEMENT_STATUS_SEQUENCE);
const STATUS_LABELS: Record<RefinementBatchStatus, string> = {
  'needs-content': 'Needs Content',
  builder: 'Builder',
  'ready-for-qa': 'Ready for QA',
  frozen: 'Frozen',
};

/**
 * Which moves the workflow permits, as an explicit map rather than "one step
 * along the sequence".
 *
 * Forward moves advance the batch. Backward moves exist because QA genuinely
 * sends work back — a batch that fails review returns to Builder, and a frozen
 * batch can be reopened when a defect is found later. What is deliberately
 * absent is skipping: a batch cannot jump from `needs-content` straight to
 * `frozen`, so "frozen" always means it passed through QA.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<RefinementBatchStatus, readonly RefinementBatchStatus[]> = {
  'needs-content': ['builder'],
  builder: ['ready-for-qa', 'needs-content'],
  'ready-for-qa': ['frozen', 'builder'],
  frozen: ['ready-for-qa'],
};

export function isRefinementBatchStatus(value: unknown): value is RefinementBatchStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value);
}

/** The statuses a controlled UI may offer for a batch currently at `from`. */
export function allowedNextRefinementStatuses(
  from: RefinementBatchStatus,
): readonly RefinementBatchStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[from];
}

export function canTransitionRefinementStatus(
  from: RefinementBatchStatus,
  to: RefinementBatchStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Why a transition is refused, or `null` when it is allowed. Phrased for the
 * admin who attempted it, since this is what the UI shows.
 */
export function refinementTransitionError(
  from: RefinementBatchStatus,
  to: RefinementBatchStatus,
): string | null {
  if (from === to) return `This batch is already ${STATUS_LABELS[to]}.`;
  if (canTransitionRefinementStatus(from, to)) return null;
  const allowed = allowedNextRefinementStatuses(from).map((status) => STATUS_LABELS[status]);
  return allowed.length === 0
    ? `${STATUS_LABELS[from]} is a terminal status.`
    : `${STATUS_LABELS[from]} can only move to ${allowed.join(' or ')}.`;
}

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
    if (typeof batch.status !== 'string' || !VALID_STATUSES.has(batch.status)) {
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

/**
 * `Filing & Alphabetizing` → `filing-alphabetizing`.
 *
 * Ampersands become nothing rather than "and", so the slug reads the way the
 * shipped ids do. Empty input yields `family`, which keeps the generated id
 * well-formed instead of producing a leading dash.
 */
export function refinementFamilySlug(family: string): string {
  const slug = family
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'family';
}

/** The trailing number in `Spelling — Batch 2` or `spelling-batch-02`. */
function parseSequence(batch: RefinementBatch): number {
  const fromTitle = /batch\s+(\d+)\s*$/i.exec(batch.title.trim());
  if (fromTitle) return Number.parseInt(fromTitle[1], 10);
  const fromId = /-(\d+)$/.exec(batch.id.trim());
  return fromId ? Number.parseInt(fromId[1], 10) : 0;
}

/**
 * The next batch number for a family.
 *
 * Takes the larger of the highest number already used and the count of batches
 * in the family, so a family whose existing batch carries no number (the shipped
 * `Grammar & Usage — Pilot`) still advances instead of minting a second "1".
 */
export function nextRefinementSequence(
  family: string,
  existingBatches: readonly RefinementBatch[],
): number {
  const key = refinementFamilySlug(family);
  const siblings = existingBatches.filter((batch) => refinementFamilySlug(batch.family) === key);
  const highest = siblings.reduce((max, batch) => Math.max(max, parseSequence(batch)), 0);
  return Math.max(highest, siblings.length) + 1;
}

export interface GeneratedRefinementName {
  id: string;
  title: string;
  sequence: number;
}

/**
 * Derives the id, title, and number for a new batch from its family alone.
 *
 * The admin never types an id: numbering is automatic and collision-free
 * (the sequence advances until the id is unused), so two admins creating a
 * batch in the same family cannot mint the same id from stale local state.
 */
export function generateRefinementBatchName(
  family: string,
  existingBatches: readonly RefinementBatch[],
): GeneratedRefinementName {
  const slug = refinementFamilySlug(family);
  const taken = new Set(existingBatches.map((batch) => batch.id));
  let sequence = nextRefinementSequence(family, existingBatches);
  let id = `${slug}-batch-${String(sequence).padStart(2, '0')}`;
  while (taken.has(id)) {
    sequence += 1;
    id = `${slug}-batch-${String(sequence).padStart(2, '0')}`;
  }
  return { id, title: `${family.trim()} — Batch ${sequence}`, sequence };
}
