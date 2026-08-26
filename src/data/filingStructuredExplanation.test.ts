import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { isValidStructuredExplanation } from './structuredExplanation';

const FILING_BATCH1_IDS = [
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
] as const;

const EXPECTED_BLOCKS = {
  'cler-0053': [
    { type: 'correct_answer', text: 'A — Folder 3' },
    { type: 'paragraph', label: 'Rationale', text: 'Folder 3 is out of order because **Abad, Bernardo S.** should come before the two **Abad, Fernando** entries. When surnames are identical, compare the given names next. **Bernardo** comes before **Fernando**. Between the two Fernando entries, **C** comes before **M**. The correct filing order is:\n\n**1.** *Abad, Bernardo S.*\n**2.** *Abad, Fernando C.*\n**3.** *Abad, Fernando M.*\n**4.** *Abadilla, Teresa G.*' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**B:** Folder 1, Abad, Fernando C., is correctly placed after Abad, Bernardo S.' },
      { type: 'paragraph', text: '**C:** Folder 2, Abad, Fernando M., is correctly placed after Abad, Fernando C.' },
      { type: 'paragraph', text: '**D:** Folder 4, Abadilla, Teresa G., correctly follows the Abad entries.' },
      { type: 'paragraph', text: '**E:** Only Folder 3 is misplaced; Folder 1 is not out of order.' },
    ] },
  ],
  'cler-0054': [
    { type: 'correct_answer', text: 'D — San Juan Development Corporation (The)' },
    { type: 'paragraph', label: 'Rationale', text: 'In alphabetical filing of business names, a leading article such as **The**, **A**, or **An** is disregarded for filing purposes and moved to the end in parentheses.\n\n**The San Juan Development Corporation**\n\nbecomes:\n\n**San Juan Development Corporation (The)**\n\nThe filing position is determined by **San**.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Leaves the leading article in front, so the business would be filed under **The**.' },
      { type: 'paragraph', text: '**B:** Reorders the name around **Development**, which is not the filing unit used here.' },
      { type: 'paragraph', text: '**C:** Moves **San** incorrectly to the end instead of preserving the business name.' },
      { type: 'paragraph', text: '**E:** Places **The** after San but before Development, rather than at the end in parentheses.' },
    ] },
  ],
  'cler-0058': [
    { type: 'correct_answer', text: 'B — Subject filing' },
    { type: 'paragraph', label: 'Rationale', text: 'The records are grouped according to their **main subject or function**. Examples include:\n\n**PERSONNEL** → Leave Applications, Appointments\n**SUPPLIES** → Procurement\n\nThis is **subject filing**, because the records are organized according to topic or subject matter rather than by place, date, or number.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Geographic filing organizes records by location.' },
      { type: 'paragraph', text: '**C:** Chronological filing organizes records by date or time.' },
      { type: 'paragraph', text: '**D:** Straight numerical filing organizes records by assigned numbers.' },
      { type: 'paragraph', text: '**E:** Functional-alphabetical filing is not the method demonstrated by the examples; the primary basis shown is the subject or function.' },
    ] },
  ],
  'cler-0059': [
    { type: 'correct_answer', text: 'B — Atty. Crisanto Banal' },
    { type: 'paragraph', label: 'Rationale', text: 'Personal titles such as **Atty.**, **Dr.**, **Gen.**, **Col.**, and **Engr.** are disregarded when filing personal names. The names are therefore filed by surname:\n\n**1.** Banal\n**2.** Quizon\n**3.** Santos\n**4.** Villamor\n**5.** Zamora\n\n**Banal** comes first alphabetically, so **Atty. Crisanto Banal** is the first folder.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Villamor files under **V**, which comes after Banal.' },
      { type: 'paragraph', text: '**C:** Quizon files under **Q**, which comes after Banal.' },
      { type: 'paragraph', text: '**D:** Santos files under **S**, which comes after Banal.' },
      { type: 'paragraph', text: '**E:** Zamora files under **Z**, which comes after Banal.' },
    ] },
  ],
  'cler-0060': [
    { type: 'correct_answer', text: 'A — Judge Erlinda Manalastas' },
    { type: 'paragraph', label: 'Rationale', text: 'Personal titles are disregarded, so the names are ordered by surname:\n\n**1.** Dimaculangan\n**2.** Ferrer\n**3.** Manalastas\n**4.** Tagalog\n**5.** Urbano\n\n**Manalastas** is third in alphabetical order, so **Judge Erlinda Manalastas** is the third folder.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**B:** Dimaculangan comes first, not third.' },
      { type: 'paragraph', text: '**C:** Tagalog comes fourth.' },
      { type: 'paragraph', text: '**D:** Ferrer comes second.' },
      { type: 'paragraph', text: '**E:** Urbano comes fifth.' },
    ] },
  ],
  'cler-0001': [
    { type: 'correct_answer', text: 'D — 1-3-2-4' },
    { type: 'paragraph', label: 'Rationale', text: 'Arrange the surnames alphabetically:\n\n**1.** Bartolome\n**2.** Bautista\n**3.** Bondoc\n**4.** Buenaventura\n\nThe two surnames beginning with **Ba** must be compared letter by letter:\n\n**Bartolome** → **Bar...**\n**Bautista** → **Bau...**\n\nAt the third letter, **r** comes before **u**, so Bartolome comes before Bautista.\n\nThe original entries are:\n\n**1.** Bartolome\n**2.** Bondoc\n**3.** Bautista\n**4.** Buenaventura\n\nTherefore, the correct filing order is **1-3-2-4**.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Keeps Bautista and Bondoc in the wrong order.' },
      { type: 'paragraph', text: '**B:** Places Bautista before Bartolome.' },
      { type: 'paragraph', text: '**C:** Places Bondoc before Bartolome.' },
      { type: 'paragraph', text: '**E:** Places Buenaventura before Bondoc.' },
    ] },
  ],
  'cler-0002': [
    { type: 'correct_answer', text: 'D — Reyes, Albert' },
    { type: 'paragraph', label: 'Rationale', text: 'All five names have the same surname, **Reyes**, so compare the given names character by character:\n\n**1.** Albert\n**2.** Alma\n**3.** Amelia\n**4.** Ana\n**5.** Antonio\n\nAfter the first letter **A**, compare the second letter:\n\n**l < m < n**\n\nTherefore, **Albert** comes first.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Antonio comes after the other A-names when compared letter by letter.' },
      { type: 'paragraph', text: '**B:** Ana begins with **An**, which comes after **Al**.' },
      { type: 'paragraph', text: '**C:** Amelia begins with **Am**, which comes after **Al**.' },
      { type: 'paragraph', text: '**E:** Alma begins with **Al**, but after comparing the next letters, **Albert** comes first.' },
    ] },
  ],
  'cler-0003': [
    { type: 'correct_answer', text: 'C — Santos, A.' },
    { type: 'paragraph', label: 'Rationale', text: 'All surnames are **Santos**, so compare the given-name entries.\n\nThe relevant order is:\n\n**1.** A.\n**2.** Ana\n**3.** Anna\n**4.** B.\n**5.** Bernardo\n\nUnder **nothing-before-something**, the shorter entry comes before a longer entry when the shorter entry is the complete beginning of the longer one. Therefore, **A.** comes before **Ana**.\n\nThe A-entries come before the B-entries, and **Ana** comes before **Anna** because **Ana** ends first. Therefore, **Santos, A.** is filed first.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Ana comes after A. because the shorter entry comes first.' },
      { type: 'paragraph', text: '**B:** Bernardo begins with **B** and therefore follows the A-entries.' },
      { type: 'paragraph', text: '**D:** B. comes after all the A-entries.' },
      { type: 'paragraph', text: '**E:** Anna follows Ana because **Ana** is a complete beginning of **Anna** and ends first.' },
    ] },
  ],
  'cler-0004': [
    { type: 'correct_answer', text: 'A — 3-2-1-4' },
    { type: 'paragraph', label: 'Rationale', text: 'All four surnames begin with **F**, so compare the next letter:\n\n**1.** Fajardo\n**2.** Ferrer\n**3.** Flores\n**4.** Fungo\n\nThe second letters are:\n\n**a → e → l → u**\n\nTherefore, the original entries file in this order:\n\n**3 → 2 → 1 → 4**' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**B:** Places Flores before Ferrer.' },
      { type: 'paragraph', text: '**C:** Places Ferrer before Fajardo.' },
      { type: 'paragraph', text: '**D:** Places Ferrer before Fajardo and Flores.' },
      { type: 'paragraph', text: '**E:** Places Fungo first even though its second letter **u** comes after **a, e,** and **l**.' },
    ] },
  ],
  'cler-0005': [
    { type: 'correct_answer', text: 'D — Villarin, Cesar' },
    { type: 'paragraph', label: 'Rationale', text: 'All five surnames begin with **Villa**, so compare the first letter that differs.\n\nThe filing order is:\n\n**1.** Villalobos\n**2.** Villanueva\n**3.** Villaranda\n**4.** Villareal\n**5.** Villarin\n\nAmong the three **Villar** names, compare the next differing letter:\n\n**a < e < i**\n\nTherefore, **Villarin** comes last.' },
    { type: 'distractor_section', title: 'Why the others are incorrect', blocks: [
      { type: 'paragraph', text: '**A:** Villanueva comes second.' },
      { type: 'paragraph', text: '**B:** Villareal comes fourth.' },
      { type: 'paragraph', text: '**C:** Villalobos comes first.' },
      { type: 'paragraph', text: '**E:** Villaranda comes third.' },
    ] },
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

  it('uses concise rationale sections and one grouped distractor section without forced legacy labels', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);

    for (const id of FILING_BATCH1_IDS) {
      const blocks = catalog.questions.get(id)?.structuredExplanation?.blocks ?? [];
      const labels = blocks.flatMap((block) => block.type === 'paragraph' && block.label ? [block.label] : []);
      expect(labels).toContain('Rationale');
      expect(labels).not.toContain('What to Notice');
      expect(labels).not.toContain('Apply the Rule');
      expect(labels).not.toContain('Filing Order');
      const distractorSections = blocks.filter((block) => block.type === 'distractor_section');
      expect(distractorSections).toHaveLength(1);
      expect(distractorSections[0]?.title).toBe('Why the others are incorrect');
      expect(distractorSections[0]?.blocks.length).toBe(4);
    }
  });

  it('keeps filing-order comparisons readable inside the rationale text', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const expectedRationaleFragments = {
      'cler-0053': ['Abad, Bernardo S.', 'Abad, Fernando C.', 'Abad, Fernando M.', 'Abadilla, Teresa G.'],
      'cler-0059': ['Banal', 'Quizon', 'Santos', 'Villamor', 'Zamora'],
      'cler-0060': ['Dimaculangan', 'Ferrer', 'Manalastas', 'Tagalog', 'Urbano'],
      'cler-0001': ['Bartolome', 'Bautista', 'Bondoc', 'Buenaventura'],
      'cler-0002': ['Albert', 'Alma', 'Amelia', 'Ana', 'Antonio'],
      'cler-0003': ['A.', 'Ana', 'Anna', 'B.', 'Bernardo'],
      'cler-0004': ['Fajardo', 'Ferrer', 'Flores', 'Fungo'],
      'cler-0005': ['Villalobos', 'Villanueva', 'Villaranda', 'Villareal', 'Villarin'],
    } as const;

    for (const [id, entries] of Object.entries(expectedRationaleFragments)) {
      const rationale = catalog.questions.get(id)?.structuredExplanation?.blocks.find(
        (candidate) => candidate.type === 'paragraph' && candidate.label === 'Rationale'
      );
      expect(rationale?.type).toBe('paragraph');
      if (!rationale || rationale.type !== 'paragraph') continue;
      for (const entry of entries) expect(rationale.text).toContain(entry);
      expect(rationale.text.split(/\r?\n/).length).toBeGreaterThan(1);
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
