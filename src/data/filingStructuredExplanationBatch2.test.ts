import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { isValidStructuredExplanation } from './structuredExplanation';

const BATCH2_IDS = [
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
] as const;

const filingOrder = (entries: readonly string[]) => ({
  type: 'paragraph' as const,
  label: 'Filing Order',
  text: entries.map((entry, index) => `**${index + 1}.** *${entry}*`).join('\n'),
});

const EXPECTED_BLOCKS = {
  'cler-0006': [
        { type: 'correct_answer', text: 'C — 2-1-3-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'Compare each **surname from left to right** and stop at the first differing letter.' },
    filingOrder(['Lacsina, Myrna', 'Lacson, Iris', 'Lagman, Pio', 'Laguna, Rene']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'In *Lacsina* and *Lacson*, **i** comes before **o**. In *Lagman* and *Laguna*, **m** comes before **u**. Therefore the order is **2-1-3-4**.' },
    { type: 'rule', text: 'Use the first differing letter to resolve each surname comparison; do not rely on name length when an earlier letter decides the order.' },
  ],
  'cler-0007': [
        { type: 'correct_answer', text: 'A — 1-2-3-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'Treat **De la** and **Dela** as part of the surname filing unit and compare the normalized surname continuously.' },
    filingOrder(['De la Cruz, Maria', 'Dela Torre, Jose', 'Dimaculangan, Risa', 'Dionisio, Pao']),
    { type: 'paragraph', label: 'Apply the Rule', text: '*delacruz* comes before *delatorre* because **c < t**. Both *dela...* names precede *dima...* and *dio...*; between those last two, **m < o**.' },
    { type: 'rule', text: 'Keep a surname prefix such as **De la** or **Dela** with the surname and compare the resulting filing unit from left to right.' },
  ],
  'cler-0008': [
        { type: 'correct_answer', text: 'A — 1-2-3-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'Treat **San** as part of the surname filing unit and compare the names from the beginning.' },
    filingOrder(['Salazar, Mila', 'San Juan, Pedro', 'Santiago, Rosa', 'Santos, Celia']),
    { type: 'paragraph', label: 'Apply the Rule', text: '*Salazar* comes before the *San...* names because **l < n**. *San Juan* comes before *Santiago* and *Santos* because **j < t**; *Santiago* comes before *Santos* because **i < o**.' },
    { type: 'rule', text: 'When a prefix such as **San** is part of the surname, compare it as part of the complete filing unit.' },
  ],
  'cler-0009': [
        { type: 'correct_answer', text: 'C — *Garcia-Lopez, Alma*' },
    { type: 'paragraph', label: 'What to Notice', text: 'A hyphenated surname is one continuous filing unit for this item. The four names being arranged are *Garces*, *Garcia*, *Garcia-Lopez*, and *Garrido*.' },
    filingOrder(['Garces, Tony', 'Garcia, Zoe', 'Garcia-Lopez, Alma', 'Garrido, Lara']),
    { type: 'paragraph', label: 'Apply the Rule', text: '**e < i** puts *Garces* before the two *Garcia...* names. *Garcia* ends before *Garcia-Lopez* continues, so the shorter matching string comes first. **r > c** puts *Garrido* after the *Garc...* names.' },
    { type: 'rule', text: 'Treat a hyphenated surname as one continuous unit and apply **nothing-before-something** when one matching string ends before the other continues.' },
  ],
  'cler-0010': [
        { type: 'correct_answer', text: 'B — 1-2-3-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'The surname and given name are identical, so the **suffix becomes the deciding filing unit**.' },
    filingOrder(['Mendoza, Roberto (no suffix)', 'Mendoza, Roberto Jr.', 'Mendoza, Roberto Sr.', 'Mendoza, Roberto III']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'The surname and given name are identical, so compare the **suffix as the final filing unit**. The unsuffixed form ends first, so **nothing comes before something** and it is filed before the suffixed forms. Among the suffix labels in this filing set, the order is **Jr.**, **Sr.**, then **III**, giving **no suffix → Jr. → Sr. → III**.' },
    { type: 'rule', text: 'For this item, apply the established suffix convention shown in its task note. Do not explain the order as family-generation history.' },
  ],
  'cler-0011': [
        { type: 'correct_answer', text: 'D — 1-2-3-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'Treat **De**, **Del**, and **Delos** as part of each surname filing unit and compare the normalized strings.' },
    filingOrder(['De Jesus, Mario', 'Del Mundo, Carla', 'Delos Reyes, Tina', 'De Vera, Luis']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'At the decisive position, **j < l < v**, so *De Jesus* comes first and *De Vera* comes last. Among the two *Del...* names, **m < o**, so *Del Mundo* precedes *Delos Reyes*.' },
    { type: 'rule', text: 'Keep compound surname prefixes with the surname and compare the next differing letter.' },
  ],
  'cler-0031': [
        { type: 'correct_answer', text: 'C — *Banzon, Felipe*' },
    { type: 'paragraph', label: 'What to Notice', text: 'All four **Ba...** surnames share the first two letters, so compare the third letter. *Bermudez* begins **Be** and follows every **Ba...** surname.' },
    filingOrder(['Banzon, Felipe', 'Basilio, Corazon', 'Bautista, Armando', 'Bayani, Dolores', 'Bermudez, Silvia']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'The decisive third letters are **n < s < u < y**. Therefore *Banzon, Felipe* is filed first.' },
    { type: 'rule', text: 'When several surnames share a prefix, compare the first letter at which they differ.' },
  ],
  'cler-0032': [
        { type: 'correct_answer', text: 'B — *Santos, Maria*' },
    { type: 'paragraph', label: 'What to Notice', text: 'All five names must be included. Treat **San** as part of the surname and compare the complete filing units.' },
    filingOrder(['Samson, Rafael', 'San Jose, Pedro', 'Santiago, Luz', 'Santillan, Jose', 'Santos, Maria']),
    { type: 'paragraph', label: 'Apply the Rule', text: '*Samson* comes first because **m < n** after **Sa**. *San Jose* comes next because **j < t**. Among the remaining **Sant...** names, **i < o**, then **a < l**, so *Santiago* precedes *Santillan*, and both precede *Santos*. Thus *Santos* is last.' },
    { type: 'rule', text: 'Compare all five surnames letter by letter; do not stop after ordering only the names that share the same visible prefix.' },
  ],
  'cler-0033': [
        { type: 'correct_answer', text: 'D — *Villamor, Ben*' },
    { type: 'paragraph', label: 'What to Notice', text: 'All five choices must be accounted for. *Villa* ends before the other matching names continue, so nothing-before-something puts it first.' },
    filingOrder(['Villa, Carmen', 'Villamor, Ben', 'Villanueva, Jose', 'Villar, Ana', 'Villareal, Tomas']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'After *Villa*, compare the next differing letters: **m < n < r**. Between *Villar* and *Villareal*, the shorter *Villar* ends first. Therefore *Villamor* is second.' },
    { type: 'rule', text: 'Use nothing-before-something when a surname ends at a shared prefix, then continue letter-by-letter for the remaining names.' },
  ],
  'seed-cler-001': [
        { type: 'correct_answer', text: 'C — *Del Fierro, Ana*' },
    { type: 'paragraph', label: 'Four names being arranged', text: 'The filing set contains exactly four names:' },
    filingOrder(['De Castro, Pedro', 'De La Cruz, Juan', 'Del Fierro, Ana', 'Del Rosario, Maria']),
    { type: 'paragraph', label: 'Apply the Rule', text: '*De Castro* comes first because **c < l** after **de**. Among the *del...* names, **a < f < r**, so *Del Fierro, Ana* is third. *De la Rama, Pilar* is an answer choice and distractor, not part of the four-name filing set.' },
    { type: 'rule', text: 'Order only the four authored filing entries; distinguish the displayed answer choices from the entries being arranged.' },
  ],
  'cler-0036': [
        { type: 'correct_answer', text: 'C — *San Pedro, Lito*' },
    { type: 'paragraph', label: 'What to Notice', text: 'For this item, interpret **Sta.** as **Santa** before comparing the filing units.' },
    filingOrder(['San Pedro, Lito', 'Santa Cruz, Elia', 'Sta. Maria, Rosario', 'Santos, Domingo', 'Serrano, Lorna']),
    { type: 'paragraph', label: 'Apply the Rule', text: '*San Pedro* precedes the **Santa...** names. Between the Santa entries, **c < m**; *Santos* follows them, and *Serrano* follows every **Sa...** entry.' },
    { type: 'rule', text: 'Apply the item’s abbreviation convention consistently: read **Sta.** as **Santa** for comparison, while preserving the authored entry as displayed.' },
  ],
  'cler-0037': [
        { type: 'correct_answer', text: 'D — *Bureau of Local Government Finance*' },
    { type: 'paragraph', label: 'What to Notice', text: 'There are five choices, and all five office names must be compared. The shared prefix is **Bureau of**.' },
    filingOrder(['Bureau of Customs', 'Bureau of Immigration', 'Bureau of Internal Revenue', 'Bureau of Land Management', 'Bureau of Local Government Finance']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'Compare the next meaningful word: **C**, **I**, **I**, **L**, **L**. *Immigration* precedes *Internal* because **m < n**. Between *Land* and *Local*, **a < o**, so *Bureau of Local Government Finance* is last.' },
    { type: 'rule', text: 'Keep government office names in their authored form and compare the first meaningful word after a shared prefix.' },
  ],
  'cler-0038': [
        { type: 'correct_answer', text: 'B — *Ng, Bernard*' },
    { type: 'paragraph', label: 'What to Notice', text: 'Compare the surnames letter by letter, including the short **Ng** entry and the longer **Ngo** entry.' },
    filingOrder(['Navarro, Cecile', 'Ng, Bernard', 'Ngo, Alfonso', 'Nieto, Diana', 'Nolasco, Elena']),
    { type: 'paragraph', label: 'Apply the Rule', text: '*Navarro* begins **Na** and comes first. *Ng* ends after the second letter, so nothing-before-something places it before *Ngo*. The **Ni...** name follows the **Ng...** names, and **i < o** places *Nieto* before *Nolasco*.' },
    { type: 'rule', text: 'When one surname ends while another continues after the same prefix, the shorter entry files first.' },
  ],
  'cler-0039': [
        { type: 'correct_answer', text: 'B — *Ace Hardware Philippines*' },
    { type: 'paragraph', label: 'What to Notice', text: 'Account for all five business names. Under the repository’s business-name convention, compare numeric starters in their spelled-out form, treat **A.G.** letter by letter, and ignore punctuation as a separator.' },
    filingOrder(['Ace Hardware Philippines', 'A.G. Reyes & Associates', 'Alpha Business Solutions', '7-Eleven Convenience Store', '3M Philippines, Inc.']),
    { type: 'paragraph', label: 'Apply the Rule', text: 'The leading forms compare as *Ace*, *A.G.*, *Alpha*, *Seven*, and *Three*. *Ace* comes before *A.G.* because **c < g**, and *A.G.* comes before *Alpha* because **g < l** at the second letter. The **A...** entries therefore precede *Seven* and *Three* under the established numeric-starter convention, so *Ace Hardware Philippines* remains first.' },
    { type: 'rule', text: 'Use the established business-name comparison: normalize numeric starters for alphabetizing, compare abbreviations letter by letter, and retain the complete authored name.' },
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
  it('contains the approved blocks, preserved question fixtures, and task formats for all 14 IDs', async () => {
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

  it('uses stacked Filing Order blocks with no arrow-separated order lists', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    for (const id of BATCH2_IDS) {
      const blocks = catalog.questions.get(id)?.structuredExplanation?.blocks ?? [];
      const orderBlock = blocks.find((block) => block.type === 'paragraph' && block.label === 'Filing Order');
      expect(orderBlock?.type).toBe('paragraph');
      if (!orderBlock || orderBlock.type !== 'paragraph') continue;
      expect(orderBlock.text).not.toContain('→');
      expect(orderBlock.text.split('\n').every((line, index) => line.startsWith(`**${index + 1}.** *`))).toBe(true);
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
