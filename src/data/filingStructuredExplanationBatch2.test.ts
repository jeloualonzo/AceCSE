import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { isValidStructuredExplanation } from './structuredExplanation';

const BATCH2_IDS = [
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
] as const;

const distractorSection = (entries: readonly [string, string][]) => ({
  type: 'distractor_section' as const,
  title: 'Why the others are incorrect',
  blocks: entries.map(([choice, text]) => ({ type: 'paragraph' as const, text: `**${choice}:** ${text}` })),
});

const EXPECTED_BLOCKS = {
  'cler-0006': [
    { type: 'correct_answer', text: 'C — 2-1-3-4' },
    { type: 'paragraph', label: 'Rationale', text: 'Arrange the surnames by comparing letters from left to right. **Lacsina** comes before **Lacson** because **i < o**. **Lagman** comes before **Laguna** because **m < u**. The correct filing order is **2-1-3-4**.' },
    distractorSection([
      ['A', 'Places Lacsina after Lacson.'],
      ['B', 'Puts Lagman and Laguna before the Lac-surnames.'],
      ['D', 'Reverses Lagman and Laguna.'],
      ['E', 'Reverses the two Lac-surnames and places them after the Lag-surnames.'],
    ]),
  ],
  'cler-0007': [
    { type: 'correct_answer', text: 'A — 1-2-3-4' },
    { type: 'paragraph', label: 'Rationale', text: 'Treat **De la** and **Dela** as part of the surname and compare the filing units continuously. **De la Cruz** comes before **Dela Torre** because **c < t**. Both come before **Dimaculangan** and **Dionisio**, with **m < o** deciding the final pair. The correct order is **1-2-3-4**.' },
    distractorSection([
      ['B', 'Places Dela Torre before De la Cruz and reverses the order of Dimaculangan and Dionisio.'],
      ['C', 'Places the Dima- and Dio-surnames before the De la/Dela names.'],
      ['D', 'Places Dimaculangan before Dela Torre.'],
      ['E', 'Reverses Dionisio and Dimaculangan.'],
    ]),
  ],
  'cler-0008': [
    { type: 'correct_answer', text: 'A — 1-2-3-4' },
    { type: 'paragraph', label: 'Rationale', text: 'Treat **San** as part of the surname. **Salazar** comes before the San-surnames because **l < n**. Among the remaining names, **San Juan** comes before **Santiago** because **j < t**, and **Santiago** comes before **Santos** because **i < o**. The correct order is **1-2-3-4**.' },
    distractorSection([
      ['B', 'Places San Juan before Salazar.'],
      ['C', 'Places Santiago before San Juan.'],
      ['D', 'Places Santos before San Juan and Santiago.'],
      ['E', 'Reverses San Juan and the other S-surnames.'],
    ]),
  ],
  'cler-0009': [
    { type: 'correct_answer', text: 'C — Garcia-Lopez, Alma' },
    { type: 'paragraph', label: 'Rationale', text: 'The four surnames are ordered as **Garces, Garcia, Garcia-Lopez, Garrido**. **Garces** comes first because **e < i**. **Garcia** comes before **Garcia-Lopez** because the shorter matching entry ends first. **Garrido** comes after the Garc-surnames because **r > c**. Therefore, **Garcia-Lopez, Alma** is third.' },
    distractorSection([
      ['A', 'Garrido is fourth, not third.'],
      ['B', 'Garcia is second because it ends before Garcia-Lopez continues.'],
      ['D', 'Garces is first.'],
      ['E', 'Garciatorres is not one of the four names being arranged and is only a distractor choice.'],
    ]),
  ],
  'cler-0010': [
    { type: 'correct_answer', text: 'B — 1-2-3-4' },
    { type: 'paragraph', label: 'Rationale', text: 'For this practice item, the task note establishes the filing convention: the **unsuffixed name first, followed by Jr., Sr., and III**. Therefore, the correct order is **1-2-3-4**. The explanation should follow the stated convention for this item rather than infer an order from family-generation history.' },
    distractorSection([
      ['A', 'Places Jr. before the unsuffixed name.'],
      ['C', 'Places Sr. first and changes the stated order.'],
      ['D', 'Places Sr. before Jr.'],
      ['E', 'Places III before Jr. and Sr.'],
    ]),
  ],
  'cler-0011': [
    { type: 'correct_answer', text: 'D — 1-2-3-4' },
    { type: 'paragraph', label: 'Rationale', text: 'Treat **De**, **Del**, and **Delos** as part of each surname and compare the filing units from left to right. **De Jesus** comes before **Del Mundo** and **Delos Reyes** because **j < l**. Among the Del- names, **Del Mundo** comes before **Delos Reyes** because **m < o**. **De Vera** comes last because **v** is later than the other deciding letters. The correct order is **1-2-3-4**.' },
    distractorSection([
      ['A', 'Places De Vera first even though **v** comes after the deciding letters.'],
      ['B', 'Reverses De Jesus with the Del-surnames and places De Vera first.'],
      ['C', 'Places Delos Reyes before Del Mundo.'],
      ['E', 'Places De Vera before the other surnames.'],
    ]),
  ],
  'cler-0031': [
    { type: 'correct_answer', text: 'C — Banzon, Felipe' },
    { type: 'paragraph', label: 'Rationale', text: 'The four **Ba...** surnames are ordered by their third letters: **n, s, u, y**. **Bermudez** begins with **Be**, so it follows all of the Ba-surnames. Therefore, **Banzon, Felipe** is filed first.' },
    distractorSection([
      ['A', 'Bautista is third, after Banzon and Basilio.'],
      ['B', 'Basilio is second.'],
      ['D', 'Bayani is fourth.'],
      ['E', 'Bermudez begins with **Be** and is fifth.'],
    ]),
  ],
  'cler-0032': [
    { type: 'correct_answer', text: 'B — Santos, Maria' },
    { type: 'paragraph', label: 'Rationale', text: 'The complete filing order is **Samson, San Jose, Santiago, Santillan, Santos**. **Samson** comes first because **m < n** after **Sa**. **San Jose** follows because **j < t**. Among the Sant- names, **Santiago** comes before **Santillan**, and both come before **Santos**. Therefore, **Santos, Maria** is last.' },
    distractorSection([
      ['A', 'San Jose is second.'],
      ['C', 'Samson is first.'],
      ['D', 'Santiago is third.'],
      ['E', 'Santillan is fourth.'],
    ]),
  ],
  'cler-0033': [
    { type: 'correct_answer', text: 'D — Villamor, Ben' },
    { type: 'paragraph', label: 'Rationale', text: '**Villa** comes first because it ends before the other Villa- names continue. After that, compare the next letters: **m < n < r**, so **Villamor** comes before Villanueva and the Villar- names. Between **Villar** and **Villareal**, the shorter **Villar** comes first under nothing-before-something. Therefore, **Villamor, Ben** is second.' },
    distractorSection([
      ['A', 'Villanueva is third.'],
      ['B', 'Villar is fourth.'],
      ['C', 'Villa is first.'],
      ['E', 'Villareal is fifth.'],
    ]),
  ],
  'seed-cler-001': [
    { type: 'correct_answer', text: 'C — Del Fierro, Ana' },
    { type: 'paragraph', label: 'Rationale', text: 'The four names being arranged are **De Castro, De La Cruz, Del Fierro, and Del Rosario**. **De Castro** comes first because **c < l** after **de**. Among the Del- names, **Del Fierro** comes before **Del Rosario** because **f < r**. Therefore, **Del Fierro, Ana** is third. **De la Rama, Pilar** is an answer choice but is not part of the four-name filing set.' },
    distractorSection([
      ['A', 'De Castro is first.'],
      ['B', 'De La Cruz is second.'],
      ['D', 'Del Rosario is fourth.'],
      ['E', 'De la Rama is a distractor choice and is not one of the four names being arranged.'],
    ]),
  ],
  'cler-0036': [
    { type: 'correct_answer', text: 'C — San Pedro, Lito' },
    { type: 'paragraph', label: 'Rationale', text: 'For this item, **Sta.** is treated as **Santa** when comparing the filing units. **San Pedro** comes before the Santa names because **n < t**. Between **Santa Cruz** and **Sta. Maria (Santa Maria)**, **c < m**. **Santos** follows the San/Santa entries, and **Serrano** follows all of the Sa-surnames. Therefore, **San Pedro, Lito** is first.' },
    distractorSection([
      ['A', 'Sta. Maria is third, not first.'],
      ['B', 'Santos is fourth.'],
      ['D', 'Santa Cruz is second.'],
      ['E', 'Serrano is fifth.'],
    ]),
  ],
  'cler-0037': [
    { type: 'correct_answer', text: 'D — Bureau of Local Government Finance' },
    { type: 'paragraph', label: 'Rationale', text: 'All five names begin with **Bureau of**, so compare the next words. The order is **Customs, Immigration, Internal Revenue, Land Management, Local Government Finance**. **Immigration** comes before **Internal** because **m < n**, and **Land** comes before **Local** because **a < o**. Therefore, **Bureau of Local Government Finance** is last.' },
    distractorSection([
      ['A', 'Bureau of Internal Revenue is third.'],
      ['B', 'Bureau of Immigration is second.'],
      ['C', 'Bureau of Customs is first.'],
      ['E', 'Bureau of Land Management is fourth.'],
    ]),
  ],
  'cler-0038': [
    { type: 'correct_answer', text: 'B — Ng, Bernard' },
    { type: 'paragraph', label: 'Rationale', text: 'The filing order is **Navarro, Ng, Ngo, Nieto, Nolasco**. **Navarro** comes first because **a < g**. **Ng** ends after the shared **Ng**, so nothing-before-something places it before **Ngo**. The **Ni** names follow the Ng names, and **Nieto** comes before **Nolasco** because **i < o**. Therefore, **Ng, Bernard** is second.' },
    distractorSection([
      ['A', 'Ngo is third because Ng comes first among the two matching prefixes.'],
      ['C', 'Navarro is first.'],
      ['D', 'Nieto is fourth.'],
      ['E', 'Nolasco is fifth.'],
    ]),
  ],
  'cler-0039': [
    { type: 'correct_answer', text: 'B — Ace Hardware Philippines' },
    { type: 'paragraph', label: 'Rationale', text: 'Under the **practice item’s stated business-name convention**, the five leading forms are compared as **Ace, A.G., Alpha, Seven, and Three**. **Ace** comes before **A.G.** because **c < g**, and **A.G.** comes before **Alpha** because **g < l**. The A-starting names therefore come before the numeric-starting names under this item’s convention, making **Ace Hardware Philippines** first.' },
    distractorSection([
      ['A', '7-Eleven is fourth under the stated numeric-starter convention.'],
      ['C', '3M is fifth under the stated numeric-starter convention.'],
      ['D', 'A.G. Reyes & Associates is second.'],
      ['E', 'Alpha Business Solutions is third.'],
    ]),
  ],
} as const;

const EXPECTED_QUESTIONS = {
  'cler-0006': { question: 'Select the correct filing order.', choices: ['1-2-3-4', '3-2-1-4', '2-1-3-4', '1-2-4-3', '3-4-2-1'], correctOptionId: 'C', taskFormat: 'shared_filing_task' },
  'cler-0007': { question: 'Select the correct filing order.', choices: ['1-2-3-4', '2-1-4-3', '3-4-1-2', '1-3-2-4', '1-2-4-3'], correctOptionId: 'A', taskFormat: 'shared_filing_task' },
  'cler-0008': { question: 'Select the correct filing order.', choices: ['1-2-3-4', '2-3-4-1', '1-3-2-4', '2-1-4-3', '2-1-3-4'], correctOptionId: 'A', taskFormat: 'shared_filing_task' },
  'cler-0009': { question: 'Which name is filed THIRD when these four names are arranged in alphabetical order?\n\n  Garces, Tony\n  Garcia-Lopez, Alma\n  Garcia, Zoe\n  Garrido, Lara', choices: ['Garrido, Lara', 'Garcia, Zoe', 'Garcia-Lopez, Alma', 'Garces, Tony', 'Garciatorres, Nena'], correctOptionId: 'C', taskFormat: 'shared_filing_task' },
  'cler-0010': { question: 'Select the correct order for these folders.', choices: ['2-3-1-4', '1-2-3-4', '3-2-4-1', '1-3-2-4', '1-4-2-3'], correctOptionId: 'B', taskFormat: 'shared_filing_task' },
  'cler-0011': { question: 'Select the correct filing order.', choices: ['4-1-3-2', '2-3-1-4', '1-3-2-4', '1-2-3-4', '4-2-3-1'], correctOptionId: 'D', taskFormat: 'shared_filing_task' },
  'cler-0031': { question: 'Which of the following names should be filed FIRST in alphabetical order?', choices: ['Bautista, Armando', 'Basilio, Corazon', 'Banzon, Felipe', 'Bayani, Dolores', 'Bermudez, Silvia'], correctOptionId: 'C', taskFormat: 'shared_filing_task' },
  'cler-0032': { question: 'Which of the following names should be filed LAST in alphabetical order?', choices: ['San Jose, Pedro', 'Santos, Maria', 'Samson, Rafael', 'Santiago, Luz', 'Santillan, Jose'], correctOptionId: 'B', taskFormat: 'shared_filing_task' },
  'cler-0033': { question: 'Which of the following names should be filed SECOND in alphabetical order?', choices: ['Villanueva, Jose', 'Villar, Ana', 'Villa, Carmen', 'Villamor, Ben', 'Villareal, Tomas'], correctOptionId: 'D', taskFormat: 'shared_filing_task' },
  'seed-cler-001': { question: 'Which name comes third?', choices: ['De Castro, Pedro', 'De La Cruz, Juan', 'Del Fierro, Ana', 'Del Rosario, Maria', 'De la Rama, Pilar'], correctOptionId: 'C', taskFormat: 'shared_filing_task' },
  'cler-0036': { question: 'A file clerk must arrange the following names in correct alphabetical order. Which name should be filed FIRST?', choices: ['Sta. Maria, Rosario', 'Santos, Domingo', 'San Pedro, Lito', 'Santa Cruz, Elia', 'Serrano, Lorna'], correctOptionId: 'C', taskFormat: 'shared_filing_task' },
  'cler-0037': { question: 'A clerk is filing records for the following government offices. Which office name should be filed LAST in alphabetical order?', choices: ['Bureau of Internal Revenue', 'Bureau of Immigration', 'Bureau of Customs', 'Bureau of Local Government Finance', 'Bureau of Land Management'], correctOptionId: 'D', taskFormat: 'shared_filing_task' },
  'cler-0038': { question: 'A records clerk must file the following names in alphabetical order. Which name is filed SECOND?', choices: ['Ngo, Alfonso', 'Ng, Bernard', 'Navarro, Cecile', 'Nieto, Diana', 'Nolasco, Elena'], correctOptionId: 'B', taskFormat: 'shared_filing_task' },
  'cler-0039': { question: 'A clerk is filing records for the following business names. Under standard business-name filing rules, which is filed FIRST?', choices: ['7-Eleven Convenience Store', 'Ace Hardware Philippines', '3M Philippines, Inc.', 'A.G. Reyes & Associates', 'Alpha Business Solutions'], correctOptionId: 'B', taskFormat: 'shared_filing_task' },
} as const;

describe('Filing Batch 2 structured explanations', () => {
  it('contains the exact approved blocks, preserved question fixtures, and task formats for all 14 IDs', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    for (const id of BATCH2_IDS) {
      const question = catalog.questions.get(id);
      const expected = EXPECTED_QUESTIONS[id];
      expect(question).toBeTruthy();
      expect(question?.question).toBe(expected.question);
      expect(question?.choices.map((choice) => choice.text)).toEqual(expected.choices);
      expect(question?.correctOptionId).toBe(expected.correctOptionId);
      expect(question?.taskFormat).toBe(expected.taskFormat);
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.explanation).toBeUndefined();
      expect(question?.steps).toBeUndefined();
      expect(question?.distractorExplanations).toBeUndefined();
      expect(question?.tip).toBeUndefined();
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    }
  });

  it('uses only the requested Rationale and one grouped distractor section for every Batch 2 explanation', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    for (const id of BATCH2_IDS) {
      const blocks = catalog.questions.get(id)?.structuredExplanation?.blocks ?? [];
      const labels = blocks.flatMap((block) => block.type === 'paragraph' && block.label ? [block.label] : []);
      expect(labels).toEqual(['Rationale']);
      expect(labels).not.toContain('What to Notice');
      expect(labels).not.toContain('Apply the Rule');
      expect(labels).not.toContain('Filing Order');
      expect(labels).not.toContain('Rule');
      expect(blocks.filter((block) => block.type === 'heading' && block.text === 'Solution')).toHaveLength(0);
      const distractors = blocks.filter((block) => block.type === 'distractor_section');
      expect(distractors).toHaveLength(1);
      expect(distractors[0]?.title).toBe('Why the others are incorrect');
      expect(distractors[0]?.blocks).toHaveLength(4);
      expect(distractors[0]?.blocks.every((block) => block.type === 'paragraph')).toBe(true);
    }
  });

  it('keeps Batch 1, cler-0056, and cler-0057 outside this Batch 2 fixture while retaining their canonical/runtime behavior', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    for (const id of ['cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060', 'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005']) {
      expect(catalog.questions.get(id)?.structuredExplanation).toBeTruthy();
    }
    expect(catalog.questions.get('cler-0056')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('cler-0057')?.structuredExplanation).toBeTruthy();
    expect(catalog.questions.get('cler-0056')?.taskFormat).not.toBe('shared_filing_task');
    expect(catalog.questions.get('cler-0057')?.taskFormat).not.toBe('shared_filing_task');
  });
});
