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
  'cler-0020': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — Reyes, Maria L. — Reyes, Maria I.' },
    { type: 'paragraph', label: 'What to Notice', text: 'An exact match requires every character to be the same, including letters, numbers, punctuation, and spaces.' },
    { type: 'step', title: 'Apply the Rule', blocks: [
      { type: 'paragraph', text: 'Pairs **A**, **B**, **C**, and **D** are identical.' },
      { type: 'paragraph', text: 'Pair **E** differs in the middle initial: **L** versus **I**.' },
    ] },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'A, B, C, and D are exact matches. Because the question asks for the pair that is NOT an exact match, none of these choices satisfies the question.' },
    ] },
    { type: 'rule', text: 'Compare entries character by character. One different letter, number, punctuation mark, or space means the pair is not an exact match.' },
  ],
  'cler-0021': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — Dela Rosa, Benigno T. — Dela Rosa, Benigno T.' },
    { type: 'paragraph', label: 'What to Notice', text: 'Exact matching depends on character-by-character comparison and the order of those characters. Similar-looking entries are not enough.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'Choice **A** repeats the same name, including the comma, spaces, middle initial, and period. It is the only pair with every character in the same position.' },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'B. The final digits change from 00187 to 00178, so the entries do not match.' },
      { type: 'paragraph', text: 'C. The year changes from 2025 to 2026, so the entries do not match.' },
      { type: 'paragraph', text: 'D. The middle digits change from 56 to 65, so 5566 and 5656 are different.' },
      { type: 'paragraph', text: 'E. The sequence changes from 0055 to 0555, so a digit position and value differ.' },
    ] },
    { type: 'rule', text: 'For an exact match, compare each character from left to right and verify its position. Having the same characters in a different order is still a mismatch.' },
  ],
  'cler-0022': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — 3' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check each pair separately. A pair counts only when every character on the left matches the character in the same position on the right.' },
    { type: 'step', title: 'Apply the Rule', blocks: [
      { type: 'paragraph', text: 'Pairs **1**, **2**, and **3** match.' },
      { type: 'paragraph', text: 'Pair **4** does not: **5512781** differs from **5512871** because the **7** and **8** are transposed. Therefore, **3** pairs are exact matches.' },
    ] },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'A. Counts Pair 4 as a match, but Pair 4 contains a transposition.' },
      { type: 'paragraph', text: 'C, D, and E. Undercount the exact matches; Pairs 1, 2, and 3 are identical, so the correct count is 3.' },
    ] },
    { type: 'rule', text: 'In a multi-pair comparison, inspect one pair at a time and count only exact matches. A transposition makes the entire pair incorrect.' },
  ],
  'cler-0023': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 15-I-2025' },
    { type: 'paragraph', label: 'What to Notice', text: 'The supplied lookup assigns **A** to January and advances one letter per month. September is the ninth month, so its code is **I**.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The day and year remain **15** and **2025**. Replacing September with its lookup code gives **15-I-2025**.' },
    { type: 'rule', text: 'Use the lookup scheme provided in the question directly: September is month 9, which corresponds to the ninth letter, **I**.' },
  ],
  'cler-0024': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — 5' },
    { type: 'paragraph', label: 'What to Notice', text: 'Classify the document by its actual document type. The reference number or subject mentioned in its label does not change that type.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The document is a **Notice** about Memo No. 31. The table assigns **Notice = 5**, so the correct code is **5**.' },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'A. Treats the reference word “Memo” as the document type, but code 1 is for a Memorandum.' },
      { type: 'paragraph', text: 'B, C, and D. Use the codes for Letter, Report, and Form, respectively; none matches the required Notice code 5.' },
    ] },
    { type: 'rule', text: 'Use the document’s actual type when assigning a classification code. A reference number or subject does not replace the type of document being filed.' },
  ],
  'cler-0025': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — Entry B' },
    { type: 'paragraph', label: 'What to Notice', text: 'Recompute net pay for every entry using **Gross Pay − Total Deductions = Net Pay**. Compare the result with the listed net pay.' },
    { type: 'step', title: 'Apply the Rule', blocks: [
      { type: 'paragraph', text: 'Recompute the four entries and compare each result with the listed net pay.' },
      { type: 'paragraph', text: '**Entry A:** 18,500 − 3,200 = 15,300, correct.' },
      { type: 'paragraph', text: '**Entry B:** 22,000 − 4,750 = 17,250, not 17,430, incorrect.' },
      { type: 'paragraph', text: '**Entry C:** 16,800 − 2,900 = 13,900, correct.' },
      { type: 'paragraph', text: '**Entry D:** 25,500 − 5,100 = 20,400, correct.' },
      { type: 'paragraph', text: 'Therefore, **Entry B** is the only incorrect entry.' },
    ] },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'Choices A, B, and D select Entries A, C, and D, respectively; all three have correct net-pay calculations.' },
      { type: 'paragraph', text: 'Choice E claims that Entries B and D are both incorrect, but Entry D is correct.' },
    ] },
    { type: 'rule', text: 'For a payroll check, subtract the listed deductions from the listed gross pay and compare the result with the listed net. Do not infer an unseen amount.' },
  ],
  'cler-0042': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 2-F' },
    { type: 'paragraph', label: 'What to Notice', text: 'The position code and region code come from separate lookups: **Clerk II = 2** and **NCR = F**. The region code is a suffix.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'Combine the position code with the region suffix: **2-F**.' },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'B. Reverses the required order by placing the region code before the position code.' },
      { type: 'paragraph', text: 'C. Uses E, which the table assigns to Region V, not NCR.' },
      { type: 'paragraph', text: 'D. Uses 1, the code for Clerk I, not Clerk II.' },
      { type: 'paragraph', text: 'E. Uses G, which the table does not assign to NCR.' },
    ] },
    { type: 'rule', text: 'For a two-part code, look up each component separately and apply the stated order: position code first, region suffix second.' },
  ],
  'cler-0043': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — R-P-D-F' },
    { type: 'paragraph', label: 'What to Notice', text: 'The status code records the document’s events in the order they occurred: Received, Processed, Disapproved, then Filed.' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Received = R**, **Processed = P**, **Disapproved = D**, and **Filed = F**. The stated sequence is therefore **R-P-D-F**.' },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'A, D, and E. Change the chronological order: A places Filed before Disapproved, D places Processed before Received, and E ends with Received instead of the final Filed event.' },
      { type: 'paragraph', text: 'B. Inserts Approved, an event that did not occur.' },
    ] },
    { type: 'rule', text: 'Map each stated event to its code, then preserve the events’ chronological order when combining the codes.' },
  ],
  'cler-0044': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — LG-05' },
    { type: 'paragraph', label: 'What to Notice', text: 'The code requires two lookups: first the department, then the document type. The required order is **[Department Code]-[Document Type Code]**.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'Legal Department = **LG**. Contract = **05**. Combining the two codes gives **LG-05**.' },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'B, D, and E. Use the wrong document-type code: 03 is Report, 02 is Letter, and 04 is Request Form, not Contract 05.' },
      { type: 'paragraph', text: 'C. Uses Administrative AD instead of Legal LG.' },
    ] },
    { type: 'rule', text: 'Solve two-part codes in order: identify the department, identify the document type, and then join their codes with the required separator.' },
  ],
  'cler-0045': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 26-11-03-007' },
    { type: 'paragraph', label: 'What to Notice', text: 'The code has four fields with fixed lengths and order: last two digits of the year, a two-digit month code, a two-digit day, and a three-digit series number.' },
    { type: 'paragraph', label: 'Apply the Rule', text: '2026 → **26**; November → **11**; day 3 → **03**; seventh document → **007**. The complete code is **26-11-03-007**.' },
    { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
      { type: 'paragraph', text: 'B. Uses the full year instead of the last two digits.' },
      { type: 'paragraph', text: 'C. Reverses the month and day fields.' },
      { type: 'paragraph', text: 'D. Omits the leading zero required for a two-digit day.' },
      { type: 'paragraph', text: 'E. Writes the series as two digits instead of the required three.' },
    ] },
    { type: 'rule', text: 'Apply each field’s specified length and position. Zero-pad the day and series number when necessary, and do not change the field order.' },
  ],
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
    expect(question0025.structuredExplanation?.blocks.map((block) => JSON.stringify(block)).join(' ')).toContain('22,000 − 4,750 = 17,250, not 17,430');

    expect(question0045.passage).toBeUndefined();
    expect(JSON.stringify(question0045.contentBlocks)).toContain('"Day","2 digits, zero-padded when necessary"');
    expect(JSON.stringify(question0045.contentBlocks)).toContain('"Series Number","3 digits, zero-padded when necessary; sequential, starting at 001 each year"');
    expect(question0045.structuredExplanation?.blocks.map((block) => JSON.stringify(block)).join(' ')).not.toContain('adjacent');
  });
});
