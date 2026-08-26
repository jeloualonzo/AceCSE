import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { createRawBatchJson, createReviewMarkdown } from './contentBankWorkspace';
import { isValidStructuredExplanation } from './structuredExplanation';
import type { RefinementBatch } from './refinementBatches';
import type { StructuredExplanationBlock } from '@/types';

const CLERICAL_OPERATIONS_BATCH1_IDS = [
  'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
  'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
] as const;

type TargetId = typeof CLERICAL_OPERATIONS_BATCH1_IDS[number];

const EXPECTED_QUESTIONS: Record<TargetId, {
  question: string;
  choices: string[];
  correctOptionId: string;
}> = {
  'cler-0020': {
    question: 'A clerk is asked to check whether each pair of entries is an EXACT match. Which pair is NOT an exact match?',
    choices: [
      'BARANGAY HALL 101  —  BARANGAY HALL 101',
      '09171234567  —  09171234567',
      'Quezon City, 1100  —  Quezon City, 1100',
      'Employee No. 2024-0881  —  Employee No. 2024-0881',
      'Reyes, Maria L.  —  Reyes, Maria I.',
    ],
    correctOptionId: 'E',
  },
  'cler-0021': {
    question: 'Examine the following pairs. Which pair contains entries that match exactly?',
    choices: [
      'Dela Rosa, Benigno T.  —  Dela Rosa, Benigno T.',
      '2024-CSC-00187  —  2024-CSC-00178',
      'November 14, 2025  —  November 14, 2026',
      'Payroll No. 5566  —  Payroll No. 5656',
      'Reference No. MO-2024-0055  —  Reference No. MO-2024-0555',
    ],
    correctOptionId: 'A',
  },
  'cler-0022': {
    question: 'How many of the following pairs are EXACT matches?\n\n  Pair 1: Burgos, Alfred C.     —  Burgos, Alfred C.\n  Pair 2: TIN 245-876-003-001   —  TIN 245-876-003-001\n  Pair 3: San Jose, Bulacan     —  San Jose, Bulacan\n  Pair 4: SSS No. 33-5512781-8  —  SSS No. 33-5512871-8',
    choices: ['4', '3', '2', '1', '0'],
    correctOptionId: 'B',
  },
  'cler-0023': {
    question: 'A coding sheet assigns letters to months: A=Jan, B=Feb, C=Mar, D=Apr, E=May, F=Jun, G=Jul, H=Aug, I=Sep, J=Oct, K=Nov, L=Dec. A document dated 15 September 2025 should be coded as:',
    choices: ['15-I-2025', '15-H-2025', '15-J-2025', '15-G-2025', '16-I-2025'],
    correctOptionId: 'A',
  },
  'cler-0024': {
    question: "A clerk uses the following numeric codes for document categories: 1 = Memorandum, 2 = Letter, 3 = Report, 4 = Form, and 5 = Notice. A document is labeled 'Memo-2025-31,' but its document type is Notice. Under this classification system, what code should be used to file it?",
    choices: ['1', '2', '3', '4', '5'],
    correctOptionId: 'E',
  },
  'cler-0025': {
    question: 'Four employee payroll entries are shown. Which entry contains an error in the net pay computation (Gross Pay minus Total Deductions = Net Pay)?\n\n  Entry A: Gross P18,500 / Deductions P3,200 / Net P15,300\n  Entry B: Gross P22,000 / Deductions P4,750 / Net P17,430\n  Entry C: Gross P16,800 / Deductions P2,900 / Net P13,900\n  Entry D: Gross P25,500 / Deductions P5,100 / Net P20,400',
    choices: ['Entry A', 'Entry C', 'Entry B', 'Entry D', 'Entries B and D'],
    correctOptionId: 'C',
  },
  'cler-0042': {
    question: 'Using the code table in the passage, what is the correct code for a Clerk II position in NCR?',
    choices: ['2-F', 'F-2', '2-E', '1-F', '2-G'],
    correctOptionId: 'A',
  },
  'cler-0043': {
    question: "A document was Received, Processed, then Disapproved, and finally Filed. What is the correct status code for this document?",
    choices: ['R-P-F-D', 'R-A-D-F', 'R-P-D-F', 'P-R-D-F', 'R-P-D-R'],
    correctOptionId: 'C',
  },
  'cler-0044': {
    question: 'A clerk receives a contract from the Legal Department. What is the correct filing code?',
    choices: ['LG-05', 'LG-03', 'AD-05', 'LG-02', 'LG-04'],
    correctOptionId: 'A',
  },
  'cler-0045': {
    question: 'Using the coding system in the passage, what is the correct code for the 7th document sent on November 3, 2026?',
    choices: ['26-11-03-007', '2026-11-03-007', '26-03-11-007', '26-11-3-007', '26-11-03-07'],
    correctOptionId: 'A',
  },
};

const EXPECTED_BLOCKS: Record<TargetId, readonly StructuredExplanationBlock[]> = {
  "cler-0020": [
    {
      "type": "correct_answer",
      "text": "E — Reyes, Maria L. — Reyes, Maria I."
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "An exact match requires every character to be identical, including letters, numbers, punctuation, and spaces. Pairs A, B, C, and D match exactly. Pair E differs in the middle initial: **L** versus **I**, so it is the only pair that is not an exact match."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A, B, C, and D are exact matches because every character in each pair is the same."
        }
      ]
    }
  ],
  "cler-0021": [
    {
      "type": "correct_answer",
      "text": "A — Dela Rosa, Benigno T. — Dela Rosa, Benigno T."
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Choice A is the only pair with every character in the same position. The other pairs contain changes in digits, years, or character order, so they do not match exactly."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "B. The final digits change from 00187 to 00178."
        },
        {
          "type": "paragraph",
          "text": "C. The year changes from 2025 to 2026."
        },
        {
          "type": "paragraph",
          "text": "D. The digits change from 5566 to 5656."
        },
        {
          "type": "paragraph",
          "text": "E. The sequence changes from 0055 to 0555."
        }
      ]
    }
  ],
  "cler-0022": [
    {
      "type": "correct_answer",
      "text": "B — 3"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Pairs 1, 2, and 3 are exact matches. Pair 4 is not because **5512781** differs from **5512871**; the digits **7** and **8** are transposed. Therefore, **3** pairs are exact matches."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A. Counts Pair 4 as a match even though it contains a transposition."
        },
        {
          "type": "paragraph",
          "text": "C, D, and E. Undercount the exact matches because Pairs 1, 2, and 3 are identical."
        }
      ]
    }
  ],
  "cler-0023": [
    {
      "type": "correct_answer",
      "text": "A — 15-I-2025"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "September is the ninth month, so the supplied month code is **I**. The day and year remain **15** and **2025**, giving the code **15-I-2025**."
    }
  ],
  "cler-0024": [
    {
      "type": "correct_answer",
      "text": "E — 5"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The document's actual type is **Notice**, not Memorandum. The classification table assigns **Notice = 5**, so the correct filing code is **5**. The word “Memo” in the reference label does not change the document type."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A. Uses the code for Memorandum because it treats the reference word “Memo” as the document type."
        },
        {
          "type": "paragraph",
          "text": "B, C, and D. Use the codes for Letter, Report, and Form rather than Notice."
        }
      ]
    }
  ],
  "cler-0025": [
    {
      "type": "correct_answer",
      "text": "C — Entry B"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Recomputing each entry gives: **A:** 18,500 − 3,200 = 15,300; **B:** 22,000 − 4,750 = 17,250; **C:** 16,800 − 2,900 = 13,900; **D:** 25,500 − 5,100 = 20,400. Only Entry B lists an incorrect net pay, so **Entry B** is the answer."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A, B, and D select Entries A, C, and D, all of which have correct net-pay calculations."
        },
        {
          "type": "paragraph",
          "text": "E. Entry D is correct, so Entries B and D are not both incorrect."
        }
      ]
    }
  ],
  "cler-0042": [
    {
      "type": "correct_answer",
      "text": "A — 2-F"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The position table gives **Clerk II = 2**, and the region table gives **NCR = F**. Because the region code is appended as a suffix, the correct code is **2-F**."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "B. Reverses the required order."
        },
        {
          "type": "paragraph",
          "text": "C. Uses E, which represents Region V."
        },
        {
          "type": "paragraph",
          "text": "D. Uses 1, the code for Clerk I."
        },
        {
          "type": "paragraph",
          "text": "E. Uses G, which is not the code for NCR."
        }
      ]
    }
  ],
  "cler-0043": [
    {
      "type": "correct_answer",
      "text": "C — R-P-D-F"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Map each event to its code in the order it occurred: **Received = R**, **Processed = P**, **Disapproved = D**, and **Filed = F**. The correct status code is therefore **R-P-D-F**."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A, D, and E change the stated sequence of events."
        },
        {
          "type": "paragraph",
          "text": "B. Inserts Approved, even though the document was never stated to be approved."
        }
      ]
    }
  ],
  "cler-0044": [
    {
      "type": "correct_answer",
      "text": "A — LG-05"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The department is **Legal = LG**, and the document type is **Contract = 05**. Following the required [Department Code]-[Document Type Code] format gives **LG-05**."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "B, D, and E. Use the wrong document-type codes for Report, Letter, and Request Form."
        },
        {
          "type": "paragraph",
          "text": "C. Uses Administrative (**AD**) instead of Legal (**LG**)."
        }
      ]
    }
  ],
  "cler-0045": [
    {
      "type": "correct_answer",
      "text": "A — 26-11-03-007"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The code uses the last two digits of the year, a two-digit month, a two-digit day, and a three-digit series number. Thus **2026 → 26**, **November → 11**, **day 3 → 03**, and **7th document → 007**, giving **26-11-03-007**."
    },
    {
      "type": "distractor_section",
      "title": "Why the other choices fail",
      "blocks": [
        {
          "type": "paragraph",
          "text": "B. Uses the full year instead of the last two digits."
        },
        {
          "type": "paragraph",
          "text": "C. Reverses the month and day fields."
        },
        {
          "type": "paragraph",
          "text": "D. Omits the leading zero from the day."
        },
        {
          "type": "paragraph",
          "text": "E. Uses only two digits for the series number."
        }
      ]
    }
  ]
};

describe('Clerical Operations Batch 1 structured explanations', () => {
  it('contains exactly the approved content, answer keys, and structured-only cleanup for all ten IDs', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);

    for (const id of CLERICAL_OPERATIONS_BATCH1_IDS) {
      const question = catalog.questions.get(id);
      const expected = EXPECTED_QUESTIONS[id];
      expect(question, id).toBeTruthy();
      expect(question?.subject, id).toBe('Clerical Ability');
      expect(question?.topic, id).toBe('Clerical Operations');
      expect(question?.question, id).toBe(expected.question);
      expect(question?.choices.map((choice) => choice.text), id).toEqual(expected.choices);
      expect(question?.correctOptionId, id).toBe(expected.correctOptionId);
      expect(question?.structuredExplanation?.blocks, id).toEqual(EXPECTED_BLOCKS[id]);
      const distractorSection = question?.structuredExplanation?.blocks.find((block) => block.type === 'distractor_section');
      if (distractorSection?.type === 'distractor_section') {
        expect(distractorSection.blocks.every((child) => {
          const choicePrefix = child.text.match(/^(?:Choices?\s+)?([A-E](?:\s*,\s*[A-E])*(?:\s*,?\s*and\s+[A-E])?)(?=\s|\.|$)/)?.[1] ?? '';
          const choiceTokens: string[] = choicePrefix.match(/[A-E]/g) ?? [];
          return !choiceTokens.includes(expected.correctOptionId);
        }), id).toBe(true);
      }
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      expect(question?.explanation, id).toBeUndefined();
      expect(question?.steps, id).toBeUndefined();
      expect(question?.distractorExplanations, id).toBeUndefined();
      expect(question?.tip, id).toBeUndefined();
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution'), id).toBe(false);
    }
  });

  it('preserves the exact semantic table stimuli for the affected questions', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);

    expect(catalog.questions.get('cler-0042')?.passage).toBeUndefined();
    expect(catalog.questions.get('cler-0042')?.contentBlocks).toEqual([
      { kind: 'text', id: 'cler-0042-intro', body: 'The following code table is used by a regional office to classify position levels:' },
      {
        kind: 'table',
        id: 'cler-0042-position-levels',
        title: 'Position Level Codes',
        columns: ['Code', 'Position Level'],
        rows: [['1', 'Clerk I'], ['2', 'Clerk II'], ['3', 'Administrative Aide'], ['4', 'Administrative Assistant'], ['5', 'Senior Administrative Assistant']],
      },
      { kind: 'text', id: 'cler-0042-region-note', body: 'Region codes are appended as a letter suffix:' },
      {
        kind: 'table',
        id: 'cler-0042-region-codes',
        title: 'Region Codes',
        columns: ['Code', 'Region'],
        rows: [['A', 'Region I'], ['B', 'Region II'], ['C', 'Region III'], ['D', 'Region IV'], ['E', 'Region V'], ['F', 'NCR']],
      },
    ]);

    expect(catalog.questions.get('cler-0044')?.passage).toBeUndefined();
    expect(catalog.questions.get('cler-0044')?.contentBlocks).toEqual([
      { kind: 'text', id: 'cler-0044-intro', body: 'An agency uses a two-part filing code: [Department Code]-[Document Type Code].' },
      {
        kind: 'table',
        id: 'cler-0044-department-codes',
        title: 'Department Codes',
        columns: ['Code', 'Department'],
        rows: [['HR', 'Human Resources'], ['FN', 'Finance'], ['AD', 'Administrative'], ['IT', 'Information Technology'], ['LG', 'Legal']],
      },
      {
        kind: 'table',
        id: 'cler-0044-document-types',
        title: 'Document Type Codes',
        columns: ['Code', 'Document Type'],
        rows: [['01', 'Memorandum'], ['02', 'Letter'], ['03', 'Report'], ['04', 'Request Form'], ['05', 'Contract']],
      },
      { kind: 'text', id: 'cler-0044-example', body: 'Example: FN-03 = Finance Department Report.' },
    ]);

    expect(catalog.questions.get('cler-0043')?.passage).toBeUndefined();
    expect(catalog.questions.get('cler-0043')?.contentBlocks).toEqual([
      { kind: 'text', id: 'cler-0043-intro', body: 'A document management system uses the following code structure:' },
      {
        kind: 'table',
        id: 'cler-0043-action-codes',
        title: 'Action Codes',
        columns: ['Action Code', 'Meaning'],
        rows: [['R', 'Received'], ['P', 'Processed'], ['A', 'Approved'], ['D', 'Disapproved'], ['F', 'Filed']],
      },
      {
        kind: 'text',
        id: 'cler-0043-sequence-note',
        body: "Status codes are combined in sequence to describe a document's history. For example, 'R-P-A-F' means the document was Received, then Processed, then Approved, then Filed.",
      },
    ]);

    expect(catalog.questions.get('cler-0045')?.passage).toBeUndefined();
    expect(catalog.questions.get('cler-0045')?.contentBlocks).toEqual([
      {
        kind: 'text',
        id: 'cler-0045-intro',
        body: 'A government office uses the following alphanumeric coding system for outgoing documents:\n\nCode order: Year (last 2 digits) — Month Code — Day — Series Number.',
      },
      {
        kind: 'table',
        id: 'cler-0045-format-details',
        title: 'Format Details',
        columns: ['Field', 'Specification'],
        rows: [
          ['Year', 'Last 2 digits'],
          ['Month Code', '2 digits'],
          ['Day', '2 digits, zero-padded when necessary'],
          ['Series Number', '3 digits, zero-padded when necessary; sequential, starting at 001 each year'],
        ],
      },
      {
        kind: 'table',
        id: 'cler-0045-month-codes',
        title: 'Month Codes',
        columns: ['Month', 'Code'],
        rows: [['Jan', '01'], ['Feb', '02'], ['Mar', '03'], ['Apr', '04'], ['May', '05'], ['Jun', '06'], ['Jul', '07'], ['Aug', '08'], ['Sep', '09'], ['Oct', '10'], ['Nov', '11'], ['Dec', '12']],
      },
      { kind: 'text', id: 'cler-0045-example', body: 'Example: A letter sent on March 15, 2025, as the 23rd document of the year is coded: 25-03-15-023' },
    ]);
  });

  it('preserves cler-0043’s semantic table in Review Markdown and Raw JSON', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question = catalog.questions.get('cler-0043')!;
    const batch: RefinementBatch = {
      id: 'clerical-operations-batch-01',
      title: 'Clerical Operations — Batch 1',
      family: 'Clerical Operations',
      status: 'ready-for-qa',
      createdAt: '2026-08-25T13:00:00+08:00',
      questionIds: ['cler-0043'],
    };

    const markdown = createReviewMarkdown(batch, [question]);
    expect(markdown).toContain('### Structured Stimulus');
    expect(markdown).toContain('**Action Codes** (table)\n\n| Action Code | Meaning |\n|---|---|\n| R | Received |\n| P | Processed |\n| A | Approved |\n| D | Disapproved |\n| F | Filed |');

    const raw = JSON.parse(createRawBatchJson(batch, [question])) as Array<Record<string, unknown>>;
    expect(raw[0]?.passage).toBeUndefined();
    expect(raw[0]?.contentBlocks).toEqual(question.contentBlocks);
  });

  it('keeps the approved question-data corrections explicit and excludes invented facts', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question0021 = catalog.questions.get('cler-0021')!;
    const question0025 = catalog.questions.get('cler-0025')!;
    const question0045 = catalog.questions.get('cler-0045')!;

    expect(question0021.choices.find((choice) => choice.id === 'C')?.text).toBe('November 14, 2025  —  November 14, 2026');
    expect(question0021.structuredExplanation?.blocks.map((block) => JSON.stringify(block)).join(' ')).not.toContain('impossible date');

    expect(question0025.question).toContain('Net P17,430');
    expect(JSON.stringify(question0025)).not.toContain('P4,570');
    expect(question0025.structuredExplanation?.blocks.map((block) => JSON.stringify(block)).join(' ')).toContain('22,000 − 4,750 = 17,250');

    expect(question0045.passage).toBeUndefined();
    expect(JSON.stringify(question0045.contentBlocks)).toContain('"Day","2 digits, zero-padded when necessary"');
    expect(JSON.stringify(question0045.contentBlocks)).toContain('"Series Number","3 digits, zero-padded when necessary; sequential, starting at 001 each year"');
    expect(question0045.structuredExplanation?.blocks.map((block) => JSON.stringify(block)).join(' ')).not.toContain('adjacent');
  });
});
