import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RefinementBatch } from '@/data/refinementBatches';

/**
 * The write boundary refuses retired ids.
 *
 * Every upstream layer already filters them, so this check is redundant on the
 * paths that exist today — deliberately. It is the only one that holds for a
 * caller written later, and `seedRefinementBatches` is the exact function that
 * put the accidental batch back into Firestore on every admin page mount. Making
 * the refusal a property of the write itself is what lets "it cannot be
 * re-created" be a fact rather than a convention.
 */

const state = vi.hoisted(() => ({
  existing: new Set<string>(),
  reads: [] as string[],
  writes: [] as { id: string; data: Record<string, unknown> }[],
}));

vi.mock('@/lib/firestore', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: () => ({ path: 'refinementBatches' }),
  doc: (_parent: unknown, id: string) => ({ id }),
  getDoc: async (ref: { id: string }) => {
    state.reads.push(ref.id);
    return { exists: () => state.existing.has(ref.id) };
  },
  setDoc: async (ref: { id: string }, data: Record<string, unknown>) => {
    state.writes.push({ id: ref.id, data });
  },
  getDocs: async () => ({ docs: [] }),
  updateDoc: async () => undefined,
}));

const { seedRefinementBatches } = await import('./refinementBatchStoreImpl');

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

describe('seedRefinementBatches', () => {
  beforeEach(() => {
    state.existing.clear();
    state.reads.length = 0;
    state.writes.length = 0;
  });

  it('refuses to write a retired batch and still migrates the rest', async () => {
    const result = await seedRefinementBatches(
      [batch({ id: 'batch2', family: 'Clerical Operations' }), batch({ id: 'local-only-01' })],
      'uid-1',
    );

    expect(result.retiredIds).toEqual(['batch2']);
    expect(result.createdIds).toEqual(['local-only-01']);
    expect(state.writes.map((write) => write.id)).toEqual(['local-only-01']);
  });

  it('reports a retired id separately from one that was already present', async () => {
    state.existing.add('stored-01');

    const result = await seedRefinementBatches(
      [batch({ id: 'batch2' }), batch({ id: 'stored-01' })],
      null,
    );

    // `skippedIds` means "already there, left as it was" — the opposite of a
    // refusal. Folding the two together would report the retired batch as
    // present in Firestore, which is the one thing this cleanup denies.
    expect(result.skippedIds).toEqual(['stored-01']);
    expect(result.retiredIds).toEqual(['batch2']);
    expect(result.failures).toEqual([]);
  });

  it('refuses without asking Firestore what it holds', async () => {
    await seedRefinementBatches([batch({ id: 'batch2' })], 'uid-1');

    // Not conditional on the stored state: a lingering document elsewhere must
    // not turn the refusal into a skip, and there is nothing to look up.
    expect(state.reads).toEqual([]);
    expect(state.writes).toEqual([]);
  });
});
