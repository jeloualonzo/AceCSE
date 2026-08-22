import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { getStructuredExplanation, isValidStructuredExplanation } from './structuredExplanation';

const FROZEN_PILOT_IDS = ['num-0019', 'num-0020', 'num-0021'] as const;
const BATCH2_IDS = ['num-0022', 'num-0023', 'num-0024'] as const;
const BATCH3_IDS = ['num-0025', 'num-0026'] as const;
const BATCH4_IDS = ['num-0108', 'num-0137', 'num-0147'] as const;
const SPELLING_PILOT_IDS = [
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
] as const;
const FILING_BATCH1_IDS = [
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
] as const;
const FILING_BATCH2_IDS = [
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
] as const;
const GRAMMAR_PILOT_IDS = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'] as const;
const ALL_NUMBER_SERIES_IDS = [...FROZEN_PILOT_IDS, ...BATCH2_IDS, ...BATCH3_IDS, ...BATCH4_IDS];
const ALL_STRUCTURED_IDS = [...ALL_NUMBER_SERIES_IDS, ...SPELLING_PILOT_IDS, ...FILING_BATCH1_IDS, ...FILING_BATCH2_IDS, ...GRAMMAR_PILOT_IDS];
const ALL_SUBJECTS = [
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
  'Numerical Reasoning',
  'Verbal Ability',
] as const;

const EXPECTED_FROZEN_BLOCKS = {
  'num-0019': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — 24' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check the difference between consecutive terms.' },
    { type: 'pattern', expression: '4 + 5 = 9\n9 + 5 = 14\n14 + 5 = 19' },
    { type: 'paragraph', text: 'The same operation is repeated: +5.' },
    { type: 'solution', expression: '19 + 5 = 24' },
    { type: 'answer', text: '24', variant: 'final' },
    { type: 'rule', text: 'Arithmetic sequence: consecutive terms have a constant difference.' },
  ],
  'num-0020': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — 48' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check how each term changes to the next.' },
    { type: 'pattern', expression: '3 × 2 = 6\n6 × 2 = 12\n12 × 2 = 24' },
    { type: 'paragraph', text: 'The same operation is repeated: ×2.' },
    { type: 'solution', expression: '24 × 2 = 48' },
    { type: 'answer', text: '48', variant: 'final' },
    { type: 'rule', text: 'Geometric sequence: consecutive terms have a constant multiplication ratio.' },
  ],
  'num-0021': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — 27' },
    { type: 'paragraph', label: 'What to Notice', text: 'The terms do not increase by the same amount, so check the differences.' },
    { type: 'pattern', expression: '5 − 2 = 3\n9 − 5 = 4\n14 − 9 = 5\n20 − 14 = 6' },
    { type: 'paragraph', text: 'The differences increase by 1:' },
    { type: 'math', expression: '+3, +4, +5, +6, +7' },
    { type: 'solution', expression: '20 + 7 = 27' },
    { type: 'answer', text: '27', variant: 'final' },
    { type: 'rule', text: 'When consecutive differences increase regularly, continue the pattern in the differences.' },
  ],
} as const;

const EXPECTED_BATCH2_BLOCKS = {
  'num-0022': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — 13' },
    { type: 'paragraph', label: 'What to Notice', text: 'Each term is the sum of the two preceding terms.' },
    { type: 'pattern', expression: '1 + 1 = 2\n1 + 2 = 3\n2 + 3 = 5\n3 + 5 = 8\n5 + 8 = 13' },
    { type: 'solution', expression: '5 + 8 = 13' },
    { type: 'answer', text: '13', variant: 'final' },
    { type: 'rule', text: 'Fibonacci sequence: each term is the sum of the two preceding terms.' },
  ],
  'num-0023': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — 47' },
    { type: 'paragraph', label: 'What to Notice', text: 'The terms are multiplied by 2, then increased by 1.' },
    { type: 'pattern', expression: '2 × 2 + 1 = 5\n5 × 2 + 1 = 11\n11 × 2 + 1 = 23' },
    { type: 'paragraph', text: 'The same operation is repeated: ×2, then +1.' },
    { type: 'solution', expression: '23 × 2 + 1 = 47\n46 + 1 = 47' },
    { type: 'answer', text: '47', variant: 'final' },
    { type: 'rule', text: 'When simple addition or multiplication does not explain a series, check for a repeated combination of operations.' },
  ],
  'num-0024': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 36' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check the differences between consecutive terms.' },
    { type: 'pattern', expression: '4 − 1 = 3\n9 − 4 = 5\n16 − 9 = 7\n25 − 16 = 9' },
    { type: 'paragraph', text: 'The differences increase by 2:' },
    { type: 'math', expression: '+3, +5, +7, +9, +11' },
    { type: 'solution', expression: '25 + 11 = 36' },
    { type: 'answer', text: '36', variant: 'final' },
    { type: 'rule', text: 'The differences between consecutive perfect squares increase by consecutive odd numbers.' },
    {
      type: 'alternative_solution',
      title: 'Alternative Method',
      blocks: [
        { type: 'paragraph', text: 'Recognize the perfect squares.' },
        { type: 'math', expression: '1²\n2²\n3²\n4²\n5²' },
        { type: 'paragraph', text: 'The next term is:' },
        { type: 'math', expression: '6² = 36' },
        { type: 'answer', text: '36', variant: 'final' },
      ],
    },
  ],
} as const;

const EXPECTED_BATCH3_BLOCKS = {
  'num-0025': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — 16' },
    { type: 'paragraph', label: 'What to Notice', text: 'The terms alternate between two sequences.' },
    { type: 'pattern', label: 'Odd positions', expression: '3 → 4 → 5 → 6\n+1, +1, +1' },
    { type: 'pattern', label: 'Even positions', expression: '7 → 10 → 13 → ___\n+3, +3, +3' },
    { type: 'paragraph', text: 'The missing term is in the 8th position, so it belongs to the even-position sequence.' },
    { type: 'solution', expression: '13 + 3 = 16' },
    { type: 'answer', text: '16', variant: 'final' },
    { type: 'rule', text: 'When a series does not follow one consistent pattern, separate the odd- and even-position terms and check each sequence independently.' },
  ],
  'num-0026': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — 31' },
    { type: 'paragraph', label: 'What to Notice', text: 'The differences between consecutive terms are not constant, so check the differences themselves.' },
    { type: 'pattern', expression: '3 − 1 = 2\n7 − 3 = 4\n13 − 7 = 6\n21 − 13 = 8' },
    { type: 'paragraph', text: 'The differences increase by 2:' },
    { type: 'math', expression: '+2, +4, +6, +8, +10' },
    { type: 'solution', expression: '21 + 10 = 31' },
    { type: 'answer', text: '31', variant: 'final' },
    { type: 'rule', text: 'When the differences form an arithmetic sequence, continue that pattern to find the next term.' },
  ],
} as const;

const EXPECTED_BATCH4_BLOCKS = {
  'num-0108': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 96' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check the differences between consecutive terms.' },
    { type: 'pattern', expression: '6 − 5 = 1\n10 − 6 = 4\n19 − 10 = 9\n35 − 19 = 16\n60 − 35 = 25' },
    { type: 'paragraph', text: 'The differences are:' },
    { type: 'math', expression: '+1, +4, +9, +16, +25' },
    { type: 'paragraph', text: 'These are consecutive perfect squares:' },
    { type: 'math', expression: '1², 2², 3², 4², 5²' },
    { type: 'solution', expression: '6² = 36\n60 + 36 = 96' },
    { type: 'answer', text: '96', variant: 'final' },
    { type: 'rule', text: 'When the differences are consecutive perfect squares, continue with the next square.' },
  ],
  'num-0137': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 1/5' },
    { type: 'paragraph', label: 'What to Notice', text: 'The terms form pairs. In each pair, the second fraction is the simplified form of the first.' },
    { type: 'pattern', expression: '2/4 → 1/2\n2/6 → 1/3\n2/8 → 1/4\n2/10 → ___' },
    { type: 'paragraph', text: 'Each second fraction is the simplified form of the first.' },
    { type: 'solution', expression: '2/10 ÷ 2 = 1/5' },
    { type: 'answer', text: '1/5', variant: 'final' },
    { type: 'rule', text: 'When fractions appear in pairs, check whether the second term is the simplified form of the first.' },
  ],
  'num-0147': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — −144' },
    { type: 'paragraph', label: 'What to Notice', text: 'The absolute values follow the Fibonacci pattern, while the signs alternate.' },
    { type: 'pattern', label: 'Absolute values', expression: '13, 21, 34, 55, 89' },
    { type: 'pattern', label: 'Fibonacci relationships', expression: '13 + 21 = 34\n21 + 34 = 55\n34 + 55 = 89' },
    { type: 'pattern', label: 'Signs', expression: '+, −, +, −, +' },
    { type: 'paragraph', text: 'The next sign is negative.' },
    { type: 'solution', expression: '55 + 89 = 144\n−144' },
    { type: 'answer', text: '−144', variant: 'final' },
    { type: 'rule', text: 'When signs alternate, check whether the absolute values follow a familiar sequence such as Fibonacci.' },
  ],
} as const;

const EXPECTED_GRAMMAR_BLOCKS = {
  'verb-0059': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — The panel of judges has announced its decision.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The question sets a formal American-English convention that treats *panel* as one collective unit. That convention requires a singular verb and a singular pronoun.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The panel of judges **has** announced **its** decision.' },
    { type: 'paragraph', label: 'Why the other choices fail', text: 'Choices A and D use plural **have**, which conflicts with treating *panel* as one unit. Choice B uses singular **has** but plural **their**, so the verb and pronoun do not agree under the stated convention. Choice E also uses singular **has** with plural **their**; the phrase **individual verdicts** foregrounds the members, which conflicts with the required single-unit reading.' },
    { type: 'rule', text: 'When a collective noun is treated as one unit under the stated formal convention, use a singular verb and singular pronoun. Collective nouns may take plural agreement in other contexts when their members are foregrounded; that is not the convention used here.' },
  ],
  'verb-0060': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — Because she arrived late, her application was disqualified.' },
    { type: 'paragraph', label: 'What to Notice', text: '*Because* is a subordinating conjunction that can introduce a complete causal clause: **because + subject + verb**. In choice C, *she arrived late* supplies that complete clause.' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Because** she arrived late, her application was disqualified.' },
    { type: 'rule', text: 'Use *because* to connect a cause expressed as a complete clause. In choice A, *Being she was late* is defective; a preposition such as *due to* or *on account of* normally takes a noun or gerund phrase, not a finite clause, as in choices B and D. *Since* can introduce a clause, but *since of* in choice E improperly combines a conjunction with a preposition.' },
  ],
  'verb-0061': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — The reason the memorandum was delayed is that the signatory was absent.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The question sets a formal-edited-English convention: use *the reason ... is that ...* rather than *the reason ... is because ...*. Choice B follows that target pattern.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The reason the memorandum was delayed **is that** the signatory was absent.' },
    { type: 'rule', text: 'Under the formal-edited-English convention stated here, pair *the reason ...* with *is that ...*. Choices A and E use *the reason ... is because*, a wording that occurs in ordinary contemporary English but is not the construction selected here; choice C compounds *reason why* with *is because*, while choice D is syntactically defective.' },
  ],
  'verb-0062': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — The commission not only reviewed the budget but also scrutinized the disbursements.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correlative pair *not only ... but also* should connect parallel grammatical elements. Here, **reviewed** and **scrutinized** are both past-tense verb phrases.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The commission not only **reviewed** the budget but also **scrutinized** the disbursements.' },
    { type: 'rule', text: 'With *not only ... but also*, keep the two coordinated elements grammatically parallel. The distractors break that pattern by inserting *it*, pairing an object phrase with a verb phrase, using faulty inversion and singular *was* with plural *disbursements*, or using *scrutinizing* instead of the past-tense *scrutinized*.' },
  ],
} as const;

describe('Grammar structured explanation final pilot', () => {
  it('contains exactly the approved blocks and no legacy learner fields for the four IDs', async () => {
    const catalog = await loadContentCatalog(['Verbal Ability']);
    for (const id of GRAMMAR_PILOT_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_GRAMMAR_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution'), id).toBe(false);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }
    const grammarStructuredIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Grammar & Usage' && question.structuredExplanation)
      .map((question) => question.id);
    expect(grammarStructuredIds.sort()).toEqual([...GRAMMAR_PILOT_IDS].sort());
  });
});

describe('Number Series structured explanation Batch 4', () => {
  it('contains exactly the approved semantic content for num-0025 and num-0026', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of BATCH3_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH3_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    }

    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);
    expect([...structuredIds].sort()).toEqual([...ALL_NUMBER_SERIES_IDS].sort());
  });

  it('contains exactly the approved semantic content for num-0108, num-0137, and num-0147', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of BATCH4_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH4_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    }

    const num0147Text = catalog.questions.get('num-0147')?.structuredExplanation?.blocks
      .filter((block) => block.type === 'pattern' || block.type === 'solution' || block.type === 'answer')
      .map((block) => JSON.stringify(block))
      .join(' ');
    expect(num0147Text).not.toContain('f(n)');
    expect(num0147Text).toContain('−144');
  });

  it('keeps the first three frozen pilot payloads unchanged', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of FROZEN_PILOT_IDS) {
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks).toEqual(EXPECTED_FROZEN_BLOCKS[id]);
    }
  });

  it('keeps the Batch 2 payloads unchanged', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of BATCH2_IDS) {
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH2_BLOCKS[id]);
    }
  });

  it('preserves stems, choices, answer keys, approved legacy fields, and task metadata after Batch 3 distractor cleanup', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0025': {
        question: 'What is the missing number: 3, 7, 4, 10, 5, 13, 6, ___?',
        choices: ['7', '14', '16', '15', '17'],
        correctOptionId: 'C',
        steps: [
          'Separate by position: odd-position terms = 3, 4, 5, 6 (difference of 1 each); even-position terms = 7, 10, 13, ? (difference of 3 each).',
          'The blank is the 8th term (even position), so apply the even-position pattern: 13 + 3 = 16.',
        ],
      },
      'num-0026': {
        question: 'Find the next term: 1, 3, 7, 13, 21, ___',
        choices: ['29', '31', '33', '34', '35'],
        correctOptionId: 'B',
        steps: [
          'Compute first differences: 3–1=2, 7–3=4, 13–7=6, 21–13=8.',
          'Observe the first differences form an arithmetic sequence: 2, 4, 6, 8 (common difference = 2).',
          'The next first difference = 8 + 2 = 10.',
          'Add to the last term: 21 + 10 = 31.',
        ],
      },
    } as const;

    for (const id of BATCH3_IDS) {
      const question = catalog.questions.get(id)!;
      expect(question.question).toBe(expected[id].question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expected[id].choices);
      expect(question.correctOptionId).toBe(expected[id].correctOptionId);
      expect(question.explanation.length).toBeGreaterThanOrEqual(100);
      expect(question.steps).toEqual(expected[id].steps);
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.tip).toBeTruthy();
      expect(question.numberSeries).toBeTruthy();
      expect(question.taskInstance).toBeTruthy();
    }
  });

  it('preserves stems, choices, answer keys, approved legacy fields, and task metadata after Batch 4 distractor cleanup', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0108': {
        question: 'What is the next number in the series: 5, 6, 10, 19, 35, 60, ___?',
        choices: ['96', '86', '72', '98', '101'],
        correctOptionId: 'A',
        sequence: ['5', '6', '10', '19', '35', '60', null],
        missingPosition: 7,
      },
      'num-0137': {
        question: 'Identify the next term in the series: 2/4, 1/2, 2/6, 1/3, 2/8, 1/4, 2/10, ___',
        choices: ['1/5', '1/6', '2/5', '3/4', '4/5'],
        correctOptionId: 'A',
        sequence: ['2/4', '1/2', '2/6', '1/3', '2/8', '1/4', '2/10', null],
        missingPosition: 8,
      },
      'num-0147': {
        question: 'What is the next term in the series: 13, −21, 34, −55, 89, ___?',
        choices: ['−95', '104', '−130', '−144', '−109'],
        correctOptionId: 'D',
        sequence: ['13', '−21', '34', '−55', '89', null],
        missingPosition: 6,
      },
    } as const;

    for (const id of BATCH4_IDS) {
      const question = catalog.questions.get(id)!;
      expect(question.question).toBe(expected[id].question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expected[id].choices);
      expect(question.correctOptionId).toBe(expected[id].correctOptionId);
      expect(question.explanation.length).toBeGreaterThanOrEqual(100);
      expect(question.steps?.length ?? 0).toBeGreaterThan(0);
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.tip).toBeTruthy();
      expect(question.numberSeries?.sequence).toEqual(expected[id].sequence);
      expect(question.numberSeries?.missingPosition).toBe(expected[id].missingPosition);
      expect(question.taskInstance).toBeTruthy();
    }
  });

  it('keeps later Number Series questions on the legacy path', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const structuredIdSet = new Set<string>(ALL_STRUCTURED_IDS);
    const laterNumberSeries = [...catalog.questions.values()].filter(
      (question) => question.topic === 'Number Series' && !structuredIdSet.has(question.id)
    );

    expect(laterNumberSeries.every((question) => question.topic === 'Number Series')).toBe(true);
    expect(laterNumberSeries.every((question) => question.structuredExplanation === undefined)).toBe(true);
    expect(laterNumberSeries.every((question) => question.explanation.length >= 100)).toBe(true);
    expect(catalog.questions.get('num-0027')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('num-0108')?.structuredExplanation).toBeTruthy();
    expect(catalog.questions.get('num-0137')?.structuredExplanation).toBeTruthy();
    expect(catalog.questions.get('num-0147')?.structuredExplanation).toBeTruthy();
  });

  it('does not add structured explanations outside the approved Number Series, Spelling, Filing, and Grammar sets', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);

    expect([...structuredIds].sort()).toEqual([...ALL_STRUCTURED_IDS].sort());
    expect([...catalog.questions.values()].filter((question) => question.structuredExplanation && !ALL_STRUCTURED_IDS.some((id) => id === question.id)).length).toBe(0);
  });

  it('rejects malformed or unsupported structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'pattern', expression: '' }] })).toBe(false);
    expect(isValidStructuredExplanation({ blocks: [{ type: 'alternative_solution', title: 'Alternative Method', blocks: [] }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Solution' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unsupported', text: 'bad' }] })).toBeUndefined();
  });
});
