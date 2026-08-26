import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { createReviewMarkdown } from './contentBankWorkspace';
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
      { type: 'heading', text: 'Solution' },
      { type: 'correct_answer', text: 'C — The summary total is understated by ₱30.00 because the actual sum is ₱8,100.00.' },
      { type: 'paragraph', label: 'What to Notice', text: 'Compare the actual sum of the line items with the reported total. The actual total is ₱8,100.00, while the report lists ₱8,070.00.' },
      { type: 'step', title: 'Apply the Rule', blocks: [
        { type: 'paragraph', text: 'Add the line items:' },
        { type: 'math', expression: '₱1,450 + ₱2,875 = ₱4,325\n₱4,325 + ₱625 = ₱4,950\n₱4,950 + ₱3,150 = ₱8,100' },
        { type: 'paragraph', text: 'The reported total is ₱30.00 lower, so it is understated by ₱30.00.' },
      ] },
      { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
        { type: 'paragraph', text: 'Choice **A** reverses the direction of the discrepancy and gives the wrong actual sum. Because ₱8,100.00 is higher than ₱8,070.00, the report is understated, not overstated.' },
        { type: 'paragraph', text: 'Choice **B** treats the reported total as correct, but the line items add to ₱8,100.00, not ₱8,070.00.' },
        { type: 'paragraph', text: 'Choice **D** introduces tax even though the question asks only for the sum of the listed amounts; no tax percentage is needed.' },
        { type: 'paragraph', text: 'Choice **E** gives the wrong actual sum and discrepancy. The correct actual total is ₱8,100.00, which is ₱30.00 above the report.' },
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
      { type: 'heading', text: 'Solution' },
      { type: 'correct_answer', text: "E — A transposition error — the digits '5' and '8' were swapped in the amount." },
      { type: 'paragraph', label: 'What to Notice', text: 'The account numbers match, but the amounts differ at the third and fourth digits: 14-5-8-2 versus 14-8-5-2.' },
      { type: 'step', title: 'Apply the Rule', blocks: [
        { type: 'paragraph', text: 'Compare the amounts digit by digit.' },
        { type: 'paragraph', text: 'The third and fourth digits change from 5-8 to 8-5, so the digits 5 and 8 have been transposed.' },
      ] },
      { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
        { type: 'paragraph', text: 'Choice **A** is incorrect because the account number is identical in both entries, so no account-number omission occurred.' },
        { type: 'paragraph', text: 'Choice **B** is incorrect because the question compares two individual amounts, not a column total.' },
        { type: 'paragraph', text: 'Choice **C** is incorrect because ₱14,582.00 and ₱14,852.00 differ.' },
        { type: 'paragraph', text: "Choice **D** is incorrect because the amount does not contain a repeated 4; the actual error is that 5 and 8 were swapped." },
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
      { type: 'heading', text: 'Solution' },
      { type: 'correct_answer', text: 'B — Different due to transposed numbers (14 vs 41)' },
      { type: 'paragraph', label: 'What to Notice', text: 'The prefixes, year, and final letter match. Only the last two digits of the numeric segment change from 14 to 41.' },
      { type: 'step', title: 'Apply the Rule', blocks: [
        { type: 'paragraph', text: 'Compare the code segment by segment:' },
        { type: 'paragraph', text: 'CSC = CSC\n2026 = 2026\nPH = PH\n89014 versus 89041\nX = X' },
        { type: 'paragraph', text: 'The digits 1 and 4 have changed order, so the transcribed code contains a transposition.' },
      ] },
      { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
        { type: 'paragraph', text: 'Choice **A** is incorrect because the codes are not identical: 89014 was transcribed as 89041.' },
        { type: 'paragraph', text: 'Choice **C** is incorrect because the letter prefixes CSC and PH match in both codes.' },
        { type: 'paragraph', text: 'Choice **D** is incorrect because all hyphens appear in both codes.' },
        { type: 'paragraph', text: "Choice **E** is incorrect because the issue is not repetition; the digits 1 and 4 were swapped from 14 to 41." },
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
    const learnerDistractors = markdown.match(/\*\*Why the other choices fail\*\*/g) ?? [];
    const authoringSections = markdown.match(/- type: distractor_section\n  title: Why the other choices fail/g) ?? [];
    const groupedAuthoringChildren = [...markdown.matchAll(/- type: distractor_section\n  title: Why the other choices fail\n  blocks:\n([\s\S]*?)(?=\n- type: [a-z_]+|$)/g)].map((match) => match[1]);

    expect(learnerDistractors).toHaveLength(3);
    expect(authoringSections).toHaveLength(3);
    expect(groupedAuthoringChildren).toHaveLength(3);
    expect(groupedAuthoringChildren.every((section) => (section.match(/type: paragraph\n\s+label: \(none\)/g) ?? []).length === 4)).toBe(true);
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
