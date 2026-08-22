import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import {
  getRefinementBatches,
  REFINEMENT_BATCHES,
  refinementStatusLabel,
  validateRefinementBatches,
} from './refinementBatches';

const ALL_SUBJECTS = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
] as const;

const EXPECTED_BATCHES = [
  { id: 'filing-batch-01', title: 'Filing & Alphabetizing — Batch 1', status: 'ready-for-qa', count: 10, ids: ['cler-0053','cler-0054','cler-0058','cler-0059','cler-0060','cler-0001','cler-0002','cler-0003','cler-0004','cler-0005'] },
  { id: 'spelling-batch-02', title: 'Spelling — Batch 2', status: 'frozen', count: 7, ids: ['cler-0016','cler-0017','cler-0018','cler-0019','cler-0046','cler-0047','cler-0048'] },
  { id: 'spelling-batch-01', title: 'Spelling — Batch 1', status: 'frozen', count: 5, ids: ['cler-0055','cler-0012','cler-0013','cler-0014','cler-0015'] },
  { id: 'number-series-batch-04', title: 'Number Series — Batch 4', status: 'frozen', count: 3, ids: ['num-0108','num-0137','num-0147'] },
  { id: 'number-series-batch-03', title: 'Number Series — Batch 3', status: 'frozen', count: 2, ids: ['num-0025','num-0026'] },
  { id: 'number-series-batch-02', title: 'Number Series — Batch 2', status: 'frozen', count: 3, ids: ['num-0022','num-0023','num-0024'] },
  { id: 'number-series-batch-01', title: 'Number Series — Batch 1', status: 'frozen', count: 3, ids: ['num-0019','num-0020','num-0021'] },
] as const;

describe('refinement batch registry', () => {
  it('loads exactly the seven approved batches with valid schema and status labels', () => {
    expect(validateRefinementBatches(REFINEMENT_BATCHES)).toEqual([]);
    expect(REFINEMENT_BATCHES).toHaveLength(7);
    for (const [index, expected] of EXPECTED_BATCHES.entries()) {
      const batch = getRefinementBatches()[index];
      expect(batch).toMatchObject({ id: expected.id, title: expected.title, status: expected.status });
      expect(batch.questionIds).toEqual(expected.ids);
      expect(batch.questionIds).toHaveLength(expected.count);
      expect(refinementStatusLabel(batch.status)).toBe(expected.status === 'frozen' ? 'Frozen' : 'Ready for QA');
      expect(Object.keys(batch).sort()).toEqual(['createdAt', 'family', 'id', 'questionIds', 'status', 'title']);
    }
  });

  it('orders batches newest-first by createdAt, independent of input array order', () => {
    const reordered = [...REFINEMENT_BATCHES].reverse();
    expect(getRefinementBatches(reordered).map((batch) => batch.id)).toEqual(EXPECTED_BATCHES.map((batch) => batch.id));
    const dates = getRefinementBatches().map((batch) => Date.parse(batch.createdAt));
    expect(dates.every((date, index) => index === 0 || date <= dates[index - 1])).toBe(true);
  });

  it('resolves every registered ID to an active production question without changing production metadata', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const allBatchIds = REFINEMENT_BATCHES.flatMap((batch) => batch.questionIds);
    expect(allBatchIds).toHaveLength(new Set(allBatchIds).size);
    expect(allBatchIds.every((id) => catalog.questions.has(id))).toBe(true);
    expect(allBatchIds.every((id) => !('batchId' in (catalog.questions.get(id) ?? {})))).toBe(true);
    expect(allBatchIds.every((id) => !('batchStatus' in (catalog.questions.get(id) ?? {})))).toBe(true);
  });

  it('rejects duplicate IDs and invalid future batch data without constraining valid future statuses beyond the contract', () => {
    const invalid = [{
      id: 'duplicate',
      title: 'Duplicate',
      family: 'Test',
      status: 'frozen',
      createdAt: '2026-08-22T00:00:00Z',
      questionIds: ['cler-0053', 'cler-0053'],
    }, {
      id: 'duplicate',
      title: '',
      family: 'Test',
      status: 'unknown',
      createdAt: 'not-a-date',
      questionIds: [],
    }];
    const errors = validateRefinementBatches(invalid);
    expect(errors.some((error) => error.includes('duplicated'))).toBe(true);
    expect(errors.some((error) => error.includes('questionIds contains duplicates'))).toBe(true);
    expect(errors.some((error) => error.includes('status is invalid'))).toBe(true);
    expect(errors.some((error) => error.includes('createdAt'))).toBe(true);
  });
});
