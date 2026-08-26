import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { createRawBatchJson, createReviewMarkdown } from './contentBankWorkspace';
import { isValidStructuredExplanation } from './structuredExplanation';
import type { RefinementBatch } from './refinementBatches';

const TARGETS = {
  'cler-0051': {
    question: 'An administrative aide verifies requisition slip totals against invoice items. The four line amounts are: Item A — ₱1,450.00; Item B — ₱2,875.00; Item C — ₱625.00; Item D — ₱3,150.00. The summary report lists the total as ₱8,070.00. Which statement correctly identifies the discrepancy?',
    choices: [
      'The summary total is overstated by ₱30.00 because the actual sum is ₱8,040.00.',
      'The summary total is correct because the four items equal ₱8,070.00.',
      'The summary total is understated by ₱30.00 because the actual sum is ₱8,100.00.',
      'The sum cannot be verified without a tax percentage.',
      'The summary total is understated by ₱100.00 because the actual sum is ₱8,170.00.',
    ],
    correctOptionId: 'C',
    blocks: [
  {
    "type": "correct_answer",
    "text": "C — The summary total is understated by ₱30.00 because the actual sum is ₱8,100.00."
  },
  {
    "type": "paragraph",
    "label": "Rationale",
    "text": "The four line items total **₱8,100.00**: ₱1,450 + ₱2,875 + ₱625 + ₱3,150. The report lists **₱8,070.00**, which is **₱30.00 lower** than the actual total. Therefore, the summary total is understated by **₱30.00**."
  },
  {
    "type": "distractor_section",
    "title": "Why the other choices fail",
    "blocks": [
      {
        "type": "paragraph",
        "text": "A and E. Use incorrect actual totals; the line items add to ₱8,100.00."
      },
      {
        "type": "paragraph",
        "text": "B. Treats ₱8,070.00 as correct even though the line items total ₱8,100.00."
      },
      {
        "type": "paragraph",
        "text": "D. Adds a tax requirement that is not part of the stated calculation."
      }
    ]
  }
],
  },
  'cler-0057': {
    question: 'A clerical officer compares two ledger entries for the same account:\n\n  Entry 1: Account #8492015 — Amount ₱14,582.00\n  Entry 2: Account #8492015 — Amount ₱14,852.00\n\nWhat type of clerical error occurred in Entry 2?',
    choices: [
      'An omission error in the account number',
      'An addition error in the column total',
      'No error — both entries match exactly',
      "A repetition error — the digit '4' appears twice in the amount instead of once",
      "A transposition error — the digits '5' and '8' were swapped in the amount",
    ],
    correctOptionId: 'E',
    blocks: [
  {
    "type": "correct_answer",
    "text": "E — A transposition error — the digits '5' and '8' were swapped in the amount."
  },
  {
    "type": "paragraph",
    "label": "Rationale",
    "text": "The account numbers are identical, but the amounts change from **₱14,582.00** to **₱14,852.00**. The digits **5** and **8** have changed positions, which is a **transposition error**."
  },
  {
    "type": "distractor_section",
    "title": "Why the other choices fail",
    "blocks": [
      {
        "type": "paragraph",
        "text": "A, B, and D. Describe different types of errors that are not present in the entries."
      },
      {
        "type": "paragraph",
        "text": "C. The amounts are different, so the entries do contain an error."
      }
    ]
  }
],
  },
  'seed-cler-003': {
    question: 'Compare the Original Code with the Transcribed Code:\n\nOriginal:  CSC-2026-PH-89014-X\nTranscribed: CSC-2026-PH-89041-X\n\nThe Transcribed Code is:',
    choices: [
      'Exactly identical to the Original',
      'Different due to transposed numbers (14 vs 41)',
      'Different due to incorrect letter prefix',
      'Different due to missing hyphen',
      "Different due to a repeated digit (the digit '9' appears twice in the transcribed code)",
    ],
    correctOptionId: 'B',
    blocks: [
  {
    "type": "correct_answer",
    "text": "B — Different due to transposed numbers (14 vs 41)"
  },
  {
    "type": "paragraph",
    "label": "Rationale",
    "text": "The prefixes, year, hyphens, and final letter are identical. The only change is in the numeric segment: **89014** becomes **89041**. The final digits **14** have been reversed to **41**, so the transcribed code contains a **transposition error**."
  },
  {
    "type": "distractor_section",
    "title": "Why the other choices fail",
    "blocks": [
      {
        "type": "paragraph",
        "text": "A. The numeric segment changes from 89014 to 89041, so the codes are not identical."
      },
      {
        "type": "paragraph",
        "text": "C. The letter prefixes are the same in both codes."
      },
      {
        "type": "paragraph",
        "text": "D. All hyphens are present in both codes."
      },
      {
        "type": "paragraph",
        "text": "E. No digit is repeated; the digits 1 and 4 have changed order."
      }
    ]
  }
],
  },
} as const;

describe('Clerical Operations Batch 2 structured explanations', () => {
  it('preserves the three target questions while migrating only their explanations', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);

    for (const [id, expected] of Object.entries(TARGETS)) {
      const question = catalog.questions.get(id);
      expect(question, id).toBeTruthy();
      expect(question?.question, id).toBe(expected.question);
      expect(question?.choices.map((choice) => choice.text), id).toEqual(expected.choices);
      expect(question?.correctOptionId, id).toBe(expected.correctOptionId);
      expect(question?.structuredExplanation?.blocks, id).toEqual(expected.blocks);
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
    }
  });

  it('keeps each distractor separately identifiable in Learner View and Authoring View', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const questionIds = ['cler-0051', 'cler-0057', 'seed-cler-003'];
    const questions = questionIds.map((id) => catalog.questions.get(id)!);
    const batch: RefinementBatch = {
      id: 'clerical-operations-batch-02-formatting-test',
      title: 'Clerical Operations — Batch 2 formatting test',
      family: 'Clerical Operations',
      status: 'needs-content',
      createdAt: '2026-08-26T00:00:00.000Z',
      questionIds,
    };

    const markdown = createReviewMarkdown(batch, questions);
    const raw = JSON.parse(createRawBatchJson(batch, questions)) as Array<{ id: string; correctOptionId: string; structuredExplanation: { blocks: Array<{ type: string; title?: string; blocks?: Array<{ type: string; label?: string }> }> } }>;
    const rawGroups = raw.map((question) => question.structuredExplanation.blocks.filter((block) => block.type === 'distractor_section'));
    const learnerDistractors = markdown.match(/\*\*Why the other choices fail\*\*/g) ?? [];
    const authoringSections = markdown.match(/- type: distractor_section\n  title: Why the other choices fail/g) ?? [];
    const groupedAuthoringChildren = [...markdown.matchAll(/- type: distractor_section\n  title: Why the other choices fail\n  blocks:\n([\s\S]*?)(?=\n- type: [a-z_]+|$)/g)].map((match) => match[1]);

    expect(learnerDistractors).toHaveLength(3);
    expect(authoringSections).toHaveLength(3);
    expect(groupedAuthoringChildren).toHaveLength(3);
    expect(groupedAuthoringChildren.map((section) => (section.match(/type: paragraph\n\s+label: \(none\)/g) ?? []).length)).toEqual([3, 2, 4]);
    expect(rawGroups).toHaveLength(3);
    expect(rawGroups.every((groups) => groups.length === 1 && groups[0].title === 'Why the other choices fail')).toBe(true);
    expect(rawGroups.every((groups) => groups[0].blocks?.every((child) => child.type === 'paragraph' && child.label === undefined))).toBe(true);
    expect(markdown.match(/- type: step\n  title: Apply the Rule/g) ?? []).toHaveLength(0);
    expect(markdown).toContain('The four line items total **₱8,100.00**');
    expect(markdown).toContain('The account numbers are identical, but the amounts change');
  });

  it('teaches the supplied discrepancy and transposition rationales without divisibility shortcuts', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question0051 = catalog.questions.get('cler-0051')!;
    const question0057 = catalog.questions.get('cler-0057')!;
    const questionSeed003 = catalog.questions.get('seed-cler-003')!;
    const renderedText = [question0051, question0057, questionSeed003]
      .flatMap((question) => question.structuredExplanation?.blocks ?? [])
      .map((block) => JSON.stringify(block))
      .join(' ');

    expect(renderedText).toContain('The four line items total **₱8,100.00**');
    expect(renderedText).toContain('The report lists **₱8,070.00**');
    expect(renderedText).toContain('The digits **5** and **8** have changed positions');
    expect(renderedText).toContain('The final digits **14** have been reversed to **41**');
    expect(renderedText.toLowerCase()).not.toContain('divisibility');
    expect(renderedText.toLowerCase()).not.toContain('divisible by 9');
  });
});
