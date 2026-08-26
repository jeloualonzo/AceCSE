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
const CLERICAL_OPERATIONS_STRUCTURED_IDS = [
  'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
  'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
  'cler-0051', 'cler-0057', 'seed-cler-003',
] as const;
const ALL_NUMBER_SERIES_IDS = [...FROZEN_PILOT_IDS, ...BATCH2_IDS, ...BATCH3_IDS, ...BATCH4_IDS];
const ALL_STRUCTURED_IDS = [...ALL_NUMBER_SERIES_IDS, ...SPELLING_PILOT_IDS, ...FILING_BATCH1_IDS, ...FILING_BATCH2_IDS, ...GRAMMAR_PILOT_IDS, ...CLERICAL_OPERATIONS_STRUCTURED_IDS];
const ALL_SUBJECTS = [
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
  'Numerical Reasoning',
  'Verbal Ability',
] as const;

function containsLegacySolutionHeading(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((block) => {
    if (typeof block !== 'object' || block === null) return false;
    const candidate = block as Record<string, unknown>;
    if (candidate.type === 'heading' && candidate.text === 'Solution') return true;
    return containsLegacySolutionHeading(candidate.blocks);
  });
}

const EXPECTED_FROZEN_BLOCKS = {
  "num-0019": [
    {
      "type": "correct_answer",
      "text": "B — 24"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The difference between each consecutive term is **5**:\n\n\\[\n9-4=5,\\quad 14-9=5,\\quad 19-14=5\n\\]\n\nContinuing the same pattern:\n\n\\[\n19+5=24\n\\]\n\nTherefore, the missing term is **24**."
    }
  ],
  "num-0020": [
    {
      "type": "correct_answer",
      "text": "E — 48"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Each term is multiplied by **2**:\n\n\\[\n3\\times2=6,\\quad 6\\times2=12,\\quad 12\\times2=24\n\\]\n\nContinuing the same pattern:\n\n\\[\n24\\times2=48\n\\]\n\nTherefore, the missing term is **48**."
    }
  ],
  "num-0021": [
    {
      "type": "correct_answer",
      "text": "C — 27"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The differences increase by **1** each time:\n\n\\[\n5-2=3,\\quad 9-5=4,\\quad 14-9=5,\\quad 20-14=6\n\\]\n\nThe next difference is therefore **7**:\n\n\\[\n20+7=27\n\\]\n\nTherefore, the missing term is **27**."
    }
  ]
} as const;

const EXPECTED_BATCH2_BLOCKS = {
  "num-0022": [
    {
      "type": "correct_answer",
      "text": "D — 13"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Each term is the sum of the two preceding terms:\n\n\\[\n1+1=2\n\\]\n\\[\n1+2=3\n\\]\n\\[\n2+3=5\n\\]\n\\[\n3+5=8\n\\]\n\nTherefore, the next term is:\n\n\\[\n5+8=13\n\\]\n\nThe missing term is **13**."
    }
  ],
  "num-0023": [
    {
      "type": "correct_answer",
      "text": "E — 47"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Each term is multiplied by **2**, then **1** is added:\n\n\\[\n2\\times2+1=5\n\\]\n\\[\n5\\times2+1=11\n\\]\n\\[\n11\\times2+1=23\n\\]\n\nContinuing the same pattern:\n\n\\[\n23\\times2+1=47\n\\]\n\nThe missing term is **47**."
    }
  ],
  "num-0024": [
    {
      "type": "correct_answer",
      "text": "A — 36"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The terms are consecutive perfect squares:\n\n\\[\n1=1^2,\\quad 4=2^2,\\quad 9=3^2,\\quad 16=4^2,\\quad 25=5^2\n\\]\n\nTherefore, the next term is:\n\n\\[\n6^2=36\n\\]\n\nThe missing term is **36**."
    }
  ]
} as const;

const EXPECTED_BATCH3_BLOCKS = {
  "num-0025": [
    {
      "type": "correct_answer",
      "text": "C — 16"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The series contains two interleaved sequences. The odd-position terms increase by **1**:\n\n\\[\n3,\\ 4,\\ 5,\\ 6\n\\]\n\nThe even-position terms increase by **3**:\n\n\\[\n7,\\ 10,\\ 13,\\ \\_\\_\\_\n\\]\n\nSince the missing term is in the 8th position, continue the even-position pattern:\n\n\\[\n13+3=16\n\\]\n\nThe missing term is **16**."
    }
  ],
  "num-0026": [
    {
      "type": "correct_answer",
      "text": "B — 31"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The differences between consecutive terms are:\n\n\\[\n3-1=2,\\quad 7-3=4,\\quad 13-7=6,\\quad 21-13=8\n\\]\n\nThe differences increase by **2**, so the next difference is **10**:\n\n\\[\n21+10=31\n\\]\n\nThe missing term is **31**."
    }
  ]
} as const;

const EXPECTED_BATCH4_BLOCKS = {
  "num-0108": [
    {
      "type": "correct_answer",
      "text": "A — 96"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The differences between consecutive terms are consecutive perfect squares:\n\n\\[\n6-5=1=1^2\n\\]\n\\[\n10-6=4=2^2\n\\]\n\\[\n19-10=9=3^2\n\\]\n\\[\n35-19=16=4^2\n\\]\n\\[\n60-35=25=5^2\n\\]\n\nThe next difference is therefore:\n\n\\[\n6^2=36\n\\]\n\nSo the next term is:\n\n\\[\n60+36=96\n\\]\n\nThe missing term is **96**."
    }
  ],
  "num-0137": [
    {
      "type": "correct_answer",
      "text": "A — 1/5"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The terms form pairs in which the second fraction is the simplified form of the first:\n\n\\[\n\\frac{2}{4}\\rightarrow\\frac{1}{2}\n\\]\n\\[\n\\frac{2}{6}\\rightarrow\\frac{1}{3}\n\\]\n\\[\n\\frac{2}{8}\\rightarrow\\frac{1}{4}\n\\]\n\nTherefore:\n\n\\[\n\\frac{2}{10}\\div2=\\frac{1}{5}\n\\]\n\nThe missing term is **1/5**."
    }
  ],
  "num-0147": [
    {
      "type": "correct_answer",
      "text": "D — −144"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The absolute values follow the Fibonacci pattern:\n\n\\[\n13+21=34\n\\]\n\\[\n21+34=55\n\\]\n\\[\n34+55=89\n\\]\n\nThe signs alternate:\n\n\\[\n+,\\ -,\\ +,\\ -,\\ +\n\\]\n\nTherefore, the next absolute value is:\n\n\\[\n55+89=144\n\\]\n\nThe next sign is negative, so the missing term is **−144**."
    }
  ]
} as const;

const EXPECTED_GRAMMAR_BLOCKS = {
  'verb-0059': [
        { type: 'correct_answer', text: 'C — The panel of judges has announced its decision.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The question sets a formal American-English convention that treats *panel* as one collective unit. That convention requires a singular verb and a singular pronoun.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The panel of judges **has** announced **its** decision.' },
    { type: 'paragraph', label: 'Why the other choices fail', text: 'Choices A and D use plural **have**, which conflicts with treating *panel* as one unit. Choice B uses singular **has** but plural **their**, so the verb and pronoun do not agree under the stated convention. Choice E also uses singular **has** with plural **their**; the phrase **individual verdicts** foregrounds the members, which conflicts with the required single-unit reading.' },
    { type: 'rule', text: 'When a collective noun is treated as one unit under the stated formal convention, use a singular verb and singular pronoun. Collective nouns may take plural agreement in other contexts when their members are foregrounded; that is not the convention used here.' },
  ],
  'verb-0060': [
        { type: 'correct_answer', text: 'C — Because she arrived late, her application was disqualified.' },
    { type: 'paragraph', label: 'What to Notice', text: '*Because* is a subordinating conjunction that can introduce a complete causal clause: **because + subject + verb**. In choice C, *she arrived late* supplies that complete clause.' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Because** she arrived late, her application was disqualified.' },
    { type: 'rule', text: 'Use *because* to connect a cause expressed as a complete clause. In choice A, *Being she was late* is defective; a preposition such as *due to* or *on account of* normally takes a noun or gerund phrase, not a finite clause, as in choices B and D. *Since* can introduce a clause, but *since of* in choice E improperly combines a conjunction with a preposition.' },
  ],
  'verb-0061': [
        { type: 'correct_answer', text: 'B — The reason the memorandum was delayed is that the signatory was absent.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The question sets a formal-edited-English convention: use *the reason ... is that ...* rather than *the reason ... is because ...*. Choice B follows that target pattern.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The reason the memorandum was delayed **is that** the signatory was absent.' },
    { type: 'rule', text: 'Under the formal-edited-English convention stated here, pair *the reason ...* with *is that ...*. Choices A and E use *the reason ... is because*, a wording that occurs in ordinary contemporary English but is not the construction selected here; choice C compounds *reason why* with *is because*, while choice D is syntactically defective.' },
  ],
  'verb-0062': [
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

    const num0147Text = JSON.stringify(catalog.questions.get('num-0147')?.structuredExplanation?.blocks);
    expect(num0147Text).not.toContain('f(n)');
    expect(num0147Text).toContain('−144');
  });

  it('contains the exact Rationale-first payloads for the first three frozen pilot questions', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of FROZEN_PILOT_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(blocks).toEqual(EXPECTED_FROZEN_BLOCKS[id]);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]?.type).toBe('correct_answer');
      expect(blocks[1]).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type))).toBe(false);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }
  });

  it('contains the exact Batch 2 Rationale-only payloads without legacy fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of BATCH2_IDS) {
      const question = catalog.questions.get(id);
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH2_BLOCKS[id]);
      expect(question?.explanation).toBeUndefined();
      expect(question?.steps).toBeUndefined();
      expect(question?.distractorExplanations).toBeUndefined();
      expect(question?.tip).toBeUndefined();
    }
  });

  it('preserves stems, choices, answer keys, and task metadata after the Batch 3 Rationale migration', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0025': {
        question: 'What is the missing number: 3, 7, 4, 10, 5, 13, 6, ___?',
        choices: ['7', '14', '16', '15', '17'],
        correctOptionId: 'C',
      },
      'num-0026': {
        question: 'Find the next term: 1, 3, 7, 13, 21, ___',
        choices: ['29', '31', '33', '34', '35'],
        correctOptionId: 'B',
      },
    } as const;

    for (const id of BATCH3_IDS) {
      const question = catalog.questions.get(id)!;
      expect(question.question).toBe(expected[id].question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expected[id].choices);
      expect(question.correctOptionId).toBe(expected[id].correctOptionId);
      expect(question.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH3_BLOCKS[id]);
      expect(question.explanation).toBeUndefined();
      expect(question.steps).toBeUndefined();
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.tip).toBeUndefined();
      expect(question.numberSeries).toBeTruthy();
      expect(question.taskInstance).toBeTruthy();
    }
  });

  it('preserves stems, choices, answer keys, and task metadata after the Batch 4 Rationale migration', async () => {
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
      expect(question.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH4_BLOCKS[id]);
      expect(question.explanation).toBeUndefined();
      expect(question.steps).toBeUndefined();
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.tip).toBeUndefined();
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

  it('contains no legacy Solution heading in any production structured explanation', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const offenders = [...catalog.questions.values()]
      .filter((question) => containsLegacySolutionHeading(question.structuredExplanation?.blocks))
      .map((question) => question.id);
    expect(offenders).toEqual([]);
  });

  it('does not add structured explanations outside the approved Number Series, Spelling, Filing, Grammar, and Clerical Operations sets', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);

    expect([...structuredIds].sort()).toEqual([...ALL_STRUCTURED_IDS].sort());
    expect([...catalog.questions.values()].filter((question) => question.structuredExplanation && !ALL_STRUCTURED_IDS.some((id) => id === question.id)).length).toBe(0);
  });

  it('accepts grouped distractor sections and rejects labeled or empty children', () => {
    expect(isValidStructuredExplanation({
      blocks: [{
        type: 'distractor_section',
        title: 'Why the other choices fail',
        blocks: [
          { type: 'paragraph', text: 'A. Uses the wrong order.' },
          { type: 'paragraph', text: 'B and C. Use the wrong code.' },
        ],
      }],
    })).toBe(true);
    expect(isValidStructuredExplanation({
      blocks: [{
        type: 'distractor_section',
        title: 'Why the other choices fail',
        blocks: [{ type: 'paragraph', label: 'Repeated', text: 'A. Wrong.' }],
      }],
    })).toBe(false);
    expect(isValidStructuredExplanation({
      blocks: [{ type: 'distractor_section', title: 'Why the other choices fail', blocks: [] }],
    })).toBe(false);
  });

  it('rejects malformed or unsupported structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'pattern', expression: '' }] })).toBe(false);
    expect(isValidStructuredExplanation({ blocks: [{ type: 'alternative_solution', title: 'Alternative Method', blocks: [] }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toBeUndefined();
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Method Overview' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Method Overview' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unsupported', text: 'bad' }] })).toBeUndefined();
  });
});
