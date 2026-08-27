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
const AGE_PROBLEMS_IDS = ['num-0030', 'num-0031', 'num-0142'] as const;
const AVERAGES_BATCH1_IDS = ['num-0046', 'num-0047', 'num-0049', 'num-0145', 'num-0146', 'seed-num-005'] as const;
const ALL_STRUCTURED_IDS = [...ALL_NUMBER_SERIES_IDS, ...AGE_PROBLEMS_IDS, ...AVERAGES_BATCH1_IDS, ...SPELLING_PILOT_IDS, ...FILING_BATCH1_IDS, ...FILING_BATCH2_IDS, ...GRAMMAR_PILOT_IDS, ...CLERICAL_OPERATIONS_STRUCTURED_IDS];
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

const EXPECTED_AGE_PROBLEMS_BLOCKS = {
  'num-0030': [
    {
      type: 'correct_answer',
      text: 'D — 8',
    },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let S be the son’s current age, so Mia’s age is 3S. In 8 years, their ages will be S + 8 and 3S + 8. Since Mia will then be twice her son’s age:\n\n\\[\n3S+8=2(S+8)\n\\]\n\n\\[\n3S+8=2S+16\n\\]\n\n\\[\n3S-2S+8=2S-2S+16\n\\]\n\n\\[\nS+8=16\n\\]\n\n\\[\nS+8-8=16-8\n\\]\n\n\\[\nS=8\n\\]\n\nTherefore, the son is **8 years old**.\n\nCheck:\n\n\\[\n3(8)=24\n\\]\n\n\\[\n24+8=32,\\quad 8+8=16,\\quad 32=2(16)\n\\]\n\nThe answer is **8**.',
    },
  ],
  'num-0031': [
    {
      type: 'correct_answer',
      text: 'D — 33',
    },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let S be Sonia’s current age, so Romy’s age is S + 12. In 2 years, their ages will be S + 2 and S + 14. Their future ages must total 58:\n\n\\[\n(S+2)+(S+14)=58\n\\]\n\n\\[\n2S+16=58\n\\]\n\n\\[\n2S+16-16=58-16\n\\]\n\n\\[\n2S=42\n\\]\n\n\\[\n\\frac{2S}{2}=\\frac{42}{2}\n\\]\n\n\\[\nS=21\n\\]\n\nRomy is 12 years older:\n\n\\[\n21+12=33\n\\]\n\nTherefore, Romy is **33 years old**.\n\nCheck:\n\n\\[\n23+35=58\n\\]\n\nso the future-age condition is satisfied.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'Both people become 2 years older, so their combined age increases by 4.\n\n\\[\n58-4=54\n\\]\n\nTheir current ages total **54**, and Romy is **12 years older** than Sonia.\n\nRemove the 12-year difference:\n\n\\[\n54-12=42\n\\]\n\nThe remaining 42 is split equally between the two ages:\n\n\\[\n42\\div2=21\n\\]\n\nSo Sonia is **21 years old**.\n\nAdd the 12-year difference back to get Romy’s age:\n\n\\[\n21+12=33\n\\]\n\nCheck the current total:\n\n\\[\n21+33=54\n\\]\n\nAnd in two years:\n\n\\[\n23+35=58\n\\]\n\nTherefore, Romy is **33 years old**.',
    },
  ],
  'num-0142': [
    {
      type: 'correct_answer',
      text: 'C — 30 years old',
    },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let I be the intern’s current age. The assistant is I + 10, and the supervisor is I + 25. In 5 years, their ages will be I + 5, I + 15, and I + 30. Their future ages must total 110:\n\n\\[\n(I+5)+(I+15)+(I+30)=110\n\\]\n\n\\[\n3I+50=110\n\\]\n\n\\[\n3I+50-50=110-50\n\\]\n\n\\[\n3I=60\n\\]\n\n\\[\n\\frac{3I}{3}=\\frac{60}{3}\n\\]\n\n\\[\nI=20\n\\]\n\nThe assistant is 10 years older than the intern:\n\n\\[\n20+10=30\n\\]\n\nTherefore, the assistant is **30 years old**.\n\nCheck:\n\n\\[\n25+35+50=110\n\\]\n\nThe future-age condition is satisfied.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'In 5 years, three people gain a total of 15 years.\n\n\\[\n110-15=95\n\\]\n\nTheir current ages total **95**.\n\nExpress everyone relative to the youngest:\n\n\\[\nIntern=x,\\quad Assistant=x+10,\\quad Supervisor=x+25\n\\]\n\nThe age differences above the intern are:\n\n\\[\n0+10+25=35\n\\]\n\nRemove those differences:\n\n\\[\n95-35=60\n\\]\n\nThe remaining 60 is divided equally among the three people:\n\n\\[\n60\\div3=20\n\\]\n\nSo the intern is **20**.\n\nThe assistant is 10 years older:\n\n\\[\n20+10=30\n\\]\n\nTherefore, the assistant is **30 years old**.',
    },
  ],
} as const;

const EXPECTED_AVERAGES_BLOCKS = {
  'num-0046': [
    { type: 'correct_answer', text: 'B — 80' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The average is the total of all scores divided by the number of scores.\n\nFirst, add the five scores:\n\n\\[\n82+75+91+68+84=400\n\\]\n\nThen divide by 5:\n\n\\[\n400\\div5=80\n\\]\n\nTherefore, the average score is **80**.',
    },
  ],
  'num-0047': [
    { type: 'correct_answer', text: 'C — 85.75' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The third exam has weight 2, so its score counts twice. Multiply each score by its weight:\n\n\\[\n78\\times1=78\n\\]\n\n\\[\n85\\times1=85\n\\]\n\n\\[\n90\\times2=180\n\\]\n\nAdd the weighted scores:\n\n\\[\n78+85+180=343\n\\]\n\nAdd the weights:\n\n\\[\n1+1+2=4\n\\]\n\nThen divide the weighted total by the total weight:\n\n\\[\n343\\div4=85.75\n\\]\n\nTherefore, the weighted average is **85.75**.',
    },
  ],
  'num-0049': [
    { type: 'correct_answer', text: 'D — 37' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'An average of 38 for 5 numbers means their total must be:\n\n\\[\n38\\times5=190\n\\]\n\nThe four known numbers total:\n\n\\[\n30+42+35+46=153\n\\]\n\nSo the fifth number is the difference:\n\n\\[\n190-153=37\n\\]\n\nTherefore, the missing number is **37**.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'For a missing value, first find the total required by the average:\n\n\\[\n38\\times5=190\n\\]\n\nThe four known numbers total **153**, so mentally subtract:\n\n\\[\n190-153=37\n\\]\n\nTherefore, the missing number is **37**.',
    },
  ],
  'num-0145': [
    { type: 'correct_answer', text: 'C — 26' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'There are 5 numbers in the set, so the average is their sum divided by 5:\n\n\\[\nx=\\frac{2+4x+6+8+10}{5}\n\\]\n\nCombine the fixed numbers:\n\n\\[\nx=\\frac{26+4x}{5}\n\\]\n\nMultiply both sides by 5:\n\n\\[\n5x=26+4x\n\\]\n\nSubtract \\(4x\\) from both sides:\n\n\\[\n5x-4x=26+4x-4x\n\\]\n\n\\[\nx=26\n\\]\n\nTherefore, **x = 26**.\n\nCheck:\n\n\\[\n\\frac{2+104+6+8+10}{5}=\\frac{130}{5}=26\n\\]\n\nThe average is indeed **26**.',
    },
  ],
  'num-0146': [
    { type: 'correct_answer', text: 'C — 49' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The first 8 assessments have an average of 85, so their total is:\n\n\\[\n85\\times8=680\n\\]\n\nAfter the ninth assessment, the average is 81 for 9 assessments, so the new total is:\n\n\\[\n81\\times9=729\n\\]\n\nThe ninth score is the increase in total:\n\n\\[\n729-680=49\n\\]\n\nTherefore, the ninth assessment score is **49**.\n\nCheck:\n\n\\[\n680+49=729\n\\]\n\nand\n\n\\[\n729\\div9=81\n\\]',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'Think in terms of total points instead of averages.\n\nThe old total is:\n\n\\[\n85\\times8=680\n\\]\n\nThe new total is:\n\n\\[\n81\\times9=729\n\\]\n\nThe ninth score is simply the difference:\n\n\\[\n729-680=49\n\\]\n\nSo the ninth assessment score is **49**.',
    },
  ],
  'seed-num-005': [
    { type: 'correct_answer', text: 'C — 98' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The first 4 department heads have an average of 88, so their total score is:\n\n\\[\n88\\times4=352\n\\]\n\nWith 5 department heads, the new average is 90, so the total score must be:\n\n\\[\n90\\times5=450\n\\]\n\nThe fifth score is the difference between the new total and the original total:\n\n\\[\n450-352=98\n\\]\n\nTherefore, the fifth department head scored **98**.\n\nCheck:\n\n\\[\n352+98=450\n\\]\n\nand\n\n\\[\n450\\div5=90\n\\]',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'The first 4 scores total:\n\n\\[\n88\\times4=352\n\\]\n\nThe 5 scores must total:\n\n\\[\n90\\times5=450\n\\]\n\nSo the fifth score is:\n\n\\[\n450-352=98\n\\]\n\nTherefore, the fifth department head scored **98**.',
    },
  ],
} as const;

const EXPECTED_GRAMMAR_BLOCKS = {
  'verb-0059': [
    { type: 'correct_answer', text: 'C — The panel of judges has announced its decision.' },
    { type: 'paragraph', label: 'Rationale', text: 'The question treats **panel** as a single collective unit, so it takes the singular verb **has** and the singular pronoun **its**. Therefore, **The panel of judges has announced its decision** follows the stated formal American-English convention.' },
  ],
  'verb-0060': [
    { type: 'correct_answer', text: 'C — Because she arrived late, her application was disqualified.' },
    { type: 'paragraph', label: 'Rationale', text: '**Because** is a subordinating conjunction that correctly introduces the complete clause **she arrived late**. The other choices incorrectly combine a preposition with a finite clause or use the defective construction **since of**. Therefore, **Because she arrived late, her application was disqualified** is the correctly written sentence.' },
  ],
  'verb-0061': [
    { type: 'correct_answer', text: 'B — The reason the memorandum was delayed is that the signatory was absent.' },
    { type: 'paragraph', label: 'Rationale', text: "Under the question's stated formal-edited-English convention, use **the reason ... is that ...** rather than **the reason ... is because ...**. Choice B follows that construction directly. The other choices either use the disfavored **is because** pattern, combine **reason why** with **is because**, or are syntactically defective." },
  ],
  'verb-0062': [
    { type: 'correct_answer', text: 'B — The commission not only reviewed the budget but also scrutinized the disbursements.' },
    { type: 'paragraph', label: 'Rationale', text: 'The correlative pair **not only ... but also** should connect parallel grammatical elements. Here, **reviewed** and **scrutinized** are both past-tense verb phrases, so the sentence maintains proper parallel structure. The other choices break that parallelism or contain additional grammatical errors.' },
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

describe('Age Problems structured explanation', () => {
  it('contains the exact supplied payloads without legacy fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const rationaleOnlyIds = ['num-0030'] as const;
    const shortcutIds = ['num-0031', 'num-0142'] as const;

    for (const id of AGE_PROBLEMS_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question).toBeTruthy();
      expect(blocks).toEqual(EXPECTED_AGE_PROBLEMS_BLOCKS[id]);
      expect(blocks[0]?.type).toBe('correct_answer');
      expect(blocks[1]).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type))).toBe(false);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    for (const id of rationaleOnlyIds) {
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks).toHaveLength(2);
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks.some((block) => block.type === 'collapsible')).toBe(false);
    }

    for (const id of shortcutIds) {
      const blocks = catalog.questions.get(id)?.structuredExplanation?.blocks ?? [];
      expect(blocks).toHaveLength(3);
      expect(blocks[2]).toMatchObject({ type: 'collapsible', title: 'Mental Shortcut' });
      expect((blocks[2]?.type === 'collapsible' ? blocks[2].content : '')).toContain('Therefore,');
    }
  });
});

describe('Averages structured explanation Batch 1', () => {
  it('contains the exact supplied payloads and no legacy explanation fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const shortcutIds = new Set(['num-0049', 'num-0146', 'seed-num-005']);

    for (const id of AVERAGES_BATCH1_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question, id).toBeTruthy();
      expect(blocks, id).toEqual(EXPECTED_AVERAGES_BLOCKS[id]);
      expect(blocks, id).toHaveLength(shortcutIds.has(id) ? 3 : 2);
      expect(blocks[0], id).toMatchObject({ type: 'correct_answer' });
      expect(blocks[1], id).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type)), id).toBe(false);
      if (shortcutIds.has(id)) {
        expect(blocks[2], id).toMatchObject({ type: 'collapsible', title: 'Mental Shortcut' });
      } else {
        expect(blocks.some((block) => block.type === 'collapsible'), id).toBe(false);
      }
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    const structuredAveragesIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Averages' && question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredAveragesIds.sort()).toEqual([...AVERAGES_BATCH1_IDS].sort());
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
      .filter((question) => question.topic === 'Number Series' && question.structuredExplanation)
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

  it('does not add structured explanations outside the approved Number Series, Age Problems, Spelling, Filing, Grammar, and Clerical Operations sets', async () => {
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
