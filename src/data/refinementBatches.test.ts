import { describe, expect, it } from 'vitest';
import { loadContentCatalog, loadQuestionIndex } from './questionBank';
import {
  allowedNextRefinementStatuses,
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionRefinementStatus,
  DEFAULT_REFINEMENT_STATUS,
  generateRefinementBatchName,
  getRefinementBatches,
  isRefinementBatchStatus,
  nextRefinementSequence,
  REFINEMENT_BATCHES,
  REFINEMENT_STATUS_SEQUENCE,
  refinementFamilySlug,
  refinementStatusLabel,
  refinementTransitionError,
  validateRefinementBatches,
  validateRefinementBatchesAgainstCatalog,
  type RefinementBatch,
  type RefinementBatchStatus,
} from './refinementBatches';

const ALL_SUBJECTS = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
] as const;

const EXPECTED_BATCHES = [
  { id: 'averages-batch-01', title: 'Averages — Batch 1', family: 'Averages', status: 'frozen', count: 6, ids: ['num-0046','num-0047','num-0049','num-0145','num-0146','seed-num-005'] },
  { id: 'age-problems-batch-01', title: 'Age Problems — Batch 1', status: 'frozen', count: 3, ids: ['num-0030','num-0031','num-0142'] },
  { id: 'grammar-pilot-01', title: 'Grammar & Usage — Pilot', status: 'ready-for-qa', count: 4, ids: ['verb-0059','verb-0060','verb-0061','verb-0062'] },
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
  it('loads exactly the eleven approved batches with valid schema and status labels', () => {
    expect(validateRefinementBatches(REFINEMENT_BATCHES)).toEqual([]);
    expect(REFINEMENT_BATCHES).toHaveLength(11);
    for (const [index, expected] of EXPECTED_BATCHES.entries()) {
      const batch = getRefinementBatches()[index];
      expect(batch).toMatchObject({ id: expected.id, title: expected.title, status: expected.status });
      if ('family' in expected) expect(batch.family).toBe(expected.family);
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

  it('accepts the eleven-batch registry against the active production catalog', async () => {
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

describe('controlled refinement workflow statuses', () => {
  /** Structurally valid and fully resolvable, so only `status` is under test. */
  const CANDIDATE = {
    id: 'status-candidate',
    title: 'Status Candidate',
    family: 'Filing & Alphabetizing',
    createdAt: '2026-08-23T12:00:00+08:00',
    questionIds: ['cler-0053'],
  };

  it('runs Needs Content → Builder → Ready for QA → Frozen and labels each step', () => {
    expect([...REFINEMENT_STATUS_SEQUENCE]).toEqual(['needs-content', 'builder', 'ready-for-qa', 'frozen']);
    expect(REFINEMENT_STATUS_SEQUENCE.map(refinementStatusLabel)).toEqual([
      'Needs Content', 'Builder', 'Ready for QA', 'Frozen',
    ]);
    expect(DEFAULT_REFINEMENT_STATUS).toBe('needs-content');
    for (const status of REFINEMENT_STATUS_SEQUENCE) expect(isRefinementBatchStatus(status)).toBe(true);
    for (const rejected of ['Frozen', 'in-review', '', null, undefined, 7]) {
      expect(isRefinementBatchStatus(rejected)).toBe(false);
    }
  });

  it('accepts the two statuses the shipped seed registry already uses', () => {
    // The seed file predates this workflow; widening must not invalidate it.
    expect(validateRefinementBatches(REFINEMENT_BATCHES)).toEqual([]);
    expect(new Set(REFINEMENT_BATCHES.map((batch) => batch.status))).toEqual(new Set(['frozen', 'ready-for-qa']));
    for (const status of REFINEMENT_STATUS_SEQUENCE) {
      expect(validateRefinementBatches([{ ...CANDIDATE, status }])).toEqual([]);
    }
  });

  it('permits every direct move to a different known status', () => {
    expect(ALLOWED_STATUS_TRANSITIONS).toEqual({
      'needs-content': ['builder', 'ready-for-qa', 'frozen'],
      builder: ['needs-content', 'ready-for-qa', 'frozen'],
      'ready-for-qa': ['needs-content', 'builder', 'frozen'],
      frozen: ['needs-content', 'builder', 'ready-for-qa'],
    });
    for (const from of REFINEMENT_STATUS_SEQUENCE) {
      for (const to of REFINEMENT_STATUS_SEQUENCE) {
        expect(canTransitionRefinementStatus(from, to)).toBe(from !== to);
      }
      expect(allowedNextRefinementStatuses(from).every(isRefinementBatchStatus)).toBe(true);
      expect(allowedNextRefinementStatuses(from)).not.toContain(from);
      expect(allowedNextRefinementStatuses(from)).toHaveLength(REFINEMENT_STATUS_SEQUENCE.length - 1);
    }
  });

  it('explains no-op selections while allowing direct status changes', () => {
    expect(refinementTransitionError('needs-content', 'builder')).toBeNull();
    expect(refinementTransitionError('needs-content', 'frozen')).toBeNull();
    expect(refinementTransitionError('frozen', 'needs-content')).toBeNull();
    expect(refinementTransitionError('frozen', 'frozen')).toBe('This batch is already Frozen.');
  });
});

describe('automatic refinement batch numbering and titles', () => {
  function batch(id: string, title: string, family: string): RefinementBatch {
    return { id, title, family, status: 'frozen', createdAt: '2026-08-20T12:00:00+08:00', questionIds: ['cler-0001'] };
  }

  it('slugs a family name for use in an id', () => {
    expect(refinementFamilySlug('Filing & Alphabetizing')).toBe('filing-alphabetizing');
    expect(refinementFamilySlug('Number Series')).toBe('number-series');
    expect(refinementFamilySlug('Grammar & Usage')).toBe('grammar-usage');
    expect(refinementFamilySlug('  Reading   Comprehension  ')).toBe('reading-comprehension');
    // A family that slugs away entirely still yields a well-formed id fragment.
    expect(refinementFamilySlug('&&&')).toBe('family');
  });

  it('numbers the next batch from the highest number the family already used', () => {
    const existing = [
      batch('spelling-batch-01', 'Spelling — Batch 1', 'Spelling'),
      batch('spelling-batch-02', 'Spelling — Batch 2', 'Spelling'),
    ];
    expect(nextRefinementSequence('Spelling', existing)).toBe(3);
    expect(nextRefinementSequence('Number Series', existing)).toBe(1);
    expect(generateRefinementBatchName('Spelling', existing)).toEqual({
      id: 'spelling-batch-03',
      title: 'Spelling — Batch 3',
      sequence: 3,
    });
  });

  it('advances past an unnumbered batch rather than minting a second Batch 1', () => {
    // The shipped `Grammar & Usage — Pilot` carries no number in its title.
    const existing = [batch('grammar-pilot-01', 'Grammar & Usage — Pilot', 'Grammar & Usage')];
    expect(nextRefinementSequence('Grammar & Usage', existing)).toBe(2);
    expect(generateRefinementBatchName('Grammar & Usage', existing)).toMatchObject({
      id: 'grammar-usage-batch-02',
      title: 'Grammar & Usage — Batch 2',
    });
  });

  it('never generates an id that already exists', () => {
    const existing = [
      batch('spelling-batch-03', 'Spelling — Batch 1', 'Spelling'),
      batch('spelling-batch-04', 'Spelling — Batch 2', 'Spelling'),
    ];
    const generated = generateRefinementBatchName('Spelling', existing);
    expect(existing.map((item) => item.id)).not.toContain(generated.id);
    expect(generated).toEqual({ id: 'spelling-batch-05', title: 'Spelling — Batch 5', sequence: 5 });
  });

  it('generates a batch the registry validator accepts, for every family it ships', () => {
    const families = [...new Set(REFINEMENT_BATCHES.map((item) => item.family))];
    const seen = new Set(REFINEMENT_BATCHES.map((item) => item.id));
    for (const family of families) {
      const generated = generateRefinementBatchName(family, REFINEMENT_BATCHES);
      expect(seen.has(generated.id)).toBe(false);
      const status: RefinementBatchStatus = DEFAULT_REFINEMENT_STATUS;
      expect(validateRefinementBatches([{
        id: generated.id,
        title: generated.title,
        family,
        status,
        createdAt: '2026-08-23T12:00:00+08:00',
        questionIds: ['cler-0001'],
      }])).toEqual([]);
    }
    // Numbering continues the shipped sequences rather than restarting them.
    expect(generateRefinementBatchName('Filing & Alphabetizing', REFINEMENT_BATCHES).title)
      .toBe('Filing & Alphabetizing — Batch 3');
    expect(generateRefinementBatchName('Number Series', REFINEMENT_BATCHES).title)
      .toBe('Number Series — Batch 5');
  });
});
