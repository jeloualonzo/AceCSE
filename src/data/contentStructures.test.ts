import { describe, expect, it } from 'vitest';
import { createNormalizedCatalog } from './contentCatalog';
import { loadContentCatalog } from './questionBank';
import {
  SHARED_TASK_SOURCE_FILE,
  STRUCTURE_REVIEW_MARKDOWN_FORMAT,
  buildSubjectStructures,
  createStructureReviewExport,
  createStructureReviewMarkdown,
  createStructureSourceJson,
  createStructureSourceJsonExport,
  orderStructureSelection,
  sharedTaskStructureKey,
} from './contentStructures';
import {
  EXPORT_CHUNK_CHARACTER_LIMIT,
  exportDocumentIntegrityErrors,
} from '@/lib/exportText';
import { CANONICAL_TAXONOMY } from './taxonomy';
import type { ClassificationRecord } from './taxonomy';
import type { Question, QuestionGroup, Subject } from '@/types';

const SUBJECT: Subject = 'Clerical Ability';

function question(id: string): Question {
  return {
    id,
    examLevel: 'Both',
    subject: SUBJECT,
    topic: 'Filing',
    difficulty: 'Medium',
    question: `Which order is correct for ${id}?`,
    choices: [
      { id: 'A', text: `${id} A` },
      { id: 'B', text: `${id} B` },
      { id: 'C', text: `${id} C` },
      { id: 'D', text: `${id} D` },
    ],
    correctOptionId: 'B',
    explanation: `Explanation for ${id}.`,
    tags: ['test'],
  };
}

function group(overrides: Partial<QuestionGroup> = {}): QuestionGroup {
  return {
    id: 'grp-test-01',
    examLevel: 'Both',
    subject: SUBJECT,
    topic: 'Filing',
    questionType: 'Filing',
    title: 'Filing — Set 1',
    directions: 'DIRECTIONS: File the entries alphabetically.',
    questionIds: ['clr-0001', 'clr-0002'],
    selectionPolicy: 'atomic',
    orderPolicy: 'fixed',
    tags: ['item-set'],
    status: 'published',
    contentVersion: 1,
    ...overrides,
  };
}

function classification(questionId: string, taskFormat: string): ClassificationRecord {
  return {
    questionId,
    subject: SUBJECT,
    examLevel: 'Both',
    topic: 'Filing',
    questionType: 'Filing',
    questionFormat: 'ordering',
    taskFormat,
    storageMode: 'pool',
    poolId: 'clerical-filing',
    fixedGroupId: null,
    embeddedStimulus: false,
    sourceFile: 'content/questions/clerical/core.json',
    confidence: 'high',
  };
}

function fixtureCatalog(groups: readonly QuestionGroup[] = [group()]) {
  const questions = [question('clr-0001'), question('clr-0002'), question('clr-0003')];
  return createNormalizedCatalog(questions, groups);
}

describe('buildSubjectStructures — the authored structures for one subject', () => {
  it('lists authored groups and never the implicit singletons normalization invents', () => {
    const catalog = fixtureCatalog();
    // Proof the trap is real: the catalog does hold a singleton per question.
    expect(catalog.getGroupsForSubject(SUBJECT).length).toBeGreaterThan(1);
    expect(catalog.getGroup('singleton:clr-0003')).toBeDefined();

    const data = buildSubjectStructures(SUBJECT, catalog, { classifications: [] });

    expect(data.groups.map((structure) => structure.key)).toEqual(['grp-test-01']);
    expect(data.all.every((structure) => !structure.key.startsWith('singleton:'))).toBe(true);
  });

  it('reads a group’s own fields as its learner-facing representation', () => {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), { classifications: [] });
    const structure = data.groups[0];

    expect(structure.kind).toBe('group');
    expect(structure.title).toBe('Filing — Set 1');
    expect(structure.directions).toBe('DIRECTIONS: File the entries alphabetically.');
    expect(structure.questionIds).toEqual(['clr-0001', 'clr-0002']);
    expect(structure.rendersHeader).toBe(true);
  });

  it('reports honestly that a title-only group renders no directions header', () => {
    const data = buildSubjectStructures(
      SUBJECT,
      fixtureCatalog([group({ directions: undefined, example: undefined })]),
      { classifications: [] },
    );
    expect(data.groups[0].rendersHeader).toBe(false);
  });

  it('strips normalization-only fields from the authored source record', () => {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), { classifications: [] });
    const source = data.groups[0].source;

    // `questions` holds resolved catalog references and `isImplicitSingleton` is
    // a runtime marker — neither exists in the source file.
    expect(source).not.toHaveProperty('questions');
    expect(source).not.toHaveProperty('isImplicitSingleton');
    expect(source).toMatchObject({ id: 'grp-test-01', selectionPolicy: 'atomic' });
  });

  it('projects a shared task definition through the same resolver the booklet uses', () => {
    const catalog = fixtureCatalog();
    const data = buildSubjectStructures(SUBJECT, catalog, {
      classifications: [
        classification('clr-0001', 'shared_filing_task'),
        classification('clr-0002', 'shared_filing_task'),
      ],
    });
    const filing = data.sharedTasks.find((structure) => structure.sourceId === 'filing_default');

    expect(filing).toBeDefined();
    expect(filing!.key).toBe(sharedTaskStructureKey('filing_default'));
    expect(filing!.sourceFile).toBe(SHARED_TASK_SOURCE_FILE);
    // Exactly the authored title/directions, not a re-worded label.
    const definition = CANONICAL_TAXONOMY.sharedTaskDefinitions.filing_default;
    expect(filing!.title).toBe(definition.title);
    expect(filing!.directions).toBe(definition.directions);
    // Authored examples carry literal \n that means a display break; the joined
    // example must be decoded, never left as a backslash-n.
    expect(filing!.example).toBeTruthy();
    expect(filing!.example).not.toContain('\\n');
    expect(filing!.questionIds).toEqual(['clr-0001', 'clr-0002']);
  });

  it('scopes shared task definitions to the subject that authored them', () => {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), { classifications: [] });
    const refs = data.sharedTasks.map((structure) => structure.sourceId);

    expect(refs).toContain('filing_default');
    expect(refs).toContain('spelling_default');
    // Verbal and Numerical definitions belong to their own subjects.
    expect(refs).not.toContain('grammar_sentence_correction_pilot');
    expect(refs).not.toContain('number_series_default');
  });

  it('surfaces unresolved question references instead of quietly shortening the list', () => {
    const catalog = fixtureCatalog();
    const data = buildSubjectStructures(SUBJECT, catalog, {
      classifications: [classification('clr-9999', 'shared_filing_task')],
    });
    const filing = data.sharedTasks.find((structure) => structure.sourceId === 'filing_default')!;

    expect(filing.questionIds).toEqual(['clr-9999']);
    expect(filing.unresolvedQuestionIds).toEqual(['clr-9999']);
  });

  it('names the real repository files, and admits when a subject has no groups file', async () => {
    const clerical = await loadContentCatalog(['Clerical Ability']);
    expect(buildSubjectStructures('Clerical Ability', clerical).groupSourceFiles).toEqual([
      'content/groups/clerical/core-groups.json',
    ]);

    const general = await loadContentCatalog(['General Information']);
    const data = buildSubjectStructures('General Information', general);
    expect(data.groupSourceFiles).toEqual([]);
    expect(data.groups).toEqual([]);
  });

  it('lists only authored groups against the real production catalog', async () => {
    const catalog = await loadContentCatalog(['Verbal Ability']);
    const data = buildSubjectStructures('Verbal Ability', catalog);

    expect(data.groups.length).toBeGreaterThan(0);
    // The real catalog holds a singleton per legacy question — hundreds of them.
    expect(catalog.getGroupsForSubject('Verbal Ability').length).toBeGreaterThan(data.groups.length + 50);
    for (const structure of data.groups) {
      expect(structure.key.startsWith('singleton:')).toBe(false);
      expect(structure.sourceFile).toBe('content/groups/verbal/core-groups.json');
    }
  });
});

describe('orderStructureSelection', () => {
  it('follows listed order, not click order', () => {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), { classifications: [] });
    const keys = data.all.map((structure) => structure.key);
    expect(keys.length).toBeGreaterThan(2);

    const clickedBackwards = new Set([keys[2], keys[0]]);
    expect(orderStructureSelection(data, clickedBackwards).map((s) => s.key)).toEqual([keys[0], keys[2]]);
  });

  it('groups precede shared task definitions', () => {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), { classifications: [] });
    const kinds = data.all.map((structure) => structure.kind);
    expect(kinds.indexOf('group')).toBeLessThan(kinds.indexOf('shared-task'));
  });
});

describe('createStructureReviewMarkdown', () => {
  function markdown() {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), {
      classifications: [classification('clr-0001', 'shared_filing_task')],
    });
    return { text: createStructureReviewMarkdown(SUBJECT, data.all, data), data };
  }

  it('headers the subject, the counts, both sources, and the format version', () => {
    const { text, data } = markdown();
    expect(text.startsWith(`# ${SUBJECT} — Content Structures\n`)).toBe(true);
    expect(text).toContain(`- Structure count: ${data.all.length}`);
    expect(text).toContain('- Authored groups: 1');
    expect(text).toContain(`- Shared task source: ${SHARED_TASK_SOURCE_FILE} → sharedTaskDefinitions`);
    expect(text).toContain(`- Export format: ${STRUCTURE_REVIEW_MARKDOWN_FORMAT}`);
  });

  it('never embeds a character count, which could not settle', () => {
    expect(markdown().text).not.toMatch(/^- Character count:/m);
  });

  it('separates every structure with the same rule the batch export uses', () => {
    const { text, data } = markdown();
    expect(text.split('\n\n---\n\n')).toHaveLength(data.all.length);
  });

  it('keeps metadata on one table line while leaving authored text verbatim', () => {
    const data = buildSubjectStructures(
      SUBJECT,
      fixtureCatalog([group({ directions: 'First line.\nSecond line.' })]),
      { classifications: [] },
    );
    const text = createStructureReviewMarkdown(SUBJECT, [data.groups[0]], data);

    // The metadata table never gains a row from a multi-line value.
    const tableRows = text.split('\n').filter((line) => line.startsWith('| '));
    expect(tableRows.every((row) => row.endsWith(' |'))).toBe(true);
    // The learner-facing block keeps the authored break.
    expect(text).toContain('First line.\nSecond line.');
  });

  it('says plainly when a structure renders no directions header', () => {
    const data = buildSubjectStructures(
      SUBJECT,
      fixtureCatalog([group({ directions: undefined, example: undefined })]),
      { classifications: [] },
    );
    const text = createStructureReviewMarkdown(SUBJECT, [data.groups[0]], data);
    expect(text).toContain('No directions header renders for this structure');
  });

  it('renders a group’s passage block under its directions', () => {
    const data = buildSubjectStructures(
      SUBJECT,
      fixtureCatalog([
        group({
          contentBlocks: [{ kind: 'text', id: 'grp-test-01-stimulus', title: 'PASSAGE', body: 'The passage prose.' }],
        }),
      ]),
      { classifications: [] },
    );
    const text = createStructureReviewMarkdown(SUBJECT, [data.groups[0]], data);
    expect(text).toContain('**PASSAGE** (text)');
    expect(text).toContain('The passage prose.');
  });

  it('fails closed on an empty selection rather than exporting a headline with no body', () => {
    expect(() => createStructureReviewMarkdown(SUBJECT, [])).toThrow(/no structure is selected/i);
    expect(() => createStructureSourceJson([])).toThrow(/no structure is selected/i);
  });
});

describe('createStructureSourceJson', () => {
  it('emits the exact authored records in listed order, with no workflow metadata', () => {
    const data = buildSubjectStructures(SUBJECT, fixtureCatalog(), { classifications: [] });
    const parsed = JSON.parse(createStructureSourceJson(data.all)) as Array<Record<string, unknown>>;

    expect(parsed).toHaveLength(data.all.length);
    expect(parsed.map((entry) => entry.key)).toEqual(data.all.map((structure) => structure.key));
    const groupEntry = parsed[0];
    expect(groupEntry.sourceFile).toBe('content/groups/clerical/core-groups.json');
    expect(groupEntry.source).toMatchObject({ id: 'grp-test-01' });
    expect(groupEntry.source).not.toHaveProperty('questions');
    // No status, no batch id, no reviewer — source stays source.
    expect(Object.keys(groupEntry).sort()).toEqual(['key', 'kind', 'source', 'sourceFile']);
  });
});

describe('structure exports reuse the verified counting/chunking contract', () => {
  function data() {
    return buildSubjectStructures(SUBJECT, fixtureCatalog(), {
      classifications: [classification('clr-0001', 'shared_filing_task')],
    });
  }

  it('counts LF-normalized text and passes its own integrity check', () => {
    for (const document of [
      createStructureReviewExport(SUBJECT, data().all, data()),
      createStructureSourceJsonExport(data().all),
    ]) {
      expect(document.lineEnding).toBe('LF');
      expect(document.text).not.toContain('\r');
      expect(document.characterCount).toBe(document.text.length);
      expect(document.chunkCharacterLimit).toBe(EXPORT_CHUNK_CHARACTER_LIMIT);
      expect(exportDocumentIntegrityErrors(document)).toEqual([]);
      expect(document.chunks.map((chunk) => chunk.text).join('')).toBe(document.text);
      for (const chunk of document.chunks) {
        expect(chunk.characterCount).toBeLessThanOrEqual(EXPORT_CHUNK_CHARACTER_LIMIT);
      }
    }
  });

  it('chunks a large real subject at 8,000 characters without losing a character', async () => {
    const catalog = await loadContentCatalog(['Verbal Ability']);
    const verbal = buildSubjectStructures('Verbal Ability', catalog);
    const document = createStructureReviewExport('Verbal Ability', verbal.all, verbal);

    expect(document.characterCount).toBeGreaterThan(EXPORT_CHUNK_CHARACTER_LIMIT);
    expect(document.chunks.length).toBeGreaterThan(1);
    expect(document.chunks.map((chunk) => chunk.text).join('')).toBe(document.text);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
  });
});
