import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';
import { isValidQuestion } from '@/data/questionShape';
import { isValidStructuredExplanation } from '@/data/structuredExplanation';

const APPROVED_IDS = [
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
] as const;

type ApprovedId = (typeof APPROVED_IDS)[number];

const EXPECTED_BLOCKS = {
  'cler-0055': [
    { type: 'correct_answer', text: 'C — *Personnel*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correct spelling is **personnel**, with **double n** and a **single l**. *Personnel* refers to employees or staff, while *personal* means individual or private.' },
  ],
  'cler-0012': [
    { type: 'correct_answer', text: 'D — *accommodate*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correct spelling is **accommodate**, with **double c** and **double m**. Remembering the two doubled consonants helps distinguish it from common misspellings such as *accomodate* and *acommodate*.\n\n**Memory aid:** Accommodate has **double c** and **double m**.' },
  ],
  'cler-0013': [
    { type: 'correct_answer', text: 'E — *seperate*' },
    { type: 'paragraph', label: 'Rationale', text: 'The misspelled word is **seperate**. The correct spelling is **separate**, with **a**, not **e**, after **p**: *sep-a-rate*.\n\n**Memory aid:** There is a **RAT** in sepa-**RAT**-e.' },
  ],
  'cler-0014': [
    { type: 'correct_answer', text: 'D — *embarrass*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correct spelling is **embarrass**, with **double r** and **double s**.' },
  ],
  'cler-0015': [
    { type: 'correct_answer', text: 'D — *priviledge*' },
    { type: 'paragraph', label: 'Rationale', text: 'The misspelled word is **priviledge**. The correct spelling is **privilege**, ending in **-lege**, not **-ledge**.\n\nA useful comparison is *privilege, college, sacrilege,* and *allege* versus *knowledge, acknowledge, pledge,* and *sledge*.\n\n**Memory aid:** Privi-**LEGE**.' },
  ],
  'cler-0016': [
    { type: 'correct_answer', text: 'A — *maintenance*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correct spelling is **maintenance**. It contains **-ten-** in the middle, not **-tain-**, and ends in **-ance**, not **-ence**.\n\nCompare **maintenance, attendance, assistance, importance,** and **resistance** with words such as **difference, reference, existence, dependence,** and **confidence**.\n\n**Memory aid:** Think **MAIN-ten-ance**, not *MAIN-tain-ance*.' },
  ],
  'cler-0017': [
    { type: 'correct_answer', text: 'B — *conscientous*' },
    { type: 'paragraph', label: 'Rationale', text: 'The misspelled word is **conscientous**. The correct spelling is **conscientious**, with **-ious**, not **-ous**.\n\nExamples with **-ious** include *conscientious, curious, serious, delicious,* and *gracious*, while words such as *famous, nervous, dangerous, generous,* and *enormous* use **-ous**.\n\n**Memory aid:** *Conscientious* contains **-ious**.' },
  ],
  'cler-0018': [
    { type: 'correct_answer', text: 'E — *perseverance*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correct spelling is **perseverance**. It keeps the root **persever-** and ends in **-ance**.\n\nCompare *perseverance, appearance, endurance, attendance,* and *resistance* with *difference, reference, existence, dependence,* and *confidence*.\n\n**Memory aid:** Connect *perseverance* with *persevere*: **persever-** + **-ance**.' },
  ],
  'cler-0019': [
    { type: 'correct_answer', text: 'E — *supercede*' },
    { type: 'paragraph', label: 'Rationale', text: 'The misspelled word is **supercede**. The correct spelling is **supersede**, which uses **-sede**. Other words in this spelling family use different endings: *precede, recede, concede,* and *intercede* use **-cede**, while *proceed, exceed,* and *succeed* use **-ceed**.\n\n**Memory aid:** *Supersede* uses **-sede**.' },
  ],
  'cler-0046': [
    { type: 'correct_answer', text: 'C — *achieve*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correctly spelled word is **achieve**, with **-ie**. Compare it with words such as *believe, friend, field,* and *piece*, while words such as *receive, deceive, conceive, perceive,* and *ceiling* use **-ei** after **c**.\n\nThe familiar “i before e” rule has exceptions, so the spelling of the individual word still needs to be checked.' },
  ],
  'cler-0047': [
    { type: 'correct_answer', text: 'B — *afidavit*' },
    { type: 'paragraph', label: 'Rationale', text: 'The misspelled word is **afidavit**. The correct spelling is **affidavit**, with **double f**.\n\n**Memory aid:** *Affidavit* has **double f**.' },
  ],
  'cler-0048': [
    { type: 'correct_answer', text: 'D — *inoculate*' },
    { type: 'paragraph', label: 'Rationale', text: 'The correct spelling is **inoculate**, with **one n** and **one c**.\n\n**Memory aid:** Think **i-NOC-u-late**: one **n**, one **c**.' },
  ],
} as const satisfies Record<ApprovedId, readonly Record<string, unknown>[]>;

const EXPECTED_QUESTION_CONTENT: Record<ApprovedId, { question: string; choices: string[]; correctOptionId: string }> = {
  'cler-0055': {
    question: 'Which of the following words, commonly used in personnel management and government offices, is spelled CORRECTLY?',
    choices: ['Personel', 'Personell', 'Personnel', 'Pursonnel', 'Personnell'],
    correctOptionId: 'C',
  },
  'cler-0012': {
    question: 'Which of the following words is CORRECTLY spelled?',
    choices: ['accomodate', 'acommodate', 'acomodate', 'accommodate', 'accommadate'],
    correctOptionId: 'D',
  },
  'cler-0013': {
    question: 'Which word is MISSPELLED?',
    choices: ['occurrence', 'recommend', 'necessary', 'conscientious', 'seperate'],
    correctOptionId: 'E',
  },
  'cler-0014': {
    question: 'Choose the CORRECTLY spelled word.',
    choices: ['embarass', 'embarras', 'embaras', 'embarrass', 'embarrased'],
    correctOptionId: 'D',
  },
  'cler-0015': {
    question: 'Which of the following words is MISSPELLED?',
    choices: ['commitment', 'beginning', 'occurrence', 'priviledge', 'perseverance'],
    correctOptionId: 'D',
  },
  'cler-0016': {
    question: 'Select the CORRECTLY spelled word.',
    choices: ['maintenance', 'maintainance', 'maintenence', 'maintainence', 'maintennance'],
    correctOptionId: 'A',
  },
  'cler-0017': {
    question: 'Which word is spelled INCORRECTLY?',
    choices: ['liaison', 'conscientous', 'conscientious', 'judgement', 'occurrence'],
    correctOptionId: 'B',
  },
  'cler-0018': {
    question: 'Choose the word that is CORRECTLY spelled.',
    choices: ['perseverence', 'perserverance', 'perserverence', 'persevrence', 'perseverance'],
    correctOptionId: 'E',
  },
  'cler-0019': {
    question: 'Which of the following words is MISSPELLED?',
    choices: ['supersede', 'proceed', 'precede', 'intercede', 'supercede'],
    correctOptionId: 'E',
  },
  'cler-0046': {
    question: 'Which of the following words is spelled CORRECTLY?',
    choices: ['recieve', 'beleive', 'achieve', 'freind', 'acheive'],
    correctOptionId: 'C',
  },
  'cler-0047': {
    question: 'Which of the following words, commonly used in government correspondence, is spelled INCORRECTLY?',
    choices: ['subpoena', 'afidavit', 'memorandum', 'acknowledgment', 'questionnaire'],
    correctOptionId: 'B',
  },
  'cler-0048': {
    question: 'Which of the following words is spelled CORRECTLY?',
    choices: ['inocculate', 'innoculate', 'innocculate', 'inoculate', 'inoculatte'],
    correctOptionId: 'D',
  },
};

describe('Canonical Spelling structured explanations', () => {
  it('contains exactly the approved structured content, preserves question data, and removes only approved legacy fields', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const spellingQuestions = [...catalog.questions.values()].filter((question) => question.topic === 'Spelling');
    const structuredIds = spellingQuestions
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id)
      .sort();

    expect(structuredIds).toEqual([...APPROVED_IDS].sort());

    for (const id of APPROVED_IDS) {
      const question = catalog.questions.get(id)!;
      const expectedContent = EXPECTED_QUESTION_CONTENT[id];
      expect(question.question).toBe(expectedContent.question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expectedContent.choices);
      expect(question.correctOptionId).toBe(expectedContent.correctOptionId);
      expect(question.explanation).toBeUndefined();
      expect(question.steps).toBeUndefined();
      expect(question.tip).toBeUndefined();
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.taskInstance).toBeTruthy();

      expect(question.structuredExplanation?.blocks).toEqual(EXPECTED_BLOCKS[id]);
      expect(question.structuredExplanation?.blocks).toHaveLength(2);
      expect(question.structuredExplanation?.blocks[0]?.type).toBe('correct_answer');
      expect(question.structuredExplanation?.blocks[1]).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(JSON.stringify(question.structuredExplanation)).not.toMatch(/distractor|Option [A-E]|Latin|etymolog|Other Choices/i);
    }
  });

  it('admits every approved record through the same structural bar the renderer applies', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);

    for (const id of APPROVED_IDS) {
      const question = catalog.questions.get(id);
      // Presence alone proves admission — the loader drops whatever
      // isValidQuestion rejects — but assert the gate directly so a regression
      // names the cause instead of surfacing as a missing question.
      expect(question, id).toBeTruthy();
      expect(isValidQuestion(question), id).toBe(true);
      expect(isValidStructuredExplanation(question!.structuredExplanation), id).toBe(true);
    }
  });

  it('rejects a malformed clone of an approved record, so an empty explanation can never reach a learner', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const approved = catalog.questions.get('cler-0012')!;

    expect(approved.explanation).toBeUndefined();
    expect(isValidQuestion(approved)).toBe(true);
    expect(isValidQuestion({ ...approved, structuredExplanation: { blocks: [] } })).toBe(false);
    expect(isValidQuestion({
      ...approved,
      structuredExplanation: { blocks: [{ type: 'unsupported', text: 'accommodate' }] },
    })).toBe(false);
    expect(isValidQuestion({
      ...approved,
      structuredExplanation: { blocks: [{ type: 'paragraph', label: 'Correct Spelling', text: '' }] },
    })).toBe(false);
  });
});
