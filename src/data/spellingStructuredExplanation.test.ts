import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';

const APPROVED_IDS = ['cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015'] as const;

type ApprovedId = (typeof APPROVED_IDS)[number];

const EXPECTED_BLOCKS = {
  'cler-0055': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'C — Personnel' },
    { type: 'paragraph', label: 'Correct Spelling', text: 'Personnel' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct spelling has a double n and a single l.' },
    { type: 'rule', text: 'Personnel means employees or staff. Personal means individual or private.' },
  ],
  'cler-0012': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — accommodate' },
    { type: 'paragraph', label: 'Correct Spelling', text: 'accommodate' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word has double c and double m.' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Accommodate has 2 Cs and 2 Ms.' },
  ],
  'cler-0013': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — seperate' },
    { type: 'paragraph', label: 'Correct Spelling', text: 'separate' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct spelling uses a, not e, in the middle: separate.' },
    { type: 'paragraph', label: 'Memory Aid', text: 'There is a RAT in separate: sepa-RAT-e.' },
  ],
  'cler-0014': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — embarrass' },
    { type: 'paragraph', label: 'Correct Spelling', text: 'embarrass' },
    { type: 'paragraph', label: 'What to Notice', text: 'The word has double r and double s.' },
  ],
  'cler-0015': [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'D — priviledge' },
    { type: 'paragraph', label: 'Correct Spelling', text: 'privilege' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correct ending is -lege, not -ledge.' },
    { type: 'paragraph', label: 'Memory Aid', text: 'Privi-LEGE.' },
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
};

describe('Spelling structured explanation pilot', () => {
  it('contains exactly the approved structured content and preserves question data and legacy fields', async () => {
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
      expect(question.explanation.length).toBeGreaterThanOrEqual(100);
      expect(question.tip).toBeTruthy();
      expect(question.distractorExplanations).toBeTruthy();
      expect(question.taskInstance).toBeTruthy();
      expect(question.structuredExplanation?.blocks).toEqual(EXPECTED_BLOCKS[id]);
      expect(JSON.stringify(question.structuredExplanation)).not.toMatch(/distractor|Option [A-E]|Latin|etymolog/i);
    }
  });
});
