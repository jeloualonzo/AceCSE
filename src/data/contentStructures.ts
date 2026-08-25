import {
  buildExportDocument,
  type BuildExportDocumentOptions,
  type ExportDocument,
} from '@/lib/exportText';
import { CANONICAL_TAXONOMY, allClassifications, type ClassificationRecord } from '@/data/taxonomy';
import { groupSourceFilesForSubject } from '@/data/questionBank';
import {
  hasSharedTaskContent,
  resolveSharedTaskContext,
  type SharedTaskContext,
} from '@/data/sharedTaskContext';
import type { NormalizedContentCatalog } from '@/data/contentCatalog';
import type { ContentBlock, NormalizedQuestionGroup, Subject } from '@/types';
import { renderContentBlockMarkdown } from '@/lib/contentBlockMarkdown';

/**
 * Read-only management view over the two authored structure sources:
 *
 *  - Groups (title / directions / example / passages) — `content/groups/<subject>/*.json`
 *  - Shared task definitions (instructions) — `sharedTaskDefinitions` in
 *    `content/taxonomy/taxonomy.json`
 *
 * Both already reach the client through the same lazy loaders the learner app
 * uses, so this module adds NO second content system and NO new persistence:
 * source content stays source-controlled, and nothing here writes anywhere.
 * It projects that source into a reviewable shape and reuses the existing
 * `exportText` counting/chunking contract for Markdown and raw-source output.
 */

export type ContentStructureKind = 'group' | 'shared-task';

/** The file `sharedTaskDefinitions` is authored in. */
export const SHARED_TASK_SOURCE_FILE = 'content/taxonomy/taxonomy.json';

export interface ContentStructure {
  /** Stable, collision-free key across both kinds. */
  key: string;
  kind: ContentStructureKind;
  /** Authored identifier: the group id, or the shared task definition ref. */
  sourceId: string;
  subject: Subject;
  /** Repo-relative file this structure is authored in. */
  sourceFile: string;
  /** Heading shown above the task, when the source provides one. */
  title?: string;
  directions?: string;
  /**
   * Example text as a learner sees it — for a shared task this is the joined,
   * newline-decoded `examples[]`; for a group it is the authored `example`.
   */
  example?: string;
  /** Passages/tables a group renders under its directions. */
  contentBlocks: readonly ContentBlock[];
  /** Question ids this structure governs, in authored/manifest order. */
  questionIds: readonly string[];
  /**
   * Ids the authored record references that are NOT in the active catalog.
   * Surfaced rather than swallowed: `normalizeContent` drops an entire group
   * whose members cannot all be resolved, so silence here would read as "fine".
   */
  unresolvedQuestionIds: readonly string[];
  /** True when the booklet actually renders a directions header for this task. */
  rendersHeader: boolean;
  /** The exact authored record, for the raw-source export. */
  source: Readonly<Record<string, unknown>>;
  /** Ordered metadata rows, shared by the review table and the Markdown export. */
  metadata: readonly ContentStructureMetadataRow[];
}

export type ContentStructureMetadataRow = readonly [field: string, value: string];

export interface SubjectStructureData {
  subject: Subject;
  groups: readonly ContentStructure[];
  sharedTasks: readonly ContentStructure[];
  /** Groups then shared tasks — the listed order the export follows. */
  all: readonly ContentStructure[];
  groupSourceFiles: readonly string[];
  /** Authored groups that could not be resolved into the catalog at all. */
  droppedGroupCount: number;
}

function list(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}

function stringField(source: Record<string, unknown>, field: string): string | undefined {
  const value = source[field];
  return typeof value === 'string' ? value : undefined;
}

function describeContentBlocks(blocks: readonly ContentBlock[]): string {
  if (blocks.length === 0) return '—';
  return blocks.map((block) => `${block.id} (${block.kind})`).join(', ');
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/**
 * The authored record for a group, without the normalization-only fields.
 *
 * `questions` holds resolved references to catalog objects and
 * `isImplicitSingleton` is a runtime marker; neither exists in the source file,
 * so including them would make the "raw source" export a lie.
 */
function groupSourceRecord(group: NormalizedQuestionGroup): Record<string, unknown> {
  const { questions: _questions, isImplicitSingleton: _isImplicitSingleton, ...source } = group;
  return source;
}

function groupStructure(group: NormalizedQuestionGroup, sourceFile: string): ContentStructure {
  const contentBlocks = group.contentBlocks ?? [];
  const resolved = new Set(group.questions.map((question) => question.id));
  const unresolvedQuestionIds = group.questionIds.filter((id) => !resolved.has(id));
  const metadata: ContentStructureMetadataRow[] = [
    ['Key', group.id],
    ['Kind', 'Authored group'],
    ['Subject', group.subject],
    ['Exam level', group.examLevel],
    ['Topic', group.topic],
    ['Question type', group.questionType ?? '—'],
    ['Selection policy', group.selectionPolicy],
    ['Order policy', group.orderPolicy],
    ['Question count', String(group.questionIds.length)],
    ['Question IDs (authored order)', list(group.questionIds)],
    ['Unresolved question IDs', list(unresolvedQuestionIds)],
    ['Content blocks', describeContentBlocks(contentBlocks)],
    ['Tags', list(group.tags)],
    ['Content version', group.contentVersion === undefined ? '—' : String(group.contentVersion)],
    ['Content status', group.status ?? '—'],
    ['Source file', sourceFile],
  ];
  return {
    key: group.id,
    kind: 'group',
    sourceId: group.id,
    subject: group.subject,
    sourceFile,
    title: group.title,
    directions: group.directions,
    example: group.example,
    contentBlocks,
    questionIds: group.questionIds,
    unresolvedQuestionIds,
    // A group node passes the group itself as the task context, so the booklet's
    // header condition applies to exactly these fields.
    rendersHeader: hasSharedTaskContent(group, contentBlocks.length),
    source: groupSourceRecord(group),
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Shared task definitions
// ---------------------------------------------------------------------------

/** `shared-task:` prefixed so a definition ref can never collide with a group id. */
export function sharedTaskStructureKey(ref: string): string {
  return `shared-task:${ref}`;
}

function sharedTaskStructure(
  ref: string,
  definition: Record<string, unknown>,
  subject: Subject,
  catalog: NormalizedContentCatalog,
  classifications: readonly ClassificationRecord[],
): ContentStructure {
  const taskFormat = stringField(definition, 'taskFormat') ?? '';
  const matching = classifications.filter(
    (record) => record.subject === subject && record.taskFormat === taskFormat,
  );
  const questionIds = matching.map((record) => record.questionId);
  const explicitRefs = matching.filter((record) => record.sharedDirectionsRef === ref).length;
  const unresolvedQuestionIds = questionIds.filter((id) => !catalog.getQuestion(id));

  // The learner-facing projection, through the SAME resolver the booklet uses.
  const learner: SharedTaskContext = resolveSharedTaskContext({
    questionType: stringField(definition, 'questionType') ?? taskFormat,
    taskFormat,
    getGroup: (groupId) => catalog.getGroup(groupId),
  });
  const directionsSource = stringField(definition, 'directionsSource');
  const examples = Array.isArray(definition.examples) ? definition.examples.length : 0;

  const metadata: ContentStructureMetadataRow[] = [
    ['Key', sharedTaskStructureKey(ref)],
    ['Kind', 'Shared task definition'],
    ['Definition ref', ref],
    ['Subject', subject],
    ['Task format', taskFormat || '—'],
    ['Own title', stringField(definition, 'title') ?? '—'],
    ['Own directions', stringField(definition, 'directions') ? 'yes' : 'no'],
    ['Directions source group', directionsSource ?? '—'],
    ['Authored examples', String(examples)],
    ['Answer structure', stringField(definition, 'answerStructure') ?? '—'],
    ['Classified questions', String(questionIds.length)],
    ['Questions naming this ref', String(explicitRefs)],
    ['Unresolved question IDs', list(unresolvedQuestionIds)],
    ['Provenance', stringField(definition, 'provenance') ?? '—'],
    ['Reference', stringField(definition, 'reference') ?? '—'],
    ['Source file', `${SHARED_TASK_SOURCE_FILE} → sharedTaskDefinitions.${ref}`],
  ];

  return {
    key: sharedTaskStructureKey(ref),
    kind: 'shared-task',
    sourceId: ref,
    subject,
    sourceFile: SHARED_TASK_SOURCE_FILE,
    title: learner.title,
    directions: learner.directions,
    example: learner.example,
    contentBlocks: [],
    questionIds,
    unresolvedQuestionIds,
    rendersHeader: hasSharedTaskContent(learner),
    source: definition,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Every authored structure that governs one subject's content.
 *
 * Implicit singletons are excluded: `normalizeContent` represents EVERY legacy
 * question as a `singleton:<id>` group, so an unfiltered listing would bury the
 * authored groups under hundreds of records that exist in no source file.
 */
export function buildSubjectStructures(
  subject: Subject,
  catalog: NormalizedContentCatalog,
  options: { classifications?: readonly ClassificationRecord[] } = {},
): SubjectStructureData {
  const classifications = options.classifications ?? allClassifications();
  const groupSourceFiles = groupSourceFilesForSubject(subject);
  const sourceFile = groupSourceFiles[0] ?? '—';
  const normalized = catalog
    .getGroupsForSubject(subject)
    .filter((group) => !group.isImplicitSingleton);
  const groups = normalized
    .map((group) => groupStructure(group, sourceFile))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));

  const sharedTasks = Object.entries(CANONICAL_TAXONOMY.sharedTaskDefinitions)
    .filter(([, definition]) => definition.subject === subject)
    .map(([ref, definition]) => sharedTaskStructure(ref, definition, subject, catalog, classifications))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));

  return {
    subject,
    groups,
    sharedTasks,
    all: [...groups, ...sharedTasks],
    groupSourceFiles,
    // Authored ids present in the manifest's fixed-group column that the catalog
    // has no group for — the honest count of records normalization discarded.
    droppedGroupCount: droppedGroupIds(subject, catalog, classifications).length,
  };
}

/**
 * Fixed group ids the classification manifest attributes to this subject that
 * the catalog cannot resolve. `normalizeExplicitGroup` returns `null` for a
 * group with any unresolvable member, so those groups vanish from
 * `getGroupsForSubject` entirely; this is the only way to notice.
 */
export function droppedGroupIds(
  subject: Subject,
  catalog: NormalizedContentCatalog,
  classifications: readonly ClassificationRecord[] = allClassifications(),
): string[] {
  const referenced = new Set(
    classifications
      .filter((record) => record.subject === subject && record.fixedGroupId)
      .map((record) => record.fixedGroupId as string),
  );
  return [...referenced].filter((groupId) => !catalog.getGroup(groupId)).sort();
}

/** Keeps a selection in listed order, so the export order is never click order. */
export function orderStructureSelection(
  data: SubjectStructureData,
  selected: ReadonlySet<string>,
): ContentStructure[] {
  return data.all.filter((structure) => selected.has(structure.key));
}

// ---------------------------------------------------------------------------
// Review Markdown / raw source export
// ---------------------------------------------------------------------------

/** Bumped whenever the structure review layout changes, so a reviewer can tell. */
export const STRUCTURE_REVIEW_MARKDOWN_FORMAT = 'AceCSE Structure Review Markdown v1';

/**
 * A Markdown table cell must stay on one line, so internal whitespace is
 * collapsed and pipes escaped. Metadata cells ONLY — Directions, Example, and
 * passage bodies carry authored text verbatim.
 */
function metadataCell(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim().replaceAll('|', '\\|');
  return collapsed === '' ? '—' : collapsed;
}

function renderStructureSection(structure: ContentStructure, index: number): string {
  const metadata = structure.metadata
    .map(([field, value]) => `| ${field} | ${metadataCell(value)} |`)
    .join('\n');
  const parts = [
    `## ${index + 1}. ${structure.key}`,
    '',
    '### Metadata',
    '',
    '| Field | Value |',
    '|---|---|',
    metadata,
    '',
    '### Learner-Facing Representation',
    '',
    structure.rendersHeader
      ? ''
      : '_No directions header renders for this structure: it has no directions, example, or passage._',
  ];
  const learner: string[] = [];
  if (structure.title) learner.push(`**Title**\n\n${structure.title}`);
  if (structure.directions) learner.push(`**Directions**\n\n${structure.directions}`);
  if (structure.example) learner.push(`**Example**\n\n${structure.example}`);
  for (const block of structure.contentBlocks) learner.push(renderContentBlockMarkdown(block));
  const body = [...parts.filter(Boolean), ...learner].join('\n\n');
  return body;
}

/**
 * The subject's structures as review Markdown.
 *
 * Deliberately no character count in the header: the count depends on the
 * finished string, so embedding it would be self-referential and never settle.
 * Deliberately no raw record either — the exact source is its own export kind,
 * exactly as batch review keeps Markdown and Raw JSON separate.
 */
export function createStructureReviewMarkdown(
  subject: Subject,
  structures: readonly ContentStructure[],
  data?: Pick<SubjectStructureData, 'groupSourceFiles'>,
): string {
  if (structures.length === 0) {
    throw new Error('Could not export: no structure is selected.');
  }
  const groups = structures.filter((structure) => structure.kind === 'group');
  const sharedTasks = structures.filter((structure) => structure.kind === 'shared-task');
  const header = [
    `# ${subject} — Content Structures`,
    '',
    `- Subject: ${subject}`,
    `- Structure count: ${structures.length}`,
    `- Authored groups: ${groups.length}`,
    `- Shared task definitions: ${sharedTasks.length}`,
    `- Group source: ${list(data?.groupSourceFiles ?? [...new Set(groups.map((g) => g.sourceFile))])}`,
    `- Shared task source: ${SHARED_TASK_SOURCE_FILE} → sharedTaskDefinitions`,
    `- Structure keys (listed order): ${structures.map((structure) => structure.key).join(', ')}`,
    `- Export format: ${STRUCTURE_REVIEW_MARKDOWN_FORMAT}`,
  ].join('\n');
  const body = structures.map(renderStructureSection).join('\n\n---\n\n');
  return `${header}\n\n${body}\n`;
}

/**
 * The exact authored records, in listed order.
 *
 * Groups keep their source fields (normalization-only fields removed); shared
 * task definitions are emitted verbatim under their ref. No workflow metadata
 * is injected into either — source stays source.
 */
export function createStructureSourceJson(structures: readonly ContentStructure[]): string {
  if (structures.length === 0) {
    throw new Error('Could not export: no structure is selected.');
  }
  return JSON.stringify(
    structures.map((structure) => ({
      key: structure.key,
      kind: structure.kind,
      sourceFile: structure.sourceFile,
      source: structure.source,
    })),
    null,
    2,
  );
}

/** Review Markdown as a countable, chunkable document. */
export function createStructureReviewExport(
  subject: Subject,
  structures: readonly ContentStructure[],
  data?: Pick<SubjectStructureData, 'groupSourceFiles'>,
  options: BuildExportDocumentOptions = {},
): ExportDocument {
  return buildExportDocument(createStructureReviewMarkdown(subject, structures, data), options);
}

/** Exact authored source as a countable, chunkable document. */
export function createStructureSourceJsonExport(
  structures: readonly ContentStructure[],
  options: BuildExportDocumentOptions = {},
): ExportDocument {
  return buildExportDocument(createStructureSourceJson(structures), options);
}

export function structureKindLabel(kind: ContentStructureKind): string {
  return kind === 'group' ? 'Group' : 'Shared task';
}
