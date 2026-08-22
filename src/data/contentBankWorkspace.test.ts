import { describe, expect, it } from 'vitest';
import { createNormalizedCatalog } from './contentCatalog';
import {
  buildSubjectDashboardSummary,
  buildSubjectWorkspaceData,
  createRawBatchJson,
  createReviewMarkdown,
  createWorkspaceRefinementBatch,
  getNextRemainingQuestionIds,
  getBatchQuestions,
  slugForSubject,
  subjectFromSlug,
  validateWorkspaceBatch,
} from './contentBankWorkspace';
import type { ClassificationRecord } from './taxonomy';
import type { Question, Subject } from '@/types';

const subjects: Subject[] = [
  'Clerical Ability',
  'Verbal Ability',
  'Numerical Reasoning',
  'Analytical Reasoning',
  'General Information',
];

function question(
  id: string,
  topic: string,
  difficulty: Question['difficulty'] = 'Medium',
  structured = false,
): Question {
  return {
    id,
    examLevel: 'Both',
    subject: 'Clerical Ability',
    topic,
    subtopic: `${topic} subtopic`,
    difficulty,
    question: `Which answer is correct for ${id}?`,
    choices: [
      { id: 'A', text: `${id} A` },
      { id: 'B', text: `${id} B` },
      { id: 'C', text: `${id} C` },
      { id: 'D', text: `${id} D` },
      { id: 'E', text: `${id} E` },
    ],
    correctOptionId: 'B',
    explanation: `Legacy explanation for ${id}.`,
    tags: ['test'],
    ...(structured ? {
      structuredExplanation: {
        blocks: [
          { type: 'heading' as const, text: 'Solution' },
          { type: 'correct_answer' as const, text: `B — ${id} B` },
          { type: 'paragraph' as const, label: 'What to Notice', text: 'Notice **bold** and *italic* authored markers.' },
          { type: 'rule' as const, text: 'Apply the rule.' },
        ],
      },
    } : {}),
  };
}

function classification(questionId: string, topic: string, taskFormat = 'legacy_task'): ClassificationRecord {
  return {
    questionId,
    subject: 'Clerical Ability',
    examLevel: 'Both',
    topic,
    subtopic: `${topic} subtopic`,
    questionType: 'test_type',
    questionFormat: 'sentence_selection',
    taskFormat,
    storageMode: 'pool',
    poolId: `${topic.toLowerCase().replaceAll(' ', '-')}-pool`,
    fixedGroupId: null,
    embeddedStimulus: false,
    sourceFile: 'test.json',
    confidence: 'high',
  };
}

function testCatalog() {
  const questions = [
    question('cler-test-001', 'Filing & Alphabetizing', 'Easy'),
    question('cler-test-002', 'Filing & Alphabetizing', 'Hard'),
    question('cler-test-003', 'Spelling', 'Medium', true),
  ];
  return createNormalizedCatalog(questions, [], questions.map((item) => classification(item.id, item.topic)));
}

const frozenBatch = {
  id: 'test-frozen',
  title: 'Test Frozen',
  family: 'Filing & Alphabetizing',
  status: 'frozen' as const,
  createdAt: '2026-08-22T10:00:00+08:00',
  questionIds: ['cler-test-001'],
};

const readyBatch = {
  id: 'test-ready',
  title: 'Test Ready',
  family: 'Filing & Alphabetizing',
  status: 'ready-for-qa' as const,
  createdAt: '2026-08-22T11:00:00+08:00',
  questionIds: ['cler-test-002'],
};

describe('Content Bank workspace data', () => {
  it('maps every active subject to a stable workspace slug and back', () => {
    expect(subjects.map(slugForSubject)).toEqual(['clerical', 'verbal', 'numerical', 'analytical', 'general-information']);
    expect(subjects.map((subject) => subjectFromSlug(slugForSubject(subject)))).toEqual(subjects);
    expect(subjectFromSlug('not-a-subject')).toBeUndefined();
  });

  it('derives frozen, Ready for QA, and remaining states without double-counting duplicate membership', () => {
    const catalog = testCatalog();
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, [
      frozenBatch,
      { ...frozenBatch, id: 'test-frozen-duplicate', createdAt: '2026-08-22T09:00:00+08:00' },
      readyBatch,
    ]);

    expect(workspace.activeQuestionCount).toBe(3);
    expect(workspace.frozenQuestionIds).toEqual(['cler-test-001']);
    expect(workspace.readyForQaQuestionIds).toEqual(['cler-test-002']);
    expect(workspace.remainingQuestionIds).toEqual(['cler-test-003']);
    expect(workspace.questions.find((item) => item.question.id === 'cler-test-001')?.batchIds).toEqual(['test-frozen', 'test-frozen-duplicate']);
    expect(workspace.families.find((family) => family.family === 'Filing & Alphabetizing')).toMatchObject({
      activeQuestionIds: ['cler-test-001', 'cler-test-002'],
      frozenQuestionIds: ['cler-test-001'],
      readyForQaQuestionIds: ['cler-test-002'],
      remainingQuestionIds: [],
      status: 'Almost Complete',
    });
    expect(getNextRemainingQuestionIds(workspace, 10)).toEqual(['cler-test-003']);
    expect(buildSubjectDashboardSummary('Clerical Ability', [frozenBatch, readyBatch], [
      classification('cler-test-001', 'Filing & Alphabetizing'),
      classification('cler-test-002', 'Filing & Alphabetizing'),
      classification('cler-test-003', 'Spelling'),
    ])).toMatchObject({
      activeQuestionCount: 3,
      frozenQuestionCount: 1,
      readyForQaQuestionCount: 1,
      remainingQuestionCount: 1,
    });
  });

  it('rejects invalid batch definitions and creates exact selected IDs without changing questions', () => {
    const known = new Set(['cler-test-001', 'cler-test-002', 'cler-test-003']);
    const existing = [frozenBatch];
    expect(validateWorkspaceBatch({ ...frozenBatch, id: '', questionIds: [] }, known, existing)).toEqual(expect.arrayContaining(['Enter a batch ID.', 'Select at least one remaining question.']));
    expect(validateWorkspaceBatch({ ...frozenBatch, id: 'new', questionIds: ['cler-test-001', 'cler-test-001'] }, known, existing)).toContain('A batch cannot contain duplicate question IDs.');
    expect(validateWorkspaceBatch({ ...frozenBatch, id: 'new', questionIds: ['cler-missing'] }, known, existing)).toContain('Question cler-missing is not in the active production catalog.');
    expect(validateWorkspaceBatch({ ...frozenBatch, questionIds: ['cler-test-002'] }, known, existing)).toContain('Batch ID test-frozen already exists.');

    const created = createWorkspaceRefinementBatch({
      id: 'test-new',
      title: 'Test New',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      questionIds: ['cler-test-002', 'cler-test-003'],
      createdAt: '2026-08-22T12:00:00+08:00',
    }, known, existing);
    expect(created.errors).toEqual([]);
    expect(created.batch).toEqual({
      id: 'test-new',
      title: 'Test New',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T12:00:00+08:00',
      questionIds: ['cler-test-002', 'cler-test-003'],
    });
  });

  it('exports review Markdown with learner and authoring views and raw JSON in batch order', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-003', 'cler-test-002'] };
    const questions = batch.questionIds.map((id) => catalog.getQuestion(id)!);
    const markdown = createReviewMarkdown(batch, questions);
    expect(markdown).toContain('# Test Ready');
    expect(markdown).toContain('- Batch ID: test-ready');
    expect(markdown).toContain('- Question count: 2');
    expect(markdown.indexOf('## 1. cler-test-003')).toBeLessThan(markdown.indexOf('## 2. cler-test-002'));
    expect(markdown).toContain('### Learner View');
    expect(markdown).toContain('### Authoring View');
    expect(markdown).toContain('**bold**');
    expect(markdown).toContain('*italic*');
    expect(markdown).toContain('| Correct option | B |');
    expect(markdown).toContain('### Choices');

    const raw = JSON.parse(createRawBatchJson(batch, questions)) as Question[];
    expect(raw.map((item) => item.id)).toEqual(['cler-test-003', 'cler-test-002']);
    expect(raw[0]).toEqual(questions[0]);
    expect(JSON.stringify(raw)).not.toContain('test-ready');
  });

  it('surfaces invalid QA registry references for fail-closed workspace handling', () => {
    const catalog = testCatalog();
    const invalid = { ...readyBatch, id: 'test-invalid', questionIds: ['cler-missing'] };
    expect(buildSubjectWorkspaceData('Clerical Ability', catalog, [invalid]).invalidBatchReferences).toEqual([{
      batchId: 'test-invalid',
      missingQuestionIds: ['cler-missing'],
    }]);
  });

  it('fails closed when an export batch references an unresolved ID', () => {
    const catalog = testCatalog();
    const invalid = { ...readyBatch, questionIds: ['cler-missing'] };
    expect(() => createReviewMarkdown(invalid, [])).toThrow('question cler-missing is not in the active production catalog');
    expect(() => createRawBatchJson(invalid, [])).toThrow('question cler-missing is not in the active production catalog');
    expect(getBatchQuestions(invalid, catalog)).toEqual([]);
  });
});
