import { describe, expect, it } from 'vitest';
import { createNormalizedCatalog } from './contentCatalog';
import {
  buildSubjectDashboardSummary,
  buildSubjectWorkspaceData,
  createRawBatchJson,
  createRawJsonExport,
  createReviewExport,
  createReviewMarkdown,
  createWorkspaceRefinementBatch,
  getNextRemainingQuestionIds,
  getBatchQuestions,
  orderQuestionSelection,
  REVIEW_MARKDOWN_FORMAT,
  slugForSubject,
  subjectFromSlug,
  validateWorkspaceBatch,
  workspaceStateLabel,
} from './contentBankWorkspace';
import { exportDocumentIntegrityErrors } from '@/lib/exportText';
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

/** A batch that has been claimed but not yet written — the pre-QA half. */
const draftBatch = {
  id: 'test-draft',
  title: 'Test Draft',
  family: 'Spelling',
  status: 'needs-content' as const,
  createdAt: '2026-08-22T12:00:00+08:00',
  questionIds: ['cler-test-003'],
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

  it('resolves a selection into listed order, so a batch is a function of what was picked and not of click order', () => {
    const catalog = testCatalog();
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, []);
    const listed = workspace.questions.map((item) => item.question.id);

    // Whatever order the boxes were ticked in, the batch comes out the same:
    // `questionIds` order drives the review export and the exact-ID Practice run,
    // so it must not depend on the admin's mouse path.
    expect(orderQuestionSelection(workspace.questions, listed)).toEqual(listed);
    expect(orderQuestionSelection(workspace.questions, [...listed].reverse())).toEqual(listed);
    expect(orderQuestionSelection(workspace.questions, new Set(['cler-test-003', 'cler-test-001']))).toEqual([
      'cler-test-001',
      'cler-test-003',
    ]);
    // A selection that outlived the family it was made in is dropped, not appended.
    expect(orderQuestionSelection(workspace.questions, ['cler-missing', 'cler-test-002'])).toEqual(['cler-test-002']);
    expect(orderQuestionSelection(workspace.questions, [])).toEqual([]);
  });

  it('treats a pre-QA batch as In Progress rather than Ready for QA, and stops re-offering its questions', () => {
    const catalog = testCatalog();
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, [frozenBatch, readyBatch, draftBatch]);

    // The point of the new state: a needs-content batch must not claim to have
    // reached QA merely by existing.
    expect(workspace.inProgressQuestionIds).toEqual(['cler-test-003']);
    expect(workspace.readyForQaQuestionIds).toEqual(['cler-test-002']);
    expect(workspace.remainingQuestionIds).toEqual([]);
    expect(workspace.questions.find((item) => item.question.id === 'cler-test-003')?.state).toBe('in-progress');
    expect(workspaceStateLabel('in-progress')).toBe('In Progress');
    // A claimed question is never offered up for a second batch.
    expect(getNextRemainingQuestionIds(workspace, 10)).toEqual([]);

    // `builder` is the same claim one step later, so it reads the same way.
    const inBuilder = buildSubjectWorkspaceData('Clerical Ability', catalog, [{ ...draftBatch, status: 'builder' }]);
    expect(inBuilder.inProgressQuestionIds).toEqual(['cler-test-003']);
    expect(inBuilder.readyForQaQuestionIds).toEqual([]);
    expect(inBuilder.remainingQuestionIds).toEqual(['cler-test-001', 'cler-test-002']);
  });

  it('reports the furthest state an overlapping question reached, counting it exactly once', () => {
    const catalog = testCatalog();
    const overlapping = [
      { ...draftBatch, id: 'draft-overlap', questionIds: ['cler-test-001', 'cler-test-002', 'cler-test-003'] },
      readyBatch, // cler-test-002 has also reached QA
      frozenBatch, // cler-test-001 is already frozen
    ];
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, overlapping);

    expect(workspace.frozenQuestionIds).toEqual(['cler-test-001']);
    expect(workspace.readyForQaQuestionIds).toEqual(['cler-test-002']);
    expect(workspace.inProgressQuestionIds).toEqual(['cler-test-003']);
    const counted = [
      ...workspace.frozenQuestionIds,
      ...workspace.readyForQaQuestionIds,
      ...workspace.inProgressQuestionIds,
      ...workspace.remainingQuestionIds,
    ];
    expect(counted).toHaveLength(workspace.activeQuestionCount);
    expect(new Set(counted).size).toBe(counted.length);

    // The dashboard summary derives from the same resolver, so it must agree.
    expect(buildSubjectDashboardSummary('Clerical Ability', overlapping, [
      classification('cler-test-001', 'Filing & Alphabetizing'),
      classification('cler-test-002', 'Filing & Alphabetizing'),
      classification('cler-test-003', 'Spelling'),
    ])).toMatchObject({
      frozenQuestionCount: 1,
      readyForQaQuestionCount: 1,
      inProgressQuestionCount: 1,
      remainingQuestionCount: 0,
    });
  });

  it('does not let an untouched draft batch make a family look nearly finished', () => {
    const bulk = Array.from({ length: 10 }, (_, index) => question(`cler-bulk-${index}`, 'Bulk Family'));
    const catalog = createNormalizedCatalog(bulk, [], bulk.map((item) => classification(item.id, item.topic)));
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, [{
      ...draftBatch,
      family: 'Bulk Family',
      questionIds: bulk.slice(0, 9).map((item) => item.id),
    }]);

    expect(workspace.inProgressQuestionIds).toHaveLength(9);
    expect(workspace.remainingQuestionIds).toHaveLength(1);
    // Claiming nine of ten questions is not the same as having finished nine —
    // but it is not "Not Started" either, because someone has picked them up.
    expect(workspace.status).toBe('In Progress');
    expect(workspace.families[0]?.status).toBe('In Progress');
    expect(buildSubjectWorkspaceData('Clerical Ability', catalog, []).status).toBe('Not Started');
  });

  it('rejects invalid batch definitions and creates exact selected IDs without changing questions', () => {
    const known = new Set(['cler-test-001', 'cler-test-002', 'cler-test-003']);    const existing = [frozenBatch];
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

  it('exports question-level semantic tables as structured Markdown and raw JSON', () => {
    const tableQuestion: Question = {
      ...question('cler-table-001', 'Clerical Operations'),
      contentBlocks: [
        {
          kind: 'table',
          id: 'cler-table-001-codes',
          title: 'Codes',
          columns: ['Code', 'Meaning'],
          rows: [['A', 'Alpha'], ['B', 'Beta']],
        },
      ],
    };
    const catalog = createNormalizedCatalog([tableQuestion], [], [classification(tableQuestion.id, tableQuestion.topic)]);
    const batch = { ...readyBatch, questionIds: [tableQuestion.id] };
    const markdown = createReviewMarkdown(batch, [catalog.getQuestion(tableQuestion.id)!]);

    expect(markdown).toContain('### Structured Stimulus');
    expect(markdown).toContain('**Codes** (table)');
    expect(markdown).toContain('| Code | Meaning |\n|---|---|\n| A | Alpha |\n| B | Beta |');
    expect(markdown).not.toContain('### Passage / Stimulus');

    const raw = JSON.parse(createRawBatchJson(batch, [tableQuestion])) as Question[];
    expect(raw[0]?.contentBlocks).toEqual(tableQuestion.contentBlocks);
    expect(raw[0]?.passage).toBeUndefined();
  });

  it('carries the batch and review metadata a reviewer needs to act without the app', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-003', 'cler-test-002'] };
    const questions = batch.questionIds.map((id) => catalog.getQuestion(id)!);
    const markdown = createReviewMarkdown(batch, questions, {
      classifications: questions.map((item) => classification(item.id, item.topic)),
    });

    expect(markdown).toContain('- Family: Filing & Alphabetizing');
    expect(markdown).toContain('- Status: Ready for QA');
    expect(markdown).toContain('- Created: 2026-08-22T11:00:00+08:00');
    expect(markdown).toContain('- Question IDs (batch order): cler-test-003, cler-test-002');
    expect(markdown).toContain(`- Export format: ${REVIEW_MARKDOWN_FORMAT}`);

    // Fields the previous layout dropped entirely.
    expect(markdown).toContain('| Exam level | Both |');
    expect(markdown).toContain('| Tags | test |');
    expect(markdown).toContain('| Choice count | 5 |');
    expect(markdown).toContain('| Pool | spelling-pool |');
    expect(markdown).toContain('| Subtopic | Spelling subtopic |');
    // A reviewer must be able to tell which explanation source they are reading.
    expect(markdown).toContain('| Explanation source | structured |');
    expect(markdown).toContain('| Explanation source | legacy prose |');
    // Absent optional fields read as an explicit dash, never as a blank cell.
    expect(markdown).toContain('| Reference | — |');
    expect(markdown).not.toMatch(/\|\s+\|\s*$/m);
  });

  it('reports the family the workspace grouped by, not just the raw question topic', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-002'] };
    const questions = [catalog.getQuestion('cler-test-002')!];
    // The manifest is authoritative for family grouping; when the two disagree
    // the export must show both rather than silently contradict the workspace.
    const markdown = createReviewMarkdown(batch, questions, {
      classifications: [classification('cler-test-002', 'Alphabetic Indexing')],
    });
    expect(markdown).toContain('| Topic / family | Alphabetic Indexing |');
    expect(markdown).toContain('| Question topic | Filing & Alphabetizing |');
  });

  it('builds one exact string for counting, chunking, and copying', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-003', 'cler-test-002'] };
    const questions = batch.questionIds.map((id) => catalog.getQuestion(id)!);
    const classifications = questions.map((item) => classification(item.id, item.topic));

    const review = createReviewExport(batch, questions, { classifications });
    expect(exportDocumentIntegrityErrors(review)).toEqual([]);
    expect(review.characterCount).toBe(review.text.length);
    expect(review.chunks.map((chunk) => chunk.text).join('')).toBe(review.text);
    expect(review.lineEnding).toBe('LF');
    // LF throughout: the counted string is the generated string, character for
    // character, with nothing added for the clipboard to have to undo.
    expect(review.text).not.toContain('\r');
    expect(review.text).toBe(createReviewMarkdown(batch, questions, { classifications }));
    // Authored markers survive normalization and chunking.
    expect(review.text).toContain('**bold**');
    expect(review.text).toContain('*italic*');

    const rawJson = createRawJsonExport(batch, questions);
    expect(exportDocumentIntegrityErrors(rawJson)).toEqual([]);
    expect(rawJson.text).not.toContain('\r');
    expect(JSON.parse(rawJson.text)).toEqual(questions);

    // A small limit must not change the underlying string, only where it splits.
    const chunked = createReviewExport(batch, questions, { classifications, chunkCharacterLimit: 500 });
    expect(chunked.text).toBe(review.text);
    expect(chunked.chunks.length).toBeGreaterThan(review.chunks.length);
    expect(chunked.chunks.every((chunk) => chunk.characterCount <= 500)).toBe(true);
    expect(chunked.chunks.map((chunk) => chunk.text).join('')).toBe(review.text);
    expect(chunked.chunks.reduce((total, chunk) => total + chunk.characterCount, 0)).toBe(review.characterCount);
    expect(chunked.chunks.every((chunk) => chunk.characterCount === chunk.text.length)).toBe(true);
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
