import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { isValidStructuredExplanation } from './structuredExplanation';

const FILING_BATCH1_IDS = [
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
] as const;

const EXPECTED_BLOCKS = {
  'cler-0053': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — Folder 3' },
    { type: 'paragraph', label: 'What to Notice', text: 'File names by **surname**, then **given name**, then **middle initial** when needed.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Abad, Bernardo S.*\n**2.** *Abad, Fernando C.*\n**3.** *Abad, Fernando M.*\n**4.** *Abadilla, Teresa G.*' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Bernardo** comes before **Fernando**. Between the two *Fernando* entries, **C** comes before **M**.' },
    { type: 'rule', text: 'Compare filing units from left to right: **surname → given name → middle name or initial**.' },
  ],
  'cler-0054': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *San Juan Development Corporation (The)*' },
    { type: 'paragraph', label: 'What to Notice', text: 'A leading article such as **The**, **A**, or **An** is moved to the end in parentheses.' },
    { type: 'paragraph', label: 'Apply the Rule', text: '*The San Juan Development Corporation*\n→\n*San Juan Development Corporation (The)*\n\nThe filing position is determined by **San**.' },
    { type: 'rule', text: 'Ignore a leading business-name article when alphabetizing it; place the article at the end in parentheses.' },
  ],
  'cler-0058': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — *Subject filing*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The records are grouped by their **main subject or function**.' },
    { type: 'paragraph', text: '*PERSONNEL* → Leave Applications, Appointments\n*SUPPLIES* → Procurement' },
    { type: 'rule', text: '**Subject filing** organizes records by **topic or function**.' },
  ],
  'cler-0059': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — *Atty. Crisanto Banal*' },
    { type: 'paragraph', label: 'What to Notice', text: 'Personal titles such as **Atty.**, **Dr.**, **Gen.**, **Col.**, and **Engr.** are disregarded when filing.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Banal*\n**2.** *Quizon*\n**3.** *Santos*\n**4.** *Villamor*\n**5.** *Zamora*' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Banal** comes first alphabetically, so *Atty. Crisanto Banal* is the first folder.' },
    { type: 'rule', text: 'Ignore the **title** and file the name by **surname**.' },
  ],
  'cler-0060': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — *Judge Erlinda Manalastas*' },
    { type: 'paragraph', label: 'What to Notice', text: 'Ignore the titles and compare the **surnames**.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Dimaculangan*\n**2.** *Ferrer*\n**3.** *Manalastas*\n**4.** *Tagalog*\n**5.** *Urbano*' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Manalastas** is third in alphabetical order.' },
    { type: 'rule', text: 'Ignore personal **titles** and file by **surname**.' },
  ],
  'cler-0001': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — 1-3-2-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'Compare surnames **from left to right**.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Bartolome*\n**2.** *Bautista*\n**3.** *Bondoc*\n**4.** *Buenaventura*' },
    { type: 'paragraph', text: 'Among the two **Ba** names, **r** comes before **u**.' },
    { type: 'rule', text: 'When surnames share the same beginning, continue comparing letter by letter until a difference appears.' },
  ],
  'cler-0002': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *Reyes, Albert*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The surnames are identical, so compare the **given names letter by letter**.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Albert*\n**2.** *Alma*\n**3.** *Amelia*\n**4.** *Ana*\n**5.** *Antonio*' },
    { type: 'paragraph', text: 'At the second letter:\n\n**l** < **m** < **n**\n\nSo *Albert* comes first.' },
    { type: 'rule', text: 'When surnames are identical, compare given names **character by character**, not by length.' },
  ],
  'cler-0003': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — *Santos, A.*' },
    { type: 'paragraph', label: 'What to Notice', text: 'All surnames are the same, so compare the given names. **A.** and **Ana** begin with the same letter, but **A.** ends first.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *A.*\n**2.** *Ana*\n**3.** *Anna*\n**4.** *B.*\n**5.** *Bernardo*' },
    { type: 'rule', text: 'Under **nothing-before-something**, a shorter entry comes before a longer entry beginning with the same letters.' },
  ],
  'cler-0004': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — 3-2-1-4' },
    { type: 'paragraph', label: 'What to Notice', text: 'All surnames begin with **F**, so compare the next letter.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Fajardo*\n**2.** *Ferrer*\n**3.** *Flores*\n**4.** *Fungo*' },
    { type: 'paragraph', text: 'The second letters are:\n\n**a** → **e** → **l** → **u**' },
    { type: 'rule', text: 'When entries share a prefix, compare the **next differing letter**.' },
  ],
  'cler-0005': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *Villarin, Cesar*' },
    { type: 'paragraph', label: 'What to Notice', text: 'All five surnames begin with **Villa**. Compare the first letter that differs.' },
    { type: 'paragraph', label: 'Filing Order', text: '**1.** *Villalobos*\n**2.** *Villanueva*\n**3.** *Villaranda*\n**4.** *Villareal*\n**5.** *Villarin*' },
    { type: 'paragraph', text: 'Among the **Villar** names:\n\n**a** < **e** < **i**\n\nSo *Villarin* comes last.' },
    { type: 'rule', text: 'When surnames share a long prefix, skip the common letters and compare the **first differing letter**.' },
  ],
} as const;

const EXPECTED_QUESTIONS = {
  'cler-0053': { question: 'Which numbered folder is out of order?', choices: ['Folder 3 (Abad, Bernardo S.)', 'Folder 1 (Abad, Fernando C.)', 'Folder 2 (Abad, Fernando M.)', 'Folder 4 (Abadilla, Teresa G.)', 'Folders 1 and 2'], correctOptionId: 'A', taskFormat: 'shared_filing_task' },
  'cler-0054': { question: "In standard alphabetical filing of business names, how should 'The San Juan Development Corporation' be indexed?", choices: ['The San Juan Development Corporation', 'Development Corporation, San Juan (The)', 'Juan Development Corporation, San', 'San Juan Development Corporation (The)', 'San Juan (The) Development Corporation'], correctOptionId: 'D', taskFormat: 'shared_filing_task' },
  'cler-0058': { question: "A government office groups its records by operational function — for example, 'PERSONNEL — Leave Applications', 'PERSONNEL — Appointments', 'SUPPLIES — Procurement'. Which filing method is being used?", choices: ['Geographic filing', 'Subject filing', 'Chronological filing', 'Straight numerical filing', 'Functional-alphabetical filing'], correctOptionId: 'B', taskFormat: 'shared_filing_task' },
  'cler-0059': { question: 'Which folder comes first?', choices: ['Gen. Renato Villamor', 'Atty. Crisanto Banal', 'Dr. Leonora Quizon', 'Col. Primo Santos', 'Engr. Rodolfo Zamora'], correctOptionId: 'B', taskFormat: 'shared_filing_task' },
  'cler-0060': { question: 'Which folder comes third?', choices: ['Judge Erlinda Manalastas', 'Sec. Arturo Dimaculangan', 'Prof. Nicanor Tagalog', 'Atty. Melinda Ferrer', 'Dr. Marisol Urbano'], correctOptionId: 'A', taskFormat: 'shared_filing_task' },
  'cler-0001': { question: 'Select the correct filing order.', choices: ['1-2-3-4', '3-1-2-4', '2-1-3-4', '1-3-2-4', '3-1-4-2'], correctOptionId: 'D', taskFormat: 'shared_filing_task' },
  'cler-0002': { question: 'Which name would be filed FIRST among the following names?', choices: ['Reyes, Antonio', 'Reyes, Ana', 'Reyes, Amelia', 'Reyes, Albert', 'Reyes, Alma'], correctOptionId: 'D', taskFormat: 'legacy_full_prompt' },
  'cler-0003': { question: 'Under standard filing rules, which of the following is filed FIRST?', choices: ['Santos, Ana', 'Santos, Bernardo', 'Santos, A.', 'Santos, B.', 'Santos, Anna'], correctOptionId: 'C', taskFormat: 'legacy_full_prompt' },
  'cler-0004': { question: 'Select the correct filing order.', choices: ['3-2-1-4', '3-1-2-4', '2-3-1-4', '2-1-3-4', '4-3-2-1'], correctOptionId: 'A', taskFormat: 'shared_filing_task' },
  'cler-0005': { question: 'Which name is filed LAST in the group below?', choices: ['Villanueva, Gemma', 'Villareal, Boyet', 'Villalobos, Riza', 'Villarin, Cesar', 'Villaranda, Cora'], correctOptionId: 'D', taskFormat: 'legacy_full_prompt' },
} as const;

describe('Filing Batch 1 structured explanations', () => {
  it('contains exactly the approved structured blocks, answer keys, and task formats for all 10 IDs', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);

    for (const id of FILING_BATCH1_IDS) {
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

  it('uses vertically stacked numbered Filing Order entries with no arrow-based order strings', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const expectedOrders = {
      'cler-0053': ['Abad, Bernardo S.', 'Abad, Fernando C.', 'Abad, Fernando M.', 'Abadilla, Teresa G.'],
      'cler-0059': ['Banal', 'Quizon', 'Santos', 'Villamor', 'Zamora'],
      'cler-0060': ['Dimaculangan', 'Ferrer', 'Manalastas', 'Tagalog', 'Urbano'],
      'cler-0001': ['Bartolome', 'Bautista', 'Bondoc', 'Buenaventura'],
      'cler-0002': ['Albert', 'Alma', 'Amelia', 'Ana', 'Antonio'],
      'cler-0003': ['A.', 'Ana', 'Anna', 'B.', 'Bernardo'],
      'cler-0004': ['Fajardo', 'Ferrer', 'Flores', 'Fungo'],
      'cler-0005': ['Villalobos', 'Villanueva', 'Villaranda', 'Villareal', 'Villarin'],
    } as const;

    for (const [id, entries] of Object.entries(expectedOrders)) {
      const block = catalog.questions.get(id)?.structuredExplanation?.blocks.find(
        (candidate) => candidate.type === 'paragraph' && candidate.label === 'Filing Order'
      );
      expect(block?.type).toBe('paragraph');
      if (!block || block.type !== 'paragraph') continue;
      expect(block.text).not.toContain('→');
      expect(block.text.split('\n')).toEqual(entries.map((entry, index) => `**${index + 1}.** *${entry}*`));
    }
  });

  it('keeps cler-0056 and cler-0057 outside the structured Filing batch', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question0056 = catalog.questions.get('cler-0056');
    const question0057 = catalog.questions.get('cler-0057');
    expect(question0056).toBeTruthy();
    expect(question0057).toBeTruthy();
    expect(question0056?.structuredExplanation).toBeUndefined();
    expect(question0057?.structuredExplanation).toBeTruthy();
    expect(question0056?.taskFormat).not.toBe('shared_filing_task');
    expect(question0057?.taskFormat).not.toBe('shared_filing_task');
  });
});
