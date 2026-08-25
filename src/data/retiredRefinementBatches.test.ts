// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  RETIRED_REFINEMENT_BATCH_IDS,
  isRetiredRefinementBatchId,
  withoutRetiredRefinementBatches,
} from './retiredRefinementBatches';
import { REFINEMENT_BATCHES, type RefinementBatch } from './refinementBatches';
import { WORKSPACE_BATCHES_STORAGE_KEY, readLocalRefinementBatches } from './contentBankWorkspace';

/**
 * Retiring a batch id has to be permanent, and it has to be narrow.
 *
 * Permanent, because the Content Bank has three stores and a create-only
 * migration that pushes browser-local batches into Firestore: deleting the
 * stored document while a browser copy survives means the next admin page mount
 * writes it straight back. These tests exercise the boundaries that close that
 * loop, so a future refactor that reopens it fails here instead of in the
 * workspace weeks later.
 *
 * Narrow, because the same mechanism pointed at a real id would erase reviewed
 * QA history. The invariant below is the guard: nothing in the shipped registry
 * may ever be retired.
 */

function batch(overrides: Partial<RefinementBatch> & Pick<RefinementBatch, 'id'>): RefinementBatch {
  return {
    title: `Batch ${overrides.id}`,
    family: 'Spelling',
    status: 'frozen',
    createdAt: '2026-08-01T09:00:00+08:00',
    questionIds: ['cler-0001'],
    ...overrides,
  };
}

function store(batches: unknown[]): void {
  window.localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify(batches));
}

function stored(): unknown {
  const raw = window.localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe('the retired batch list', () => {
  it('retires the accidental batch2 and nothing else', () => {
    expect(isRetiredRefinementBatchId('batch2')).toBe(true);
    expect(RETIRED_REFINEMENT_BATCH_IDS).toEqual(['batch2']);
  });

  it('never names a batch from the shipped registry', () => {
    // The invariant that keeps this mechanism from being turned on real QA
    // history. `content/qa/refinement-batches.json` is the reviewed record of
    // what has been through refinement; retiring an id in it would delete that
    // record from Firestore and then refuse to let it back.
    const canonical = REFINEMENT_BATCHES.map((entry) => entry.id);
    const collisions = RETIRED_REFINEMENT_BATCH_IDS.filter((id) => canonical.includes(id));
    expect(collisions).toEqual([]);
  });

  it('leaves the frozen batches an admin actually reviewed alone', () => {
    // Named explicitly rather than derived, so renaming a canonical id cannot
    // make this pass vacuously.
    for (const id of [
      'filing-batch-01',
      'filing-batch-02',
      'spelling-batch-01',
      'spelling-batch-02',
      'grammar-pilot-01',
      'number-series-batch-01',
      'number-series-batch-02',
      'number-series-batch-03',
      'number-series-batch-04',
    ]) {
      expect(isRetiredRefinementBatchId(id)).toBe(false);
    }
  });

  it('drops retired entries and keeps the rest in order', () => {
    const kept = withoutRetiredRefinementBatches([
      batch({ id: 'filing-batch-01' }),
      batch({ id: 'batch2' }),
      batch({ id: 'spelling-batch-02' }),
    ]);

    expect(kept.map((entry) => entry.id)).toEqual(['filing-batch-01', 'spelling-batch-02']);
  });
});

describe('the browser-local store forgets retired batches', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hides a retired batch from the read and rewrites it out of storage', () => {
    store([batch({ id: 'batch2', family: 'Clerical Operations' }), batch({ id: 'local-only-01' })]);

    const read = readLocalRefinementBatches();

    expect(read.map((entry) => entry.id)).toEqual(['local-only-01']);
    // Filtering the read alone would leave the row in the browser forever,
    // waiting for any future code path that reads the key directly. It has to
    // physically leave.
    expect(stored()).toEqual([batch({ id: 'local-only-01' })]);
  });

  it('removes the key entirely when the retired batch was the only entry', () => {
    store([batch({ id: 'batch2' })]);

    expect(readLocalRefinementBatches()).toEqual([]);
    expect(stored()).toBeNull();
  });

  it('preserves legitimate local batches untouched', () => {
    const legitimate = [
      batch({ id: 'local-only-01', status: 'builder' }),
      batch({ id: 'local-only-02', status: 'ready-for-qa' }),
    ];
    store(legitimate);

    expect(readLocalRefinementBatches()).toEqual(legitimate);
    // Byte-identical: a read with nothing to clean up must not write at all.
    expect(window.localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY)).toBe(JSON.stringify(legitimate));
  });

  it('still rescues legitimate batches when the retired row is malformed', () => {
    // The stored blob is discarded wholesale if validation fails, so a retired
    // batch that is *also* broken would take every real local batch down with
    // it — and, because that discard returns early, never be rewritten away.
    // Retired ids are therefore removed before validation runs.
    store([{ id: 'batch2' }, batch({ id: 'local-only-01' })]);

    expect(readLocalRefinementBatches().map((entry) => entry.id)).toEqual(['local-only-01']);
    expect(stored()).toEqual([batch({ id: 'local-only-01' })]);
  });

  it('still discards the blob wholesale when a non-retired batch is malformed', () => {
    store([{ id: 'local-only-01', title: 'Half a batch' }]);

    // Unchanged fail-closed behaviour: a partially-read batch would under-report
    // which questions are already claimed.
    expect(readLocalRefinementBatches()).toEqual([]);
  });
});
