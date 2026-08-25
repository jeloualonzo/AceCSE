import type { RefinementBatch } from '@/data/refinementBatches';

/**
 * Batch ids that must never appear again, in any store.
 *
 * The refinement workflow has no delete operation, on purpose: a batch records
 * that questions were claimed and reviewed, and erasing that history would make
 * the workspace lie about what has been through QA. This list is the narrow
 * exception — ids that never recorded real work and whose continued presence is
 * itself the inaccuracy.
 *
 * Retirement is not deletion of anything canonical. Nothing here may name a
 * batch in `content/qa/refinement-batches.json`; that file is the reviewed
 * historical record and `retiredRefinementBatches.test.ts` asserts the two sets
 * stay disjoint, so a future entry cannot quietly retire real QA history.
 *
 * WHY A LIST AND NOT A ONE-OFF CLEANUP: the Content Bank has three stores
 * (Firestore, the shipped seed, browser localStorage) and a create-only
 * migration that pushes local batches up to Firestore. Deleting the Firestore
 * document alone is undone by the next admin page mount, because the browser
 * copy is still there and still looks unseeded. Naming the id in one place and
 * honouring it at every store boundary is what makes the removal stick.
 */
export const RETIRED_REFINEMENT_BATCH_IDS: readonly string[] = [
  // Created by accident against the pre-Firestore, browser-local Content Bank
  // while the batch-creation flow was being built: ten arbitrary Clerical
  // Ability questions, scooped up to see whether the form worked. The family it
  // names is a real one — the batch is what was never real. No refinement work
  // was ever recorded against it.
  'batch2',
];

const RETIRED = new Set(RETIRED_REFINEMENT_BATCH_IDS);

export function isRetiredRefinementBatchId(id: string): boolean {
  return RETIRED.has(id);
}

/**
 * Drops retired batches, preserving everything else in order.
 *
 * Generic over the element type so it can filter Firestore documents, seed
 * entries, and localStorage rows through one rule — three call sites that would
 * otherwise each need their own copy of it.
 */
export function withoutRetiredRefinementBatches<T extends Pick<RefinementBatch, 'id'>>(
  batches: readonly T[],
): T[] {
  return batches.filter((batch) => !isRetiredRefinementBatchId(batch.id));
}
