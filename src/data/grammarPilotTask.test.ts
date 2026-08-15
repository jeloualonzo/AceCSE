// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';
import { getCanonicalPool, getSharedTaskDefinition } from '@/data/taxonomy';
import { buildGrammarPilotPracticeSession, buildSimulationSession } from '@/lib/examEngine';
import { GroupRenderer } from '@/components/exam/booklet/GroupRenderer';
import { QuestionRenderer } from '@/components/exam/booklet/QuestionRenderer';
import { SectionRenderer } from '@/components/exam/booklet/SectionRenderer';
import { normalizeIntendedNewlines } from '@/lib/text';

const pilotIds = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'] as const;
const subjects = ['Verbal Ability'] as const;
const allSubjects = [
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
  'Numerical Reasoning',
  'Verbal Ability',
] as const;
const sharedDirections = 'Choose the sentence that is grammatically correct in formal edited English.';
const expectedNotes = {
  'verb-0059': 'Treat the collective noun panel as a single unit.',
  'verb-0061': "Apply the formal-edited-English convention: use 'the reason ... is that' rather than 'the reason ... is because'.",
} as const;

const expected = {
  'verb-0059': {
    stem: 'Which of the following correctly applies formal American-English agreement when the collective noun “panel” is treated as a single unit?',
    choices: [
      'The panel of judges have announced their decision.',
      'The panel of judges has announced their decision.',
      'The panel of judges has announced its decision.',
      'The panel of judges have announced its decision.',
      'The panel of judges has announced their individual verdicts.',
    ],
    key: 'C',
  },
  'verb-0060': {
    stem: 'Which of the following is the correctly written sentence?',
    choices: [
      'Being she was late, her application was disqualified.',
      'Due to she was late, her application was disqualified.',
      'Because she arrived late, her application was disqualified.',
      'On account of she was late, her application was disqualified.',
      'Since of her late arrival, her application was disqualified.',
    ],
    key: 'C',
  },
  'verb-0061': {
    stem: 'Which of the following sentences follows formal edited English and avoids the redundancy of using “because” after “the reason ... is”?',
    choices: [
      'The reason the memorandum was delayed is because the signatory was absent.',
      'The reason the memorandum was delayed is that the signatory was absent.',
      'The reason why the memorandum was delayed is because the signatory was absent.',
      'The reason is because the signatory was absent that the memorandum was delayed.',
      'The reason for the memorandum\'s delay is because the signatory was absent.',
    ],
    key: 'B',
  },
  'verb-0062': {
    stem: 'Which of the following is the correctly written sentence?',
    choices: [
      'The commission not only reviewed the budget but also it scrutinized the disbursements.',
      'The commission not only reviewed the budget but also scrutinized the disbursements.',
      'The commission reviewed not only the budget but also scrutinized the disbursements.',
      'Not only the commission reviewed the budget but also the disbursements was scrutinized.',
      'The commission not only reviewed the budget but also scrutinizing the disbursements.',
    ],
    key: 'B',
  },
} as const;

afterEach(() => cleanup());

describe('Grammar pilot content corrections', () => {
  it('preserves exactly four pilot IDs, five-choice structures, classifications, and corrected source content', async () => {
    const catalog = await loadContentCatalog(subjects);
    const questions = pilotIds.map((id) => catalog.getQuestion(id));
    expect(questions.every(Boolean)).toBe(true);
    expect(new Set(questions.map((question) => question?.id))).toEqual(new Set(pilotIds));

    for (const id of pilotIds) {
      const question = catalog.getQuestion(id);
      const fixture = expected[id];
      expect(question).toBeDefined();
      expect(question?.question).toBe(fixture.stem);
      expect(question?.choices.map((choice) => choice.text)).toEqual(fixture.choices);
      expect(question?.choices).toHaveLength(5);
      expect(new Set(question?.choices.map((choice) => choice.text)).size).toBe(5);
      expect(question?.correctOptionId).toBe(fixture.key);
      expect(question?.choices.some((choice) => choice.id === question?.correctOptionId)).toBe(true);
      const classification = catalog.getClassification(id);
      expect(classification?.subject).toBe('Verbal Ability');
      expect(classification?.topic).toBe('Grammar & Usage');
      expect(classification?.questionType).toBe('grammar_usage');
      expect(classification?.questionFormat).toBe('grammar_usage');
      expect(classification?.taskFormat).toBe('shared_grammar_sentence_correction');
      expect(question?.taskFormat).toBe('shared_grammar_sentence_correction');
      expect(question?.taskInstance?.kind).toBe('grammar');
    }
  });

  it('makes exactly one choice satisfy each repaired criterion', async () => {
    const catalog = await loadContentCatalog(subjects);
    const questions = Object.fromEntries(pilotIds.map((id) => [id, catalog.getQuestion(id)!]));

    const formalPanelMatches = questions['verb-0059'].choices.filter((choice) =>
      choice.text.includes('has announced its decision.')
    );
    const causalClauseMatches = questions['verb-0060'].choices.filter((choice) =>
      choice.text === 'Because she arrived late, her application was disqualified.'
    );
    const formalReasonMatches = questions['verb-0061'].choices.filter((choice) =>
      choice.text.includes('is that the signatory was absent.')
    );
    const strictParallelMatches = questions['verb-0062'].choices.filter((choice) =>
      choice.text.includes('not only reviewed the budget but also scrutinized the disbursements.')
    );

    expect(formalPanelMatches.map((choice) => choice.id)).toEqual(['C']);
    expect(causalClauseMatches.map((choice) => choice.id)).toEqual(['C']);
    expect(formalReasonMatches.map((choice) => choice.id)).toEqual(['B']);
    expect(strictParallelMatches.map((choice) => choice.id)).toEqual(['B']);
  });

  it('keeps explanations aligned with the repaired criteria and rejects the old ambiguity claims', async () => {
    const catalog = await loadContentCatalog(subjects);
    const panel = catalog.getQuestion('verb-0059');
    const causal = catalog.getQuestion('verb-0060');
    const reason = catalog.getQuestion('verb-0061');
    const parallel = catalog.getQuestion('verb-0062');

    expect(panel?.explanation).toMatch(/formal American-English.*one unit/i);
    expect(panel?.explanation).toMatch(/individual verdicts.*conflicts/i);
    expect(causal?.explanation).toMatch(/only grammatically correct causal construction/i);
    expect(causal?.explanation).toMatch(/“since” with “of”/i);
    expect(reason?.explanation).toMatch(/formal-editing convention/i);
    expect(reason?.explanation).toMatch(/not.*every contemporary use/i);
    expect(parallel?.explanation).toMatch(/strict parallelism convention/i);
    expect(parallel?.explanation).toMatch(/scrutinizing.*does not parallel/i);
    expect(JSON.stringify([panel, causal, reason, parallel])).not.toMatch(/AI drafting residue|generated question|authored task/i);
  });
});

describe('Grammar pilot compact task architecture', () => {
  it('defines one concise formal-edited-English task contract and keeps the pilot in the canonical verbal pool', () => {
    const definition = getSharedTaskDefinition('grammar_sentence_correction_pilot');
    expect(definition?.taskFormat).toBe('shared_grammar_sentence_correction');
    expect(definition?.title).toBe('Grammar & Usage — Sentence Correction');
    expect(definition?.directions).toBe(sharedDirections);
    expect(definition?.answerStructure).toBe('sentence_selection');
    expect(definition?.register).toBe('formal_edited_english');
    expect(getCanonicalPool('verbal-grammar-usage')?.entries.filter((entry) => entry.taskFormat === 'shared_grammar_sentence_correction').map((entry) => entry.questionId)).toEqual([...pilotIds]);
    expect(JSON.stringify(definition)).not.toMatch(/AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|authored task/i);
  });

  it('creates one four-item canonical Grammar block for both exam levels', async () => {
    for (const level of ['Professional', 'Subprofessional'] as const) {
      const session = await buildGrammarPilotPracticeSession(level);
      expect(session.questionIds).toEqual([...pilotIds]);
      expect(session.config.taskFormat).toBe('shared_grammar_sentence_correction');
      expect(session.items).toEqual([
        expect.objectContaining({
          kind: 'pool',
          poolId: 'verbal-grammar-usage',
          questionType: 'grammar_usage',
          taskFormat: 'shared_grammar_sentence_correction',
          questionIds: [...pilotIds],
        }),
      ]);
    }
  });

  it('renders shared directions once in normal document flow and does not create an emerald card', async () => {
    const catalog = await loadContentCatalog(subjects);
    const questionIndex = new Map(pilotIds.map((id) => [id, catalog.getQuestion(id)!]));
    const questionNumbers = new Map(pilotIds.map((id, index) => [id, index + 1]));
    const definition = getSharedTaskDefinition('grammar_sentence_correction_pilot')!;

    const { container } = render(createElement(GroupRenderer, {
      group: undefined,
      sharedContext: { title: String(definition.title), directions: String(definition.directions) },
      plainFlow: true,
      questionIds: [...pilotIds],
      questionIndex,
      questionNumbers,
      answers: {},
      onSelectOption: () => undefined,
    }));

    expect(screen.getAllByText(sharedDirections)).toHaveLength(1);
    expect(container.querySelector('[class*="border-b"]')).not.toBeNull();
    expect(container.querySelector('[class*="bg-emerald"]')).toBeNull();
  });

  it('shows only the required item qualifiers and suppresses every repeated source stem', async () => {
    const catalog = await loadContentCatalog(subjects);
    for (const id of pilotIds) {
      const question = catalog.getQuestion(id)!;
      render(createElement(QuestionRenderer, {
        question,
        questionNumber: 1,
        selectedOptionId: null,
        onSelectOption: () => undefined,
      }));
      expect(screen.queryByText(expected[id].stem)).not.toBeInTheDocument();
      if (id in expectedNotes) {
        expect(screen.getByText(expectedNotes[id as keyof typeof expectedNotes])).toBeInTheDocument();
      } else {
        expect(screen.queryByText(/Treat the collective noun|Apply the formal-edited-English convention/)).not.toBeInTheDocument();
      }
      cleanup();
    }
  });

  it('uses neutral item containers, keeps explanations local in Practice, and hides them in Simulation', async () => {
    const catalog = await loadContentCatalog(subjects);
    const questionIndex = new Map(pilotIds.map((id) => [id, catalog.getQuestion(id)!]));
    const questionNumbers = new Map(pilotIds.map((id, index) => [id, index + 1]));
    const renderTask = (practiceMode: boolean, answers: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'> = {}) => render(createElement(GroupRenderer, {
      group: undefined,
      sharedContext: { title: 'Grammar & Usage — Sentence Correction', directions: sharedDirections },
      plainFlow: true,
      questionIds: [...pilotIds],
      questionIndex,
      questionNumbers,
      answers,
      practiceMode,
      onSelectOption: () => undefined,
    }));

    const practice = renderTask(true, { 'verb-0059': 'C' });
    expect(practice.container.querySelectorAll('section[data-question-id]')).toHaveLength(4);
    expect([...practice.container.querySelectorAll('section[data-question-id]')].every((item) => item.className.includes('rounded-xl'))).toBe(true);
    expect([...practice.container.querySelectorAll('section[data-question-id]')].some((item) => item.className.includes('bg-emerald'))).toBe(false);
    expect(screen.getAllByText(sharedDirections)).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Show Explanation' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Show Explanation' }));
    expect(practice.container.querySelector('#question-verb-0059')?.textContent).toMatch(/formal American-English.*one unit/i);

    practice.unmount();
    const simulation = renderTask(false, { 'verb-0059': 'C' });
    expect(simulation.container.querySelectorAll('section[data-question-id]')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Show Explanation' })).not.toBeInTheDocument();
  });

  it('decodes only declared shared-example escapes and preserves ordinary literal backslashes', () => {
    const literal = String.raw`A. first\nB. second`;
    expect(normalizeIntendedNewlines(literal)).toBe(literal);
    expect(normalizeIntendedNewlines(literal, 'decode-escaped-newlines')).toBe('A. first\nB. second');
    expect(normalizeIntendedNewlines(String.raw`regex \d+`, 'decode-escaped-newlines')).toBe(String.raw`regex \d+`);
  });

  it('renders the canonical Spelling shared example with real line breaks and no literal escape artifact', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const spellingIds = (getCanonicalPool('clerical-spelling')?.entries ?? []).slice(0, 2).map((entry) => entry.questionId);
    const section = {
      sectionId: 'Clerical Ability',
      nodes: [{
        kind: 'pool' as const,
        poolId: 'clerical-spelling',
        questionType: 'spelling',
        taskFormat: 'shared_spelling_task',
        questionIds: spellingIds,
      }],
    };
    const { container } = render(createElement(SectionRenderer, {
      section,
      getGroup: catalog.getGroup,
      questionIndex: catalog.questions,
      questionNumbers: new Map(spellingIds.map((id, index) => [id, index + 1])),
      answers: {},
      onSelectOption: () => undefined,
    }));
    const text = container.textContent ?? '';
    expect(text).toContain('A. receive\nB. separate');
    expect(text).not.toContain('A. receive\\nB. separate');
  });

  it('keeps pilot blocks contiguous in seeded simulations and leaves all other Grammar items legacy', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    let seenPilotBlock = false;
    for (const level of ['Professional', 'Subprofessional'] as const) {
      for (const seed of ['grammar-pilot-runtime-01', 'grammar-pilot-runtime-02', 'grammar-pilot-runtime-03', 'grammar-pilot-runtime-04', 'grammar-pilot-runtime-05', 'grammar-pilot-runtime-06']) {
        const session = await buildSimulationSession(level, level === 'Professional' ? 150 : 145, { seed, catalog });
        const blocks = (session.items ?? []).filter((item) => item.kind === 'pool' && item.poolId === 'verbal-grammar-usage' && item.taskFormat === 'shared_grammar_sentence_correction');
        expect(blocks.length).toBeLessThanOrEqual(1);
        for (const block of blocks) {
          if (block.kind !== 'pool') continue;
          seenPilotBlock = true;
          expect(block.questionIds.every((id) => pilotIds.includes(id as typeof pilotIds[number]))).toBe(true);
          expect(block.questionIds.every((id) => catalog.getQuestion(id)?.taskInstance?.payload?.instanceFormat === 'compact')).toBe(true);
          const positions = block.questionIds.map((id) => session.questionIds.indexOf(id)).sort((a, b) => a - b);
          expect(positions.every((position, index) => position === positions[0] + index)).toBe(true);
        }
        expect((session.items ?? []).filter((item) => item.kind === 'group' && item.questionIds.some((id) => pilotIds.includes(id as typeof pilotIds[number])))).toHaveLength(0);
        expect(new Set(session.questionIds).size).toBe(session.questionIds.length);
      }
    }
    expect(seenPilotBlock).toBe(true);

    for (const question of catalog.getQuestionsForSubject('Verbal Ability').filter((item) => item.topic === 'Grammar & Usage' && !pilotIds.includes(item.id as typeof pilotIds[number]))) {
      expect(catalog.getClassification(question.id)?.taskFormat).toBe('standard_multiple_choice');
      expect(question.taskInstance).toBeUndefined();
    }
  });
});
