import { describe, expect, it } from 'vitest';
import { createNormalizedCatalog } from './contentCatalog';
import {
  buildSubjectDashboardSummary,
  buildSubjectWorkspaceData,
  createQuestionSetExport,
  createQuestionSetMarkdown,
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
import { EXPORT_CHUNK_CHARACTER_LIMIT, exportDocumentIntegrityErrors } from '@/lib/exportText';
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

  it('omits legacy Solution headings while preserving standard step output in both export views', () => {
    const legacyHeadingQuestion: Question = {
      ...question('cler-export-legacy', 'Clerical Operations'),
      structuredExplanation: {
        blocks: [
          {
            type: 'step',
            title: 'Apply the Rule',
            blocks: [
              { type: 'heading', text: 'Solution' },
              { type: 'paragraph', text: 'Apply the filing rule.' },
            ],
          },
        ],
      },
    };
    const batch = { ...readyBatch, questionIds: [legacyHeadingQuestion.id] };
    const markdown = createReviewMarkdown(batch, [legacyHeadingQuestion]);

    expect(markdown).toContain('**Apply the Rule**');
    expect(markdown).not.toContain('Solution');
    expect(markdown).toContain('- type: step\n  title: Apply the Rule');
    expect(markdown).not.toContain('- type: heading');
  });

  it('preserves collapsible Mental Shortcut content in learner and authoring exports', () => {
    const shortcutQuestion: Question = {
      ...question('cler-export-shortcut', 'Clerical Operations'),
      structuredExplanation: {
        blocks: [
          { type: 'correct_answer', text: 'A — 21' },
          { type: 'collapsible', title: 'Mental Shortcut', content: `Subtract the future increase.\n\n\\[\n58-4=54\n\\]` },
        ],
      },
    };
    const batch = { ...readyBatch, questionIds: [shortcutQuestion.id] };
    const markdown = createReviewMarkdown(batch, [shortcutQuestion]);

    expect(markdown).toContain('**Mental Shortcut**');
    expect(markdown).toContain('58-4=54');
    expect(markdown).toContain(`- type: collapsible\n  title: Mental Shortcut\n  content: |`);
    expect(markdown).toContain('    58-4=54');
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

describe('Question Set export — review Markdown minus the explanations', () => {
  const SEPARATOR = '\n\n---\n\n';

  /** Numbered question headings, e.g. `## 3. cler-test-002`. */
  const questionHeadings = (text: string): number => text.match(/^## \d+\. /gm)?.length ?? 0;
  const occurrences = (text: string, needle: string): number => text.split(needle).length - 1;

  /**
   * The indivisible units the chunker is handed, recovered from the finished
   * Markdown: the batch header, then one unit per question carrying the
   * separator that follows it. Every test that asserts a chunk boundary checks
   * this reconstruction against the real output first.
   */
  function markdownUnits(markdown: string): string[] {
    const headerEnd = markdown.indexOf('## 1. ');
    const entries = markdown.slice(headerEnd).split(SEPARATOR);
    return [
      markdown.slice(0, headerEnd),
      ...entries.map((entry, index) => (index === entries.length - 1 ? entry : entry + SEPARATOR)),
    ];
  }

  const richQuestion: Question = {
    id: 'num-9990',
    examLevel: 'Both',
    subject: 'Numerical Reasoning',
    topic: 'Decimals',
    subtopic: 'Multiplication of Decimals',
    difficulty: 'Easy',
    question: 'What is 4.25 × 3.6?',
    choices: [
      { id: 'A', text: '15.3' },
      { id: 'B', text: '14.7' },
      { id: 'C', text: '15.9' },
      { id: 'D', text: '16.2' },
      { id: 'E', text: '15.0' },
    ],
    correctOptionId: 'E',
    explanation: 'Legacy explanation prose that must never reach the export.',
    steps: ['A worked step that must never reach the export.'],
    distractorExplanations: { B: 'A distractor note that must never reach the export.' },
    tip: { label: 'Exam Tip', text: 'A tip that must never reach the export.' },
    tags: ['decimals', 'multiplication'],
    reference: 'Test reference',
    source: 'Test source',
    numberSeries: { sequence: [2, 4, null], missingPosition: 3 },
  } as Question;

  const richBatch = {
    id: 'test-question-set',
    title: 'Test Question Set',
    family: 'Decimals',
    status: 'ready-for-qa' as const,
    createdAt: '2026-08-24T09:00:00+08:00',
    questionIds: ['num-9990'],
  };

  /** A batch large enough to exceed the real 8,000-character chunk limit. */
  function bulk(count: number) {
    const questions = Array.from({ length: count }, (_, index) =>
      question(`cler-bulk-${String(index + 1).padStart(3, '0')}`, 'Filing & Alphabetizing'));
    return {
      batch: { ...readyBatch, id: 'test-bulk', title: 'Test Bulk', questionIds: questions.map((item) => item.id) },
      questions,
      options: { classifications: questions.map((item) => classification(item.id, item.topic)) },
    };
  }

  it('is the review Markdown with each entry cut after Correct Answer', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-001', 'cler-test-003'] };
    const questions = batch.questionIds.map((id) => catalog.getQuestion(id)!);
    const options = { classifications: questions.map((item) => classification(item.id, item.topic)) };

    const review = createReviewMarkdown(batch, questions, options);
    const set = createQuestionSetMarkdown(batch, questions, options);

    // Not a second format: cutting each review entry at `### Learner View`
    // reproduces the Question Set exactly — same header, numbering, metadata
    // table, section headings, and choice formatting. Legacy prose (001) and a
    // structured explanation (003) are both covered.
    const reviewEntries = review.split(SEPARATOR);
    const setEntries = set.split(SEPARATOR);
    expect(setEntries).toHaveLength(reviewEntries.length);
    setEntries.forEach((entry, index) => {
      const cut = reviewEntries[index].indexOf('\n\n### Learner View');
      expect(cut).toBeGreaterThan(0);
      const trailingNewline = index === setEntries.length - 1 ? '\n' : '';
      expect(entry).toBe(reviewEntries[index].slice(0, cut) + trailingNewline);
    });
  });

  it('opens with the batch header and the complete per-question metadata table', () => {
    const document = createQuestionSetExport(richBatch, [richQuestion]);
    const { text } = document;

    expect(text.startsWith([
      '# Test Question Set',
      '',
      '- Batch ID: test-question-set',
      '- Family: Decimals',
      '- Status: Ready for QA',
      '- Question count: 1',
      '- Created: 2026-08-24T09:00:00+08:00',
      '- Question IDs (batch order): num-9990',
      `- Export format: ${REVIEW_MARKDOWN_FORMAT}`,
      '',
      '## 1. num-9990',
      '',
      '### Metadata',
      '',
      '| Field | Value |',
      '|---|---|',
      '| ID | num-9990 |',
    ].join('\n'))).toBe(true);

    // Every metadata row the review export renders, in the same order — the
    // Question Set drops explanations, never metadata.
    const fields = [
      'ID', 'Subject', 'Exam level', 'Topic / family', 'Question topic', 'Subtopic', 'Difficulty',
      'Correct option', 'Choice count', 'Question type', 'Question format', 'Task format', 'Pool',
      'Storage mode', 'Group', 'Tags', 'Reference', 'Source', 'Content version', 'Content status',
      'Explanation source',
    ];
    const positions = fields.map((field) => text.indexOf(`| ${field} |`));
    fields.forEach((field, index) => {
      expect(positions[index], `| ${field} | must be present`).toBeGreaterThan(0);
    });
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);

    expect(text).toContain('| Subject | Numerical Reasoning |');
    expect(text).toContain('| Difficulty | Easy |');
    expect(text).toContain('| Correct option | E |');
    expect(text).toContain('| Choice count | 5 |');
    expect(text).toContain('| Tags | decimals, multiplication |');
    expect(text).toContain('| Reference | Test reference |');
    expect(text).toContain('| Explanation source | legacy prose |');

    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
    expect(document.characterCount).toBe(text.length);
    expect(document.chunkCharacterLimit).toBe(EXPORT_CHUNK_CHARACTER_LIMIT);
    expect(document.lineEnding).toBe('LF');
    expect(text).not.toContain('\r');
    expect(text).toBe(createQuestionSetMarkdown(richBatch, [richQuestion]));
  });

  it('renders Question, Choices, and Correct Answer, then stops', () => {
    const { text } = createQuestionSetExport(richBatch, [richQuestion]);

    expect(text).toContain([
      '### Question',
      '',
      'What is 4.25 × 3.6?',
      '',
      '### Choices',
      '',
      '- **A.** 15.3',
      '- **B.** 14.7',
      '- **C.** 15.9',
      '- **D.** 16.2',
      '- **E.** 15.0',
      '',
      '### Correct Answer',
      '',
      '**E.** 15.0',
    ].join('\n'));
    // Nothing follows the answer but the document's final newline.
    expect(text.endsWith('### Correct Answer\n\n**E.** 15.0\n')).toBe(true);
  });

  it('contains no explanation, rationale, shortcut, authoring section, or JSON syntax', () => {
    const structured = question('cler-test-003', 'Spelling', 'Medium', true);
    const batch = { ...richBatch, questionIds: [richQuestion.id, structured.id] };
    const { text } = createQuestionSetExport(batch, [richQuestion, structured]);

    for (const forbidden of [
      '### Learner View',
      '### Authoring View',
      '**Explanation**',
      'Legacy explanation prose',
      'Legacy explanation for cler-test-003.',
      '**Steps**',
      'A worked step',
      '**Distractor Explanations**',
      'A distractor note',
      'Exam Tip',
      'A tip that',
      'Mental Shortcut',
      'Rationale',
      '**Rule**',
      'Apply the rule.',
      'What to Notice',
      '**Correct Answer:**',
      'structuredExplanation',
      '- type: ',
      '### Number-Series Data',
      'missingPosition',
      '```',
      '{',
    ]) {
      expect(text, `${forbidden} must not appear`).not.toContain(forbidden);
    }
    // The structured question keeps its metadata row — only its blocks are gone.
    expect(text).toContain('| Explanation source | structured |');
  });

  it('keeps the stimulus a question cannot be answered without, and drops the raw authoring payloads', () => {
    const withStimulus: Question = {
      ...richQuestion,
      question: 'What is the main idea of the passage?',
      passage: 'Ang programa ay nagbigay ng ₱1,250 kada pamilya sa loob ng tatlong buwan.',
      contentBlocks: [
        { kind: 'text', id: 'blk-notice', title: 'Notice', body: 'Read the memo before answering.' },
        { kind: 'table', id: 'blk-rates', title: 'Rates', columns: ['Year', 'Rate'], rows: [['2024', '4%'], ['2025', '6%']] },
      ],
      taskInstance: { kind: 'spelling_choice', payload: { correct: 'accommodate' } },
    };
    const batch = { ...richBatch, questionIds: [withStimulus.id] };
    const { text } = createQuestionSetExport(batch, [withStimulus]);
    const review = createReviewMarkdown(batch, [withStimulus]);

    expect(text).toContain('### Passage / Stimulus\n\nAng programa ay nagbigay ng ₱1,250 kada pamilya sa loob ng tatlong buwan.');
    expect(text).toContain('### Structured Stimulus\n\n**Notice** (text)\n\nRead the memo before answering.');
    expect(text).toContain('| Year | Rate |');
    expect(text).toContain('| 2025 | 6% |');

    // The two raw-JSON authoring sections are the only difference from the
    // review export above the answer: they are payloads, not stimulus.
    expect(review).toContain('### Number-Series Data');
    expect(review).toContain('### Task Instance');
    expect(text).not.toContain('### Number-Series Data');
    expect(text).not.toContain('### Task Instance');
    expect(text).not.toContain('accommodate');
    expect(text).not.toContain('```');
  });

  it('numbers every question in batch order, once each, separated by a rule', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-003', 'cler-test-001', 'cler-test-002'] };
    const questions = ['cler-test-001', 'cler-test-002', 'cler-test-003'].map((id) => catalog.getQuestion(id)!);
    const { text } = createQuestionSetExport(batch, questions);

    expect(text).toContain('- Question IDs (batch order): cler-test-003, cler-test-001, cler-test-002');
    expect(questionHeadings(text)).toBe(3);
    expect(text.split(SEPARATOR)).toHaveLength(3);
    batch.questionIds.forEach((id, index) => {
      expect(text).toContain(`## ${index + 1}. ${id}`);
      expect(occurrences(text, `Which answer is correct for ${id}?`)).toBe(1);
      expect(occurrences(text, `**B.** ${id} B`)).toBe(2); // the choice, then the answer
    });
    expect(text.indexOf('## 1. cler-test-003')).toBeLessThan(text.indexOf('## 2. cler-test-001'));
    expect(text.indexOf('## 2. cler-test-001')).toBeLessThan(text.indexOf('## 3. cler-test-002'));
  });

  it('chunks a large batch at 8,000 characters without splitting a question', () => {
    const { batch, questions, options } = bulk(40);
    const document = createQuestionSetExport(batch, questions, options);

    expect(document.text).toBe(createQuestionSetMarkdown(batch, questions, options));
    expect(document.chunkCharacterLimit).toBe(EXPORT_CHUNK_CHARACTER_LIMIT);
    expect(document.characterCount).toBeGreaterThan(EXPORT_CHUNK_CHARACTER_LIMIT);
    expect(document.chunks.length).toBeGreaterThan(1);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
    expect(document.chunks.map((chunk) => chunk.text).join('')).toBe(document.text);

    for (const chunk of document.chunks) {
      expect(chunk.characterCount).toBeLessThanOrEqual(EXPORT_CHUNK_CHARACTER_LIMIT);
      // A split question would leave a heading without its metadata table,
      // choices, and answer — or an answer without its heading.
      const heads = questionHeadings(chunk.text);
      expect(heads).toBeGreaterThan(0);
      expect(occurrences(chunk.text, '### Metadata')).toBe(heads);
      expect(occurrences(chunk.text, '### Question')).toBe(heads);
      expect(occurrences(chunk.text, '### Choices')).toBe(heads);
      expect(occurrences(chunk.text, '### Correct Answer')).toBe(heads);
    }
    expect(document.chunks.reduce((total, chunk) => total + questionHeadings(chunk.text), 0)).toBe(40);
    for (const item of questions) {
      expect(document.chunks.filter((chunk) => chunk.text.includes(`## `) && chunk.text.includes(`. ${item.id}\n`))).toHaveLength(1);
    }
  });

  it('packs as many whole questions into a chunk as fit', () => {
    const catalog = testCatalog();
    const batch = { ...readyBatch, questionIds: ['cler-test-001', 'cler-test-002', 'cler-test-003'] };
    const questions = batch.questionIds.map((id) => catalog.getQuestion(id)!);
    const options = { classifications: questions.map((item) => classification(item.id, item.topic)) };

    const markdown = createQuestionSetMarkdown(batch, questions, options);
    const units = markdownUnits(markdown);
    expect(units).toHaveLength(4); // header + three questions
    expect(units.join('')).toBe(markdown);

    // Exactly enough room for the header and the first two questions.
    const chunkCharacterLimit = units[0].length + units[1].length + units[2].length;
    const document = createQuestionSetExport(batch, questions, { ...options, chunkCharacterLimit });

    expect(document.text).toBe(markdown);
    expect(document.chunks).toHaveLength(2);
    expect(document.chunks[0].text).toBe(units[0] + units[1] + units[2]);
    expect(document.chunks[1].text).toBe(units[3]);
    expect(document.chunks.every((chunk) => chunk.characterCount <= chunkCharacterLimit)).toBe(true);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
  });

  it('fails closed on an unresolved ID and on a question too large to chunk whole', () => {
    const catalog = testCatalog();
    const invalid = { ...readyBatch, questionIds: ['cler-missing'] };
    expect(() => createQuestionSetMarkdown(invalid, [])).toThrow('question cler-missing is not in the active production catalog');
    expect(() => createQuestionSetExport(invalid, [])).toThrow('question cler-missing is not in the active production catalog');

    const batch = { ...readyBatch, questionIds: ['cler-test-001'] };
    const questions = [catalog.getQuestion('cler-test-001')!];
    const options = { classifications: questions.map((item) => classification(item.id, item.topic)) };
    const [header, entry] = markdownUnits(createQuestionSetMarkdown(batch, questions, options));

    // Room for the header but not for the question: truncating or splitting it
    // would be worse than refusing.
    const chunkCharacterLimit = header.length + 1;
    expect(chunkCharacterLimit).toBeLessThan(entry.length);
    expect(() => createQuestionSetExport(batch, questions, { ...options, chunkCharacterLimit }))
      .toThrow(/question cler-test-001 is \d+ characters, over the \d+-character limit, and splitting it would break the question apart/);
    expect(() => createQuestionSetExport(batch, questions, { ...options, chunkCharacterLimit: 40 }))
      .toThrow(/the batch header is \d+ characters, over the 40-character limit/);
  });
});
