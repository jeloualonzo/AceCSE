import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';

const APPROVED_IDS = [
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
] as const;

type ApprovedId = (typeof APPROVED_IDS)[number];

const EXPECTED_BLOCKS = {
  'cler-0055': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — *Personnel*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*Personnel*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct spelling has **double n** and a **single l**.' },
    { type: 'rule', text: '*Personnel* means employees or staff, while *personal* means individual or private.' },
  ],
  'cler-0012': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *accommodate*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*accommodate*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word has **double c** and **double m**.' },
    { type: 'paragraph', label: 'Double c', text: '*access*, *accident*, *occur*, *occasion*, *occurrence*' },
    { type: 'paragraph', label: 'Double m', text: '*common*, *committee*, *immediate*, *recommend*, *commitment*' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Accommodate has **double c** and **double m**.' },
  ],
  'cler-0013': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — *seperate*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*separate*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct spelling uses **a**, not **e**, after p:\n\n*sep-a-rate*' },
    { type: 'paragraph', label: 'Memory Aid', text: 'There is a **RAT** in sepa-**RAT**-e.' },
  ],
  'cler-0014': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *embarrass*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*embarrass*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word has **double r** and **double s**.' },
  ],
  'cler-0015': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *priviledge*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*privilege*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct ending is **~lege**, not **~ledge**.' },
    { type: 'paragraph', label: '~lege', text: '*privilege*, *college*, *sacrilege*, *allege*' },
    { type: 'paragraph', label: '~ledge', text: '*knowledge*, *acknowledge*, *ledge*, *pledge*, *sledge*' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Privi-**LEGE**.' },
  ],
  'cler-0016': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'A — *maintenance*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*maintenance*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The middle of the word is **~ten~**, not **~tain~**, and the ending is **~ance**, not **~ence**.' },
    { type: 'paragraph', label: '~ance', text: '*maintenance*, *attendance*, *assistance*, *importance*, *resistance*' },
    { type: 'paragraph', label: '~ence', text: '*difference*, *reference*, *existence*, *dependence*, *confidence*' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Think *MAIN-ten-ance*, not *MAIN-tain-ance*.' },
  ],
  'cler-0017': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — *conscientous*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*conscientious*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct ending contains **~ious**, not **~ous**.' },
    { type: 'paragraph', label: '~ious', text: '*conscientious*, *curious*, *serious*, *delicious*, *gracious*' },
    { type: 'paragraph', label: '~ous', text: '*famous*, *nervous*, *dangerous*, *generous*, *enormous*' },
    { type: 'paragraph', label: 'Memory Aid', text: '*Conscientious* contains **~ious**.' },
  ],
  'cler-0018': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — *perseverance*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*perseverance*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word keeps the root **persever-** and ends in **~ance**.' },
    { type: 'paragraph', label: '~ance', text: '*perseverance*, *appearance*, *endurance*, *attendance*, *resistance*' },
    { type: 'paragraph', label: '~ence', text: '*difference*, *reference*, *existence*, *dependence*, *confidence*' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Connect *perseverance* with *persevere*: **persever-** + **~ance**.' },
  ],
  'cler-0019': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — *supercede*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*supersede*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct word ends in **~sede**. Other words in this spelling family use **~cede** or **~ceed**.' },
    { type: 'paragraph', label: '~sede', text: '*supersede*' },
    { type: 'paragraph', label: '~cede', text: '*precede*, *recede*, *concede*, *intercede*, *accede*' },
    { type: 'paragraph', label: '~ceed', text: '*proceed*, *exceed*, *succeed*' },
    { type: 'paragraph', label: 'Memory Aid', text: '*Supersede* uses **~sede**.' },
  ],
  'cler-0046': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — *achieve*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*achieve*' },
    { type: 'paragraph', label: 'What to Notice', text: '*Achieve* uses **~ie**, while many words use **~ei after c**.' },
    { type: 'paragraph', label: '~ie', text: '*believe*, *achieve*, *friend*, *field*, *piece*' },
    { type: 'paragraph', label: '~ei after c', text: '*receive*, *deceive*, *conceive*, *perceive*, *ceiling*' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Check the actual spelling rather than relying on the **“i before e”** rule alone.' },
  ],
  'cler-0047': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'B — *afidavit*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*affidavit*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word has **double f**.' },
    { type: 'paragraph', label: 'Double f', text: '*affidavit*, *afford*, *effort*, *difficult*, *official*' },
    { type: 'paragraph', label: 'Memory Aid', text: '*Affidavit* has **double f**.' },
  ],
  'cler-0048': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — *inoculate*' },
    { type: 'paragraph', label: 'Correct Spelling', text: '*inoculate*' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word has **one n** and **one c**.' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Think *i-NOC-u-late*: one **n**, one **c**.' },
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
      expect(JSON.stringify(question.structuredExplanation)).not.toMatch(/distractor|Option [A-E]|Latin|etymolog|Other Choices|corrected alternative/i);
    }
  });
});
