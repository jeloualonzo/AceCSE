import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { RefinementBatch } from '@/data/refinementBatches';
import { mergeRefinementBatchSources } from './refinementBatchSource';

/**
 * The precedence rule is the whole contract of this module, and getting it
 * backwards is not a visible crash — it silently shows stale statuses. So it is
 * tested directly, on the pure merge, with no database or browser involved.
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

describe('refinement batch source precedence', () => {
  it('lets Firestore override the status a batch shipped with', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: [batch({ id: 'spelling-batch-01', status: 'ready-for-qa' })],
      seed: [batch({ id: 'spelling-batch-01', status: 'frozen' })],
      local: [],
    });

    // Resolving the other way round would make every transition invisible.
    expect(resolved.batches).toHaveLength(1);
    expect(resolved.batches[0].status).toBe('ready-for-qa');
    expect(resolved.sourceById['spelling-batch-01']).toBe('firestore');
  });

  it('lets a browser-local transition override the status a batch shipped with', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: null,
      seed: [batch({ id: 'spelling-batch-01', status: 'frozen', title: 'Shipped title' })],
      local: [
        batch({
          id: 'spelling-batch-01',
          status: 'ready-for-qa',
          title: 'Shipped title',
          updatedAt: '2026-08-23T10:00:00+08:00',
        }),
      ],
    });

    // A batch only reaches localStorage because this admin moved it there while
    // Firestore was unreachable. Ranking the shipped baseline higher would revert
    // the transition on the next read, moments after the UI said it was saved.
    expect(resolved.batches).toHaveLength(1);
    expect(resolved.batches[0].status).toBe('ready-for-qa');
    expect(resolved.batches[0].updatedAt).toBe('2026-08-23T10:00:00+08:00');
    expect(resolved.sourceById['spelling-batch-01']).toBe('local');
  });

  it('still lets Firestore outrank a browser-local copy of the same batch', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: [batch({ id: 'spelling-batch-01', status: 'frozen' })],
      seed: [batch({ id: 'spelling-batch-01', status: 'needs-content' })],
      local: [batch({ id: 'spelling-batch-01', status: 'builder' })],
    });

    // Shared beats per-browser once the database is answering again.
    expect(resolved.batches[0].status).toBe('frozen');
    expect(resolved.sourceById['spelling-batch-01']).toBe('firestore');
  });

  it('keeps a browser-local batch that exists nowhere else, and marks it for migration', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: [batch({ id: 'stored-01' })],
      seed: [batch({ id: 'seeded-01' })],
      local: [batch({ id: 'local-only-01', status: 'builder' })],
    });

    expect(resolved.batches.map((entry) => entry.id).sort()).toEqual(['local-only-01', 'seeded-01', 'stored-01']);
    expect(resolved.sourceById['local-only-01']).toBe('local');
    expect(resolved.unseededIds.sort()).toEqual(['local-only-01', 'seeded-01']);
  });

  it('reports nothing as unseeded when the database was never reached', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: null,
      seed: [batch({ id: 'seeded-01' })],
      local: [batch({ id: 'local-only-01' })],
    });

    // "Unseeded" would be a lie here: no one asked Firestore what it holds.
    expect(resolved.unseededIds).toEqual([]);
    expect(resolved.batches).toHaveLength(2);
  });

  it('orders the merged result newest-first like the registry does', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: [batch({ id: 'b-old', createdAt: '2026-07-01T09:00:00+08:00' })],
      seed: [batch({ id: 'a-new', createdAt: '2026-08-15T09:00:00+08:00' })],
      local: [batch({ id: 'c-mid', createdAt: '2026-08-01T09:00:00+08:00' })],
    });

    expect(resolved.batches.map((entry) => entry.id)).toEqual(['a-new', 'c-mid', 'b-old']);
  });

  it('counts each id once when all three stores know about it', () => {
    const resolved = mergeRefinementBatchSources({
      firestore: [batch({ id: 'everywhere' })],
      seed: [batch({ id: 'everywhere' })],
      local: [batch({ id: 'everywhere' })],
    });

    expect(resolved.batches).toHaveLength(1);
    expect(resolved.unseededIds).toEqual([]);
  });
});

describe('refinement batch loading falls back honestly', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/services/refinementBatchStore');
    vi.doUnmock('@/data/contentBankWorkspace');
  });

  it('keeps working on the shipped seed when Firestore refuses, and names the reason', async () => {
    vi.doMock('@/services/refinementBatchStore', () => ({
      fetchRefinementBatches: vi.fn(async () => {
        throw new Error('Missing or insufficient permissions.');
      }),
      createRefinementBatch: vi.fn(),
      updateRefinementBatchStatus: vi.fn(),
      seedRefinementBatches: vi.fn(),
    }));

    const { loadRefinementBatches } = await import('./refinementBatchSource');
    const load = await loadRefinementBatches();

    expect(load.writeTarget).toBe('local');
    // Verbatim, because "insufficient permissions" is the signal that
    // firestore.rules has not been deployed — a flattened message hides that.
    expect(load.degradedReason).toBe('Missing or insufficient permissions.');
    expect(load.batches.length).toBeGreaterThan(0);
    expect(load.unseededIds).toEqual([]);
  });

  it('writes to Firestore when it answers, and surfaces documents it had to skip', async () => {
    vi.doMock('@/services/refinementBatchStore', () => ({
      fetchRefinementBatches: vi.fn(async () => ({ batches: [], skippedIds: ['corrupt-01'] })),
      createRefinementBatch: vi.fn(),
      updateRefinementBatchStatus: vi.fn(),
      seedRefinementBatches: vi.fn(),
    }));

    const { loadRefinementBatches } = await import('./refinementBatchSource');
    const load = await loadRefinementBatches();

    expect(load.writeTarget).toBe('firestore');
    expect(load.degradedReason).toBeNull();
    expect(load.skippedIds).toEqual(['corrupt-01']);
    // Empty Firestore + shipped seed means every seed batch still needs seeding.
    expect(load.unseededIds.length).toBe(load.batches.length);
  });

  it('falls back to this browser when a create is refused, and says where it landed', async () => {
    const persisted: RefinementBatch[] = [];
    vi.doMock('@/services/refinementBatchStore', () => ({
      fetchRefinementBatches: vi.fn(),
      createRefinementBatch: vi.fn(async () => {
        throw new Error('Missing or insufficient permissions.');
      }),
      updateRefinementBatchStatus: vi.fn(),
      seedRefinementBatches: vi.fn(),
    }));
    vi.doMock('@/data/contentBankWorkspace', () => ({
      readLocalRefinementBatches: () => persisted,
      persistLocalRefinementBatch: (entry: RefinementBatch) => {
        persisted.push(entry);
        return [];
      },
    }));

    const { saveRefinementBatch } = await import('./refinementBatchSource');
    const placement = await saveRefinementBatch(batch({ id: 'new-01' }), 'uid-1', 'firestore');

    expect(placement).toEqual({ target: 'local', fallbackReason: 'Missing or insufficient permissions.' });
    expect(persisted.map((entry) => entry.id)).toEqual(['new-01']);
  });

  it('records the new status in the local fallback so a first transition sticks', async () => {
    const persisted: RefinementBatch[] = [];
    vi.doMock('@/services/refinementBatchStore', () => ({
      fetchRefinementBatches: vi.fn(),
      createRefinementBatch: vi.fn(),
      updateRefinementBatchStatus: vi.fn(async () => {
        throw new Error('Missing or insufficient permissions.');
      }),
      seedRefinementBatches: vi.fn(),
    }));
    vi.doMock('@/data/contentBankWorkspace', () => ({
      readLocalRefinementBatches: () => persisted,
      persistLocalRefinementBatch: (entry: RefinementBatch) => {
        persisted.push(entry);
        return [];
      },
    }));

    const { saveRefinementBatchStatus } = await import('./refinementBatchSource');
    const placement = await saveRefinementBatchStatus(
      batch({ id: 'seeded-01', status: 'frozen' }),
      'ready-for-qa',
      'uid-1',
      'firestore',
      '2026-08-23T10:00:00+08:00',
    );

    expect(placement.target).toBe('local');
    expect(persisted[0]).toMatchObject({
      id: 'seeded-01',
      status: 'ready-for-qa',
      updatedAt: '2026-08-23T10:00:00+08:00',
    });
  });
});
