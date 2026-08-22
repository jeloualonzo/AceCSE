import { describe, expect, it } from 'vitest';
import { loadContentCatalog, loadQuestionIndex } from './questionBank';
import {
  getRefinementBatches,
  REFINEMENT_BATCHES,
  refinementStatusLabel,
  validateRefinementBatches,
  validateRefinementBatchesAgainstCatalog,
} from './refinementBatches';

const ALL_SUBJECTS = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
] as const;

const EXPECTED_BATCHES = [
  { id: 'filing-batch-02', title: 'Filing & Alphabetizing — Batch 2', status: 'frozen', count: 14, ids: ['cler-0006','cler-0007','cler-0008','cler-0009','cler-0010','cler-0011','cler-0031','cler-0032','cler-0033','seed-cler-001','cler-0036','cler-0037','cler-0038','cler-0039'] },
  { id: 'filing-batch-01', title: 'Filing & Alphabetizing — Batch 1', status: 'frozen', count: 10, ids: ['cler-0053','cler-0054','cler-0058','cler-0059','cler-0060','cler-0001','cler-0002','cler-0003','cler-0004','cler-0005'] },
  { id: 'spelling-batch-02', title: 'Spelling — Batch 2', status: 'frozen', count: 7, ids: ['cler-0016','cler-0017','cler-0018','cler-0019','cler-0046','cler-0047','cler-0048'] },
  { id: 'spelling-batch-01', title: 'Spelling — Batch 1', status: 'frozen', count: 5, ids: ['cler-0055','cler-0012','cler-0013','cler-0014','cler-0015'] },
  { id: 'number-series-batch-04', title: 'Number Series — Batch 4', status: 'frozen', count: 3, ids: ['num-0108','num-0137','num-0147'] },
  { id: 'number-series-batch-03', title: 'Number Series — Batch 3', status: 'frozen', count: 2, ids: ['num-0025','num-0026'] },
  { id: 'number-series-batch-02', title: 'Number Series — Batch 2', status: 'frozen', count: 3, ids: ['num-0022','num-0023','num-0024'] },
  { id: 'number-series-batch-01', title: 'Number Series — Batch 1', status: 'frozen', count: 3, ids: ['num-0019','num-0020','num-0021'] },
] as const;

describe('refinement batch registry', () => {
  it('loads exactly the eight approved batches with valid schema and status labels', () => {
    expect(validateRefinementBatches(REFINEMENT_BATCHES)).toEqual([]);
    expect(REFINEMENT_BATCHES).toHaveLength(8);
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

/**
 * The registry validator itself — not the Practice engine downstream — must
 * reject a nonexistent question ID, so a broken Practice Batch button can never
 * be exposed in the first place. Resolution runs against the active production
 * catalog through the production loader's own `loadQuestionIndex`.
 */
describe('refinement batch question-ID resolution', () => {
  /** The exact malformed entry independent QA reported as passing validation. */
  const QA_REPORTED_BATCH = {
    id: 'test-batch',
    title: 'Test Batch',
    family: 'Filing & Alphabetizing',
    status: 'ready-for-qa',
    createdAt: '2026-08-22T20:00:00+08:00',
    questionIds: ['cler-0053', 'cler-9999'],
  };

  async function activeQuestionIds(): Promise<Set<string>> {
    return new Set((await loadQuestionIndex(ALL_SUBJECTS)).keys());
  }

  it('accepts the seven-batch registry against the active production catalog', async () => {
    expect(await validateRefinementBatchesAgainstCatalog()).toEqual([]);
    expect(await validateRefinementBatchesAgainstCatalog(REFINEMENT_BATCHES)).toEqual([]);
  });

  it('rejects a structurally valid batch whose question ID does not exist', async () => {
    // Structure alone is clean — which is exactly why the old gate let it pass.
    expect(validateRefinementBatches([QA_REPORTED_BATCH])).toEqual([]);

    const errors = validateRefinementBatches([QA_REPORTED_BATCH], await activeQuestionIds());
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('batch[0].questionIds');
    expect(errors[0]).toContain('cler-9999');
    expect(await validateRefinementBatchesAgainstCatalog([QA_REPORTED_BATCH])).toEqual(errors);
  });

  it('accepts the same batch once every ID resolves to an active question', async () => {
    const repaired = { ...QA_REPORTED_BATCH, questionIds: ['cler-0053', 'cler-0054'] };
    expect(validateRefinementBatches([repaired], await activeQuestionIds())).toEqual([]);
    expect(await validateRefinementBatchesAgainstCatalog([repaired])).toEqual([]);
  });

  it('reports every unresolved ID rather than stopping at the first', async () => {
    const errors = validateRefinementBatches(
      [{ ...QA_REPORTED_BATCH, questionIds: ['cler-9998', 'cler-0053', 'num-9999'] }],
      await activeQuestionIds(),
    );
    expect(errors).toHaveLength(2);
    expect(errors.some((error) => error.includes('cler-9998'))).toBe(true);
    expect(errors.some((error) => error.includes('num-9999'))).toBe(true);
    expect(errors.some((error) => error.includes('cler-0053'))).toBe(false);
  });

  it('keeps every structural rule intact when catalog resolution is enabled', async () => {
    const knownQuestionIds = await activeQuestionIds();
    const errors = validateRefinementBatches([{
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
    }], knownQuestionIds);

    expect(errors.some((error) => error.includes('duplicated'))).toBe(true);
    expect(errors.some((error) => error.includes('questionIds contains duplicates'))).toBe(true);
    expect(errors.some((error) => error.includes('status is invalid'))).toBe(true);
    expect(errors.some((error) => error.includes('createdAt'))).toBe(true);
    expect(errors.some((error) => error.includes('title must be non-empty'))).toBe(true);
    expect(errors.some((error) => error.includes('questionIds must contain at least one ID'))).toBe(true);
    // Resolution never fires for structurally rejected id lists.
    expect(errors.some((error) => error.includes('active production catalog'))).toBe(false);
    expect(validateRefinementBatches(['not-an-object'], knownQuestionIds)).toEqual(['batch[0] must be an object']);
    expect(validateRefinementBatches('not-an-array', knownQuestionIds)).toEqual(['refinement batch data must be an array']);
  });

  it('reports blank and non-string IDs structurally instead of as unresolved', async () => {
    const errors = validateRefinementBatches(
      [{ ...QA_REPORTED_BATCH, questionIds: ['cler-0053', '   ', 42] }],
      await activeQuestionIds(),
    );
    expect(errors).toEqual(['batch[0].questionIds must contain only non-empty strings']);
  });

  it('omitting the catalog set leaves validation exactly as strict as before', () => {
    // The synchronous module-load gate calls it this way; it must stay unchanged.
    expect(validateRefinementBatches(REFINEMENT_BATCHES)).toEqual([]);
    expect(validateRefinementBatches(REFINEMENT_BATCHES, undefined)).toEqual([]);
    expect(validateRefinementBatches([{ ...QA_REPORTED_BATCH, questionIds: [] }]))
      .toEqual(['batch[0].questionIds must contain at least one ID']);
  });
});
