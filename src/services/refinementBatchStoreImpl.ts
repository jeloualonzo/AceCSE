import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import {
  isRefinementBatchStatus,
  validateRefinementBatches,
  type RefinementBatch,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';
import { isRetiredRefinementBatchId } from '@/data/retiredRefinementBatches';

/**
 * Firestore-touching implementation, reached only via the dynamic imports in
 * `refinementBatchStore.ts` so the Firestore SDK stays out of the initial
 * bundle.
 *
 * WHAT IS STORED: workflow metadata and question *ids* — nothing else. Question
 * text, choices, answer keys, explanations, tags, and taxonomy stay in
 * `content/questions/**` as the single source of truth. Copying question
 * objects here would create a second, silently diverging bank; the export and
 * Practice paths both re-read the real catalog by id instead.
 *
 * Timestamps are ISO strings rather than `serverTimestamp()` sentinels, so a
 * document round-trips to exactly the `RefinementBatch` shape that
 * `content/qa/refinement-batches.json` uses. That keeps seeding, reading, and
 * the Raw JSON export talking about one format.
 */

const COLLECTION = 'refinementBatches';

/** Fields the security rules allow. `createdBy`/`updatedBy` are audit-only. */
interface RefinementBatchDocument extends RefinementBatch {
  createdBy?: string | null;
  updatedBy?: string | null;
}

function batchRef(batchId: string) {
  return doc(collection(db, COLLECTION), batchId);
}

/**
 * Firestore document → the in-app batch shape.
 *
 * Persistence-only fields are dropped and the result is validated with the same
 * validator the shipped seed passes through, so a hand-edited or partially
 * written document is skipped rather than rendered as if it were sound.
 */
function toRefinementBatch(id: string, data: unknown): RefinementBatch | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const candidate: Record<string, unknown> = {
    id,
    title: record.title,
    family: record.family,
    status: record.status,
    createdAt: record.createdAt,
    questionIds: record.questionIds,
  };
  if (typeof record.subject === 'string') candidate.subject = record.subject;
  if (typeof record.sequence === 'number') candidate.sequence = record.sequence;
  if (typeof record.updatedAt === 'string') candidate.updatedAt = record.updatedAt;
  if (validateRefinementBatches([candidate]).length > 0) return null;
  return candidate as unknown as RefinementBatch;
}

function toDocument(batch: RefinementBatch, uid: string | null): RefinementBatchDocument {
  const document: RefinementBatchDocument = {
    id: batch.id,
    title: batch.title,
    family: batch.family,
    status: batch.status,
    createdAt: batch.createdAt,
    questionIds: [...batch.questionIds],
  };
  if (batch.subject) document.subject = batch.subject;
  if (typeof batch.sequence === 'number') document.sequence = batch.sequence;
  if (batch.updatedAt) document.updatedAt = batch.updatedAt;
  if (uid) {
    document.createdBy = uid;
    document.updatedBy = uid;
  }
  return document;
}

export interface FetchedRefinementBatches {
  batches: RefinementBatch[];
  /** Document ids that failed validation and were left out, reported honestly. */
  skippedIds: string[];
}

/** Every stored batch. Rules restrict this collection to admin accounts. */
export async function fetchRefinementBatches(): Promise<FetchedRefinementBatches> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const batches: RefinementBatch[] = [];
  const skippedIds: string[] = [];
  for (const document of snapshot.docs) {
    const batch = toRefinementBatch(document.id, document.data());
    if (batch) batches.push(batch);
    else skippedIds.push(document.id);
  }
  return { batches, skippedIds };
}

/**
 * Create one batch. Deliberately create-only: `setDoc` on an id that already
 * exists is an update in Firestore's eyes, and the rules for updates forbid
 * changing `id`/`createdAt`, so an accidental overwrite of a different batch's
 * history cannot pass silently. The pre-check gives a readable error first.
 */
export async function createRefinementBatch(batch: RefinementBatch, uid: string | null): Promise<void> {
  const ref = batchRef(batch.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error(`Batch ${batch.id} already exists.`);
  }
  await setDoc(ref, toDocument(batch, uid));
}

/**
 * Move one batch to a new workflow status.
 *
 * Only the status and the audit fields move. Which transitions are legal is
 * decided by `allowedNextRefinementStatuses` before this is called — this layer
 * refuses an unknown status but is not where the workflow is defined.
 */
export async function updateRefinementBatchStatus(
  batchId: string,
  status: RefinementBatchStatus,
  uid: string | null,
  updatedAt: string,
): Promise<void> {
  if (!isRefinementBatchStatus(status)) throw new Error(`Unknown batch status: ${String(status)}`);
  await updateDoc(batchRef(batchId), { status, updatedAt, updatedBy: uid ?? null });
}

export interface SeedResult {
  /** Ids newly written to Firestore by this call. */
  createdIds: string[];
  /** Ids already present; left exactly as they were. */
  skippedIds: string[];
  /** Ids refused because they are retired; never written. */
  retiredIds: string[];
  /** Ids that could not be written, with the reason. */
  failures: { id: string; message: string }[];
}

/**
 * One-time migration of `content/qa/refinement-batches.json` (and any batches a
 * browser-local session created before Firestore was reachable) into the
 * collection.
 *
 * Create-only, per document: an id that already exists is left untouched, so
 * running this twice cannot revert a status transition someone made in the app.
 * Writes are attempted individually rather than in a `writeBatch` so one
 * rejected document does not discard the rest.
 *
 * Retired ids are refused at this boundary as well as filtered upstream. This is
 * the write itself, so it is the only check that makes "a retired batch cannot
 * be re-created" true regardless of what any caller passes in — including a
 * caller written later that reads localStorage without going through the merge.
 * They are reported separately rather than folded into `skippedIds`, which means
 * "already present, left as it was" — the opposite of what happened here.
 */
export async function seedRefinementBatches(
  batches: readonly RefinementBatch[],
  uid: string | null,
): Promise<SeedResult> {
  const result: SeedResult = { createdIds: [], skippedIds: [], retiredIds: [], failures: [] };
  for (const batch of batches) {
    if (isRetiredRefinementBatchId(batch.id)) {
      result.retiredIds.push(batch.id);
      continue;
    }
    try {
      const ref = batchRef(batch.id);
      if ((await getDoc(ref)).exists()) {
        result.skippedIds.push(batch.id);
        continue;
      }
      await setDoc(ref, toDocument(batch, uid));
      result.createdIds.push(batch.id);
    } catch (error) {
      result.failures.push({ id: batch.id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}
