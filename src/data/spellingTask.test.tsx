// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import { loadContentCatalog } from '@/data/questionBank';
import { getSharedTaskDefinition } from '@/data/taxonomy';
import { buildSimulationSession, buildSpellingPracticeSession } from '@/lib/examEngine';
import { QuestionRenderer } from '@/components/exam/booklet/QuestionRenderer';
import { SpellingInstanceRenderer } from '@/components/exam/SpellingInstanceRenderer';

afterEach(() => cleanup());

const spellingIds = [
  'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015', 'cler-0016', 'cler-0017', 'cler-0018',
  'cler-0019', 'cler-0034', 'seed-cler-002', 'cler-0046', 'cler-0047', 'cler-0048', 'cler-0055',
];

const subjects = ['Clerical Ability'] as const;

describe('Spelling task architecture', () => {
  it('defines neutral shared directions, an original example, controlled variants, and no product language', () => {
    const definition = getSharedTaskDefinition('spelling_default');
    expect(definition?.title).toBe('Spelling');
    expect(definition?.directions).toMatch(/correctly spelled|misspelled word/i);
    expect(definition?.supports).toEqual(expect.arrayContaining(['correctly_spelled_word', 'misspelled_word']));
    expect(definition?.answerStructure).toBe('word_selection');
    expect(definition?.noErrorOptional).toBe(true);
    expect(definition?.examples).toHaveLength(1);
    expect(JSON.stringify(definition)).not.toMatch(/AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|training rules|authored task/i);
  });

  it('builds one canonical Spelling practice block with all 14 existing IDs', async () => {
    const session = await buildSpellingPracticeSession('Subprofessional');
    expect(session.questionIds).toHaveLength(14);
    expect(new Set(session.questionIds).size).toBe(14);
    expect(session.config.taskFormat).toBe('shared_spelling_task');
    expect(session.items).toEqual([
      expect.objectContaining({ kind: 'pool', poolId: 'clerical-spelling', taskFormat: 'shared_spelling_task', questionIds: session.questionIds }),
    ]);
    expect(new Set(session.questionIds)).toEqual(new Set(spellingIds));
  });

  it('keeps all authored words, variants, answer keys, and compact metadata intact', async () => {
    const catalog = await loadContentCatalog(subjects);
    const spelling = catalog.getQuestionsForSubject('Clerical Ability', 'Subprofessional').filter((question) => question.topic === 'Spelling');
    expect(spelling).toHaveLength(14);
    expect(spelling.filter((question) => question.taskInstance?.payload?.instanceFormat === 'compact')).toHaveLength(14);
    expect(spelling.filter((question) => question.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt')).toHaveLength(0);
    expect(new Set(spelling.map((question) => question.id))).toEqual(new Set(spellingIds));
    for (const question of spelling) {
      expect(question.taskInstance?.kind).toBe('spelling');
      expect(question.taskInstance?.payload?.taskDefinitionId).toBe('spelling_default');
      expect(question.taskInstance?.payload?.words).toEqual(question.choices.map((choice) => choice.text));
      expect(question.taskInstance?.payload?.noErrorVariant).toBe(false);
      expect(question.choices.some((choice) => choice.text === 'No Error')).toBe(false);
      expect(question.choices.some((choice) => choice.id === question.correctOptionId)).toBe(true);
      const prompt = question.taskInstance?.payload?.itemPrompt;
      if (question.questionType === 'misspelled_word') expect(prompt).toBe('Choose the misspelled word.');
      else expect(prompt).toBe('Choose the correctly spelled word.');
    }
    const repaired = catalog.getQuestion('cler-0014');
    expect(repaired?.choices.map((choice) => choice.text)).toEqual(['embarass', 'embarras', 'embaras', 'embarrass', 'embarrased']);
    expect(repaired?.correctOptionId).toBe('D');
    expect(repaired?.structuredExplanation?.blocks).toEqual(expect.arrayContaining([
      { type: 'correct_answer', text: 'D — *embarrass*' },
      { type: 'paragraph', label: 'Correct Spelling', text: '*embarrass*' },
    ]));
    const accommodate = catalog.getQuestion('cler-0012');
    expect(accommodate?.choices.map((choice) => choice.text)).toEqual(['accomodate', 'acommodate', 'acomodate', 'accommodate', 'accommadate']);
    expect(accommodate?.correctOptionId).toBe('D');
    expect(accommodate?.structuredExplanation?.blocks).toEqual(expect.arrayContaining([
      { type: 'correct_answer', text: 'D — *accommodate*' },
      { type: 'paragraph', label: 'Correct Spelling', text: '*accommodate*' },
      { type: 'paragraph', label: 'Memory Aid', text: 'Accommodate has **double c** and **double m**.' },
    ]));

    expect(JSON.stringify(spelling)).not.toMatch(/AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|training rules|authored task/i);
  });

  it('renders a compact item prompt without repeating the original long stem', () => {
    const question: Question = {
      id: 'spelling-test',
      examLevel: 'Subprofessional',
      subject: 'Clerical Ability',
      topic: 'Spelling',
      questionType: 'misspelled_word',
      questionFormat: 'misspelled_word',
      taskFormat: 'shared_spelling_task',
      difficulty: 'Easy',
      question: 'Which of the following words, commonly used in office correspondence, is spelled INCORRECTLY?',
      taskInstance: {
        kind: 'spelling',
        payload: {
          taskDefinitionId: 'spelling_default',
          instanceFormat: 'compact',
          words: ['receive', 'separate', 'accomodate', 'rhythm', 'No Error'],
          itemPrompt: 'Choose the misspelled word.',
          answerStructure: 'word_selection',
          noErrorVariant: true,
        },
      },
      choices: [
        { id: 'A', text: 'receive' },
        { id: 'B', text: 'separate' },
        { id: 'C', text: 'accomodate' },
        { id: 'D', text: 'rhythm' },
        { id: 'E', text: 'No Error' },
      ],
      correctOptionId: 'C',
      explanation: 'C is misspelled.',
      tags: ['spelling'],
    };
    const { container } = render(<SpellingInstanceRenderer question={question} />);
    expect(screen.getByText('Choose the misspelled word.')).toBeInTheDocument();
    expect(screen.queryByText('Which of the following words, commonly used in office correspondence, is spelled INCORRECTLY?')).not.toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('rounded-lg');
    expect(container.firstChild).not.toHaveClass('bg-emerald-50/50');
  });

  it('supports an authored No Error option with E as the correct answer', () => {
    const question: Question = {
      id: 'spelling-no-error-test',
      examLevel: 'Subprofessional',
      subject: 'Clerical Ability',
      topic: 'Spelling',
      questionType: 'correctly_spelled_word',
      questionFormat: 'correctly_spelled_word',
      taskFormat: 'shared_spelling_task',
      difficulty: 'Easy',
      question: 'Select the correctly spelled word.',
      taskInstance: {
        kind: 'spelling',
        payload: {
          taskDefinitionId: 'spelling_default',
          instanceFormat: 'compact',
          words: ['receive', 'separate', 'rhythm', 'liaison', 'No Error'],
          itemPrompt: 'Choose the correctly spelled word.',
          answerStructure: 'word_selection',
          noErrorVariant: true,
        },
      },
      choices: [
        { id: 'A', text: 'receive' },
        { id: 'B', text: 'separate' },
        { id: 'C', text: 'rhythm' },
        { id: 'D', text: 'liaison' },
        { id: 'E', text: 'No Error' },
      ],
      correctOptionId: 'E',
      explanation: 'All four words are correctly spelled, so E is correct.',
      tags: ['spelling'],
    };
    render(
      <QuestionRenderer
        question={question}
        questionNumber={1}
        selectedOptionId={null}
        onSelectOption={() => undefined}
      />
    );
    expect(screen.getByText('Choose the correctly spelled word.')).toBeInTheDocument();
    expect(screen.getByText('No Error')).toBeInTheDocument();
  });

  it('keeps canonical Spelling selections contiguous and excludes historical groups in simulations', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability', 'Numerical Reasoning', 'Verbal Ability', 'General Information']);
    for (const seed of ['spelling-runtime-01', 'spelling-runtime-02', 'spelling-runtime-03', 'spelling-runtime-04', 'spelling-runtime-05']) {
      const session = await buildSimulationSession('Subprofessional', 145, { seed, catalog });
      const blocks = (session.items ?? []).filter((item) => item.kind === 'pool' && item.poolId === 'clerical-spelling');
      expect(blocks.length).toBeLessThanOrEqual(1);
      for (const block of blocks) {
        if (block.kind !== 'pool') continue;
        expect(block.taskFormat).toBe('shared_spelling_task');
        expect(block.questionIds.length).toBeGreaterThan(0);
        expect(block.questionIds.every((id) => catalog.getClassification(id)?.topic === 'Spelling')).toBe(true);
        const positions = block.questionIds.map((id) => session.questionIds.indexOf(id)).sort((a, b) => a - b);
        expect(positions.every((position, index) => position === positions[0] + index)).toBe(true);
      }
      expect((session.items ?? []).filter((item) => item.kind === 'group' && item.groupId.startsWith('grp-spelling-'))).toHaveLength(0);
      expect(new Set(session.questionIds).size).toBe(session.questionIds.length);
    }
  });
});
