import {
  getRefinementBatches,
  REFINEMENT_BATCHES,
  type RefinementBatch,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';
import { persistLocalRefinementBatch, readLocalRefinementBatches } from '@/data/contentBankWorkspace';
import { withoutRetiredRefinementBatches } from '@/data/retiredRefinementBatches';
import {
  createRefinementBatch,
  fetchRefinementBatches,
  seedRefinementBatches,
  updateRefinementBatchStatus,
} from '@/services/refinementBatchStore';

/**
 * Where refinement batches come from, and which store wins when more than one
 * knows about the same batch.
 *
 * Three stores exist, for three different reasons:
 *
 * - **Firestore** — the live system of record. Status transitions have to
 *   survive a different browser and a different machine, which is the whole
 *   point of persisting the workflow.
 * - **The shipped seed** (`content/qa/refinement-batches.json`) — the reviewed
 *   historical record of what has already been through QA. It ships with the
 *   app and is the baseline before anything is stored.
 * - **Browser localStorage** — a fallback so the Content Bank still works when
 *   Firestore is unreachable or its rules are not deployed yet.
 *
 * PRECEDENCE: `firestore` > `local` > `seed`.
 *
 * Firestore outranks both because it is the system of record: a batch that has
 * moved on from its shipped status must show its current one, and resolving the
 * other way would render every transition invisible.
 *
 * localStorage outranks the seed because it never holds a passive copy. A batch
 * is written there only when this admin created it or moved it while Firestore
 * was unreachable, so ranking the shipped baseline above that deliberate action
 * would revert the transition on the next read — moments after the UI reported
 * it saved. The trade-off is accepted knowingly: a browser that advanced a
 * shipped batch keeps showing its own status even if the registry file later
 * ships a different one, and every such batch is labelled this-browser-only so
 * the reason is on screen. Once Firestore answers again it outranks both, and
 * the create-only migration carries the local status up rather than the stale
 * shipped one.
 *
 * Which store a batch actually came from is surfaced in the UI rather than
 * inferred, so an admin can tell whether their changes are being persisted for
 * everyone or only for them.
 */

export type RefinementBatchSourceKind = 'firestore' | 'seed' | 'local';

export interface RefinementBatchSourceInput {
  /** Firestore contents, or `null` when the database was not reached. */
  firestore: readonly RefinementBatch[] | null;
  seed: readonly RefinementBatch[];
  local: readonly RefinementBatch[];
}

export interface ResolvedRefinementBatches {
  /** Newest-first, the same ordering the registry uses. */
  batches: RefinementBatch[];
  sourceById: Record<string, RefinementBatchSourceKind>;
  /**
   * Batches known locally that Firestore has not stored. Empty when Firestore
   * was not reached — nothing is "unseeded" if the database was never asked.
   */
  unseededIds: string[];
}

/**
 * Pure merge of the three stores. Separated from the I/O below so the
 * precedence rule can be tested without a database or a browser.
 */
export function mergeRefinementBatchSources(input: RefinementBatchSourceInput): ResolvedRefinementBatches {
  const resolved = new Map<string, RefinementBatch>();
  const sourceById: Record<string, RefinementBatchSourceKind> = {};

  // Retired ids leave every layer here, Firestore included. Filtering only the
  // local layer would be enough to stop the migration re-creating a retired
  // document, but not to stop one that is *already* stored — or one another
  // machine seeded before it picked up this build — from showing in the batch
  // list. Doing it once, at the merge, means a single rule covers all three
  // stores and nothing downstream can reintroduce them: `unseededIds` is
  // derived from these same filtered layers, so migration never queues one.
  const seed = withoutRetiredRefinementBatches(input.seed);
  const local = withoutRetiredRefinementBatches(input.local);
  // `null` means Firestore was never reached, which is not the same as empty and
  // must survive the filter — `unseededIds` depends on the distinction.
  const firestore = input.firestore === null ? null : withoutRetiredRefinementBatches(input.firestore);

  // Lowest precedence first; later stores overwrite earlier ones.
  const layers: { kind: RefinementBatchSourceKind; batches: readonly RefinementBatch[] }[] = [
    { kind: 'seed', batches: seed },
    { kind: 'local', batches: local },
    { kind: 'firestore', batches: firestore ?? [] },
  ];
  for (const layer of layers) {
    for (const batch of layer.batches) {
      resolved.set(batch.id, batch);
      sourceById[batch.id] = layer.kind;
    }
  }

  const stored = new Set((firestore ?? []).map((batch) => batch.id));
  const unseededIds = firestore === null
    ? []
    : [...new Set([...seed, ...local].map((batch) => batch.id))].filter((id) => !stored.has(id));

  return { batches: getRefinementBatches([...resolved.values()]), sourceById, unseededIds };
}

export interface RefinementBatchLoad extends ResolvedRefinementBatches {
  /** The store that will receive writes. */
  writeTarget: 'firestore' | 'local';
  /** Why Firestore is not in use. `null` when it is. */
  degradedReason: string | null;
  /** Stored documents that failed validation and were left out. */
  skippedIds: string[];
}

/**
 * Read every store and merge them.
 *
 * A Firestore failure is not fatal: the Content Bank falls back to the shipped
 * seed plus browser-local batches and says so, rather than showing an empty
 * page. `degradedReason` is the message the UI displays — the most common cause
 * is `firestore.rules` not being deployed yet, so the reason is kept verbatim
 * instead of being flattened into "something went wrong".
 */
export async function loadRefinementBatches(): Promise<RefinementBatchLoad> {
  const seed = getRefinementBatches(REFINEMENT_BATCHES);
  const local = readLocalRefinementBatches();

  try {
    const { batches, skippedIds } = await fetchRefinementBatches();
    return {
      ...mergeRefinementBatchSources({ firestore: batches, seed, local }),
      writeTarget: 'firestore',
      degradedReason: null,
      skippedIds,
    };
  } catch (error) {
    return {
      ...mergeRefinementBatchSources({ firestore: null, seed, local }),
      writeTarget: 'local',
      degradedReason: error instanceof Error ? error.message : String(error),
      skippedIds: [],
    };
  }
}

/**
 * Bring Firestore up to date with the shipped seed and any browser-local
 * batches. Create-only, so a status someone already advanced is never reverted.
 */
export async function migrateRefinementBatches(uid: string | null): Promise<{ created: string[]; failures: string[] }> {
  const load = await loadRefinementBatches();
  if (load.writeTarget !== 'firestore' || load.unseededIds.length === 0) {
    return { created: [], failures: [] };
  }
  const byId = new Map(load.batches.map((batch) => [batch.id, batch]));
  const pending = load.unseededIds.map((id) => byId.get(id)).filter((batch): batch is RefinementBatch => Boolean(batch));
  const result = await seedRefinementBatches(pending, uid);
  return {
    created: result.createdIds,
    failures: result.failures.map((failure) => `${failure.id}: ${failure.message}`),
  };
}

export interface WritePlacement {
  /** Where the write landed, so the UI can label it honestly. */
  target: 'firestore' | 'local';
  /** Present when Firestore refused and the local fallback was used instead. */
  fallbackReason: string | null;
}

/**
 * Persist a new batch, preferring Firestore and falling back to this browser.
 *
 * The fallback exists so an admin is never blocked by an undeployed ruleset, but
 * it is reported rather than hidden: a batch that only lives in one browser is a
 * materially different thing from one the team can see.
 */
export async function saveRefinementBatch(
  batch: RefinementBatch,
  uid: string | null,
  target: 'firestore' | 'local',
): Promise<WritePlacement> {
  if (target === 'firestore') {
    try {
      await createRefinementBatch(batch, uid);
      return { target: 'firestore', fallbackReason: null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const errors = persistLocalRefinementBatch(batch);
      if (errors.length > 0) throw new Error(`${reason} Local fallback also failed: ${errors[0]}`);
      return { target: 'local', fallbackReason: reason };
    }
  }
  const errors = persistLocalRefinementBatch(batch);
  if (errors.length > 0) throw new Error(errors[0]);
  return { target: 'local', fallbackReason: null };
}

/**
 * Persist a validated status selection. The store re-validates the known status
 * value; this helper only decides where the update is written.
 *
 * The local fallback writes the whole batch, because a seed-only batch has no
 * local row to update yet — an upsert is what makes the first transition on a
 * shipped batch stick.
 */
export async function saveRefinementBatchStatus(
  batch: RefinementBatch,
  status: RefinementBatchStatus,
  uid: string | null,
  target: 'firestore' | 'local',
  updatedAt: string,
): Promise<WritePlacement> {
  if (target === 'firestore') {
    try {
      await updateRefinementBatchStatus(batch.id, status, uid, updatedAt);
      return { target: 'firestore', fallbackReason: null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const errors = persistLocalRefinementBatch({ ...batch, status, updatedAt });
      if (errors.length > 0) throw new Error(`${reason} Local fallback also failed: ${errors[0]}`);
      return { target: 'local', fallbackReason: reason };
    }
  }
  const errors = persistLocalRefinementBatch({ ...batch, status, updatedAt });
  if (errors.length > 0) throw new Error(errors[0]);
  return { target: 'local', fallbackReason: null };
}
