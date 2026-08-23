import type { RefinementBatch, RefinementBatchStatus } from '@/data/refinementBatches';
import type { FetchedRefinementBatches, SeedResult } from './refinementBatchStoreImpl';

/**
 * Refinement batch persistence facade. The Firestore SDK is loaded on first use
 * via dynamic import (see `refinementBatchStoreImpl.ts`), keeping it off the
 * critical path — a learner taking a simulation never downloads it for this.
 *
 * Only workflow metadata and question ids live in Firestore. Question content
 * stays in `content/questions/**`.
 */

const impl = () => import('./refinementBatchStoreImpl');

export type { FetchedRefinementBatches, SeedResult };

/** Every stored batch, plus any documents that failed validation. */
export async function fetchRefinementBatches(): Promise<FetchedRefinementBatches> {
  return (await impl()).fetchRefinementBatches();
}

/** Create one batch. Rejects an id that already exists. */
export async function createRefinementBatch(batch: RefinementBatch, uid: string | null): Promise<void> {
  await (await impl()).createRefinementBatch(batch, uid);
}

/** Move one batch to a new workflow status. */
export async function updateRefinementBatchStatus(
  batchId: string,
  status: RefinementBatchStatus,
  uid: string | null,
  updatedAt: string,
): Promise<void> {
  await (await impl()).updateRefinementBatchStatus(batchId, status, uid, updatedAt);
}

/** Create-only migration of the shipped seed and any browser-local batches. */
export async function seedRefinementBatches(
  batches: readonly RefinementBatch[],
  uid: string | null,
): Promise<SeedResult> {
  return (await impl()).seedRefinementBatches(batches, uid);
}
