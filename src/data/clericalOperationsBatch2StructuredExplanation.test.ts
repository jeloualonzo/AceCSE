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
            { type: 'correct_answer', text: 'C — The summary total is understated by ₱30.00 because the actual sum is ₱8,100.00.' },
      { type: 'paragraph', label: 'What to Notice', text: 'Compare the actual sum of the line items with the reported total. The actual total is ₱8,100.00, while the report lists ₱8,070.00.' },
      { type: 'step', title: 'Apply the Rule', blocks: [
        { type: 'paragraph', text: 'Add the line items:' },
        { type: 'math', expression: '₱1,450 + ₱2,875 = ₱4,325\n₱4,325 + ₱625 = ₱4,950\n₱4,950 + ₱3,150 = ₱8,100' },
        { type: 'paragraph', text: 'The reported total is ₱30.00 lower, so it is understated by ₱30.00.' },
      ] },
      { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
        { type: 'paragraph', text: 'A and E. Use incorrect actual sums: the line items total ₱8,100.00, not ₱8,040.00 or ₱8,170.00.' },
        { type: 'paragraph', text: 'B. Treats the reported total as correct, although the line items add to ₱8,100.00.' },
        { type: 'paragraph', text: 'D. Introduces tax even though the question asks only for the sum of the listed amounts; no tax percentage is needed.' },
      ] },
      { type: 'rule', text: 'Compute the actual total first, then compare it with the reported total. If the actual total is higher, the reported total is understated; if it is lower, the reported total is overstated.' },
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
            { type: 'correct_answer', text: "E — A transposition error — the digits '5' and '8' were swapped in the amount." },
      { type: 'paragraph', label: 'What to Notice', text: 'The account numbers match, but the amounts differ at the third and fourth digits: 14-5-8-2 versus 14-8-5-2.' },
      { type: 'step', title: 'Apply the Rule', blocks: [
        { type: 'paragraph', text: 'Compare the amounts digit by digit.' },
        { type: 'paragraph', text: 'The third and fourth digits change from 5-8 to 8-5, so the digits 5 and 8 have been transposed.' },
      ] },
      { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
        { type: 'paragraph', text: 'Choices A, B, and D identify the wrong type of clerical error. The account numbers match, no column total is being checked, and no digit is repeated. The actual error is the transposition of 5 and 8.' },
        { type: 'paragraph', text: 'Choice C claims there is no error, but ₱14,582.00 and ₱14,852.00 are different.' },
      ] },
      { type: 'rule', text: 'Compare numerical entries from left to right. A transposition occurs when the same digits appear in a different order.' },
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
            { type: 'correct_answer', text: 'B — Different due to transposed numbers (14 vs 41)' },
      { type: 'paragraph', label: 'What to Notice', text: 'The prefixes, year, and final letter match. Only the last two digits of the numeric segment change from 14 to 41.' },
      { type: 'step', title: 'Apply the Rule', blocks: [
        { type: 'paragraph', text: 'Compare the code segment by segment:' },
        { type: 'paragraph', text: 'CSC = CSC\n2026 = 2026\nPH = PH\n89014 versus 89041\nX = X' },
        { type: 'paragraph', text: 'The digits 1 and 4 have changed order, so the transcribed code contains a transposition.' },
      ] },
      { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
        { type: 'paragraph', text: 'A. The numeric segment changes from 89014 to 89041, so the codes are not identical.' },
        { type: 'paragraph', text: 'C. The prefixes CSC and PH match in both codes.' },
        { type: 'paragraph', text: 'D. All hyphens are present in both codes.' },
        { type: 'paragraph', text: 'E. The issue is not repetition; the digits 1 and 4 change order from 14 to 41.' },
      ] },
      { type: 'rule', text: 'Compare each code segment from left to right. A transposition occurs when the same digits appear in a different order.' },
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
    expect(markdown.match(/- type: step\n  title: Apply the Rule/g) ?? []).toHaveLength(3);
    expect(markdown).toContain('The reported total is ₱30.00 lower, so it is understated by ₱30.00.');
    expect(markdown).toContain('The third and fourth digits change from 5-8 to 8-5, so the digits 5 and 8 have been transposed.');
  });

  it('teaches direct discrepancy and transposition checks without divisibility shortcuts', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question0051 = catalog.questions.get('cler-0051')!;
    const question0057 = catalog.questions.get('cler-0057')!;
    const questionSeed003 = catalog.questions.get('seed-cler-003')!;
    const renderedText = [question0051, question0057, questionSeed003]
      .flatMap((question) => question.structuredExplanation?.blocks ?? [])
      .map((block) => JSON.stringify(block))
      .join(' ');

    expect(renderedText).toContain('If the actual total is higher, the reported total is understated');
    expect(renderedText).toContain('Compare the amounts digit by digit.');
    expect(renderedText).toContain('The third and fourth digits change from 5-8 to 8-5');
    expect(renderedText).toContain('Compare each code segment from left to right. A transposition occurs when the same digits appear in a different order.');
    expect(renderedText.toLowerCase()).not.toContain('divisibility');
    expect(renderedText.toLowerCase()).not.toContain('divisible by 9');
  });
});
