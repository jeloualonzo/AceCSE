import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';

const pilotIds = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'] as const;
const subjects = ['Verbal Ability'] as const;

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

describe('Grammar pilot content corrections', () => {
  it('preserves exactly four pilot IDs, five-choice structures, classifications, and no migration metadata', async () => {
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
      expect(classification?.taskFormat).toBe('standard_multiple_choice');
      expect(question?.taskInstance).toBeUndefined();
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
