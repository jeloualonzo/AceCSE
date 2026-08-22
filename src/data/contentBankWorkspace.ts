import type { NormalizedContentCatalog } from '@/data/contentCatalog';
import {
  allClassifications,
  type ClassificationRecord,
} from '@/data/taxonomy';
import {
  getRefinementBatches,
  refinementStatusLabel,
  validateRefinementBatches,
  type RefinementBatch,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';
import type { Difficulty, Question, Subject } from '@/types';

export const CONTENT_BANK_SUBJECTS: readonly Subject[] = [
  'Clerical Ability',
  'Verbal Ability',
  'Numerical Reasoning',
  'Analytical Reasoning',
  'General Information',
];

const SUBJECT_SLUGS: Record<Subject, string> = {
  'Clerical Ability': 'clerical',
  'Verbal Ability': 'verbal',
  'Numerical Reasoning': 'numerical',
  'Analytical Reasoning': 'analytical',
  'General Information': 'general-information',
};

export function slugForSubject(subject: Subject): string {
  return SUBJECT_SLUGS[subject];
}

export function subjectFromSlug(slug: string): Subject | undefined {
  return CONTENT_BANK_SUBJECTS.find((subject) => SUBJECT_SLUGS[subject] === slug);
}

export type WorkspaceQuestionState = 'frozen' | 'ready-for-qa' | 'remaining';
export type WorkspaceProgressStatus = 'Not Started' | 'In Progress' | 'Almost Complete' | 'Complete';

export interface WorkspaceQuestion {
  question: Question;
  classification?: ClassificationRecord;
  family: string;
  state: WorkspaceQuestionState;
  batchIds: string[];
}

export interface WorkspaceFamilyProgress {
  key: string;
  family: string;
  topic: string;
  poolId: string | null;
  taskFormat: string;
  activeQuestionIds: string[];
  frozenQuestionIds: string[];
  readyForQaQuestionIds: string[];
  remainingQuestionIds: string[];
  status: WorkspaceProgressStatus;
}

export interface InvalidBatchReference {
  batchId: string;
  missingQuestionIds: string[];
}

export interface SubjectWorkspaceData {
  subject: Subject;
  activeQuestionCount: number;
  frozenQuestionIds: string[];
  readyForQaQuestionIds: string[];
  remainingQuestionIds: string[];
  status: WorkspaceProgressStatus;
  families: WorkspaceFamilyProgress[];
  questions: WorkspaceQuestion[];
  batches: RefinementBatch[];
  invalidBatchReferences: InvalidBatchReference[];
}

export interface SubjectDashboardSummary {
  subject: Subject;
  activeQuestionCount: number;
  familyCount: number;
  frozenQuestionCount: number;
  readyForQaQuestionCount: number;
  remainingQuestionCount: number;
  status: WorkspaceProgressStatus;
  families: WorkspaceFamilyProgress[];
}

export interface CreateWorkspaceBatchInput {
  id: string;
  title: string;
  family: string;
  status: RefinementBatchStatus;
  questionIds: readonly string[];
  createdAt?: string;
}

export const WORKSPACE_BATCHES_STORAGE_KEY = 'acecse:content-bank:qa-batches';

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function familyKey(topic: string, poolId: string | null, taskFormat: string): string {
  return [topic, poolId ?? '—', taskFormat || 'legacy'].join('|');
}

function classificationFor(
  question: Pick<Question, 'id' | 'subject' | 'topic' | 'taskFormat'>,
  classifications: ReadonlyMap<string, ClassificationRecord>,
): ClassificationRecord | undefined {
  return classifications.get(question.id) ?? allClassifications().find((record) => record.questionId === question.id);
}

function statusForCounts(active: number, frozen: number, readyForQa: number, remaining: number): WorkspaceProgressStatus {
  if (active === 0 || frozen === active) return 'Complete';
  if (frozen === 0 && readyForQa === 0) return 'Not Started';
  if (remaining <= Math.max(2, Math.ceil(active * 0.1)) || frozen / active >= 0.75) return 'Almost Complete';
  return 'In Progress';
}

function questionOrder(left: WorkspaceQuestion, right: WorkspaceQuestion): number {
  return left.family.localeCompare(right.family) || left.question.id.localeCompare(right.question.id);
}

function readWorkspaceBatches(): RefinementBatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || validateRefinementBatches(parsed).length > 0) return [];
    return parsed as RefinementBatch[];
  } catch {
    return [];
  }
}

export function getWorkspaceRefinementBatches(): RefinementBatch[] {
  const combined = new Map<string, RefinementBatch>();
  for (const batch of getRefinementBatches()) combined.set(batch.id, batch);
  for (const batch of readWorkspaceBatches()) {
    if (!combined.has(batch.id)) combined.set(batch.id, batch);
  }
  return getRefinementBatches([...combined.values()]);
}

export function persistWorkspaceRefinementBatch(
  batch: RefinementBatch,
  knownQuestionIds: ReadonlySet<string>,
): string[] {
  const existing = getWorkspaceRefinementBatches();
  const errors = validateWorkspaceBatch(batch, knownQuestionIds, existing);
  if (errors.length > 0) return errors;
  if (typeof window === 'undefined') return ['Batch creation is available only in the Content Bank browser session.'];
  try {
    const local = readWorkspaceBatches();
    window.localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([...local, batch]));
    return [];
  } catch {
    return ['Could not save the QA batch in this browser.'];
  }
}

export function validateWorkspaceBatch(
  batch: CreateWorkspaceBatchInput | RefinementBatch,
  knownQuestionIds: ReadonlySet<string>,
  existingBatches: readonly RefinementBatch[] = getWorkspaceRefinementBatches(),
): string[] {
  const errors: string[] = [];
  const id = batch.id.trim();
  const title = batch.title.trim();
  const family = batch.family.trim();
  const questionIds = [...batch.questionIds];
  if (!id) errors.push('Enter a batch ID.');
  if (!title) errors.push('Enter a batch title.');
  if (!family) errors.push('Enter a family or topic.');
  if (!questionIds.length) errors.push('Select at least one remaining question.');
  if (new Set(questionIds).size !== questionIds.length) errors.push('A batch cannot contain duplicate question IDs.');
  const existingIds = new Set(existingBatches.map((candidate) => candidate.id));
  if (existingIds.has(id)) errors.push(`Batch ID ${id} already exists.`);
  for (const questionId of questionIds) {
    if (!knownQuestionIds.has(questionId)) {
      errors.push(`Question ${questionId} is not in the active production catalog.`);
    }
  }
  errors.push(...validateRefinementBatches([{
    ...batch,
    id,
    title,
    family,
    questionIds,
  }], knownQuestionIds).map((error) => error.replace(/^batch\[0\]\./, '')));
  return unique(errors);
}

export function createWorkspaceRefinementBatch(
  input: CreateWorkspaceBatchInput,
  knownQuestionIds: ReadonlySet<string>,
  existingBatches: readonly RefinementBatch[] = getWorkspaceRefinementBatches(),
): { batch?: RefinementBatch; errors: string[] } {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const batch: RefinementBatch = {
    id: input.id.trim(),
    title: input.title.trim(),
    family: input.family.trim(),
    status: input.status,
    createdAt,
    questionIds: [...input.questionIds],
  };
  const errors = validateWorkspaceBatch(batch, knownQuestionIds, existingBatches);
  return errors.length > 0 ? { errors } : { batch, errors: [] };
}

export function buildSubjectWorkspaceData(
  subject: Subject,
  catalog: NormalizedContentCatalog,
  batches: readonly RefinementBatch[] = getWorkspaceRefinementBatches(),
): SubjectWorkspaceData {
  const activeQuestions = catalog.getQuestionsForSubject(subject);
  const activeQuestionIds = new Set(activeQuestions.map((question) => question.id));
  const activeProductionQuestionIds = new Set(allClassifications().map((record) => record.questionId));
  const invalidBatchReferences = batches
    .map((batch) => ({ batchId: batch.id, missingQuestionIds: batch.questionIds.filter((questionId) => !activeProductionQuestionIds.has(questionId)) }))
    .filter((entry) => entry.missingQuestionIds.length > 0);
  const frozenQuestionIds = new Set<string>();
  const readyForQaQuestionIds = new Set<string>();
  const batchIdsByQuestion = new Map<string, string[]>();

  for (const batch of batches) {
    for (const questionId of batch.questionIds) {
      if (!activeQuestionIds.has(questionId)) continue;
      const ids = batchIdsByQuestion.get(questionId) ?? [];
      ids.push(batch.id);
      batchIdsByQuestion.set(questionId, ids);
      if (batch.status === 'frozen') frozenQuestionIds.add(questionId);
      else if (!frozenQuestionIds.has(questionId)) readyForQaQuestionIds.add(questionId);
    }
  }
  for (const questionId of frozenQuestionIds) readyForQaQuestionIds.delete(questionId);

  const questions: WorkspaceQuestion[] = activeQuestions.map((question) => {
    const classification = classificationFor(question, catalog.classifications);
    const family = classification?.topic ?? question.topic;
    const state: WorkspaceQuestionState = frozenQuestionIds.has(question.id)
      ? 'frozen'
      : readyForQaQuestionIds.has(question.id)
        ? 'ready-for-qa'
        : 'remaining';
    return {
      question,
      classification,
      family,
      state,
      batchIds: batchIdsByQuestion.get(question.id) ?? [],
    };
  }).sort(questionOrder);

  const familyMap = new Map<string, WorkspaceFamilyProgress>();
  for (const item of questions) {
    const record = item.classification;
    const topic = record?.topic ?? item.question.topic;
    const poolId = record?.poolId ?? null;
    const taskFormat = record?.taskFormat ?? item.question.taskFormat ?? 'legacy';
    const key = familyKey(topic, poolId, taskFormat);
    const family = familyMap.get(key) ?? {
      key,
      family: topic,
      topic,
      poolId,
      taskFormat,
      activeQuestionIds: [],
      frozenQuestionIds: [],
      readyForQaQuestionIds: [],
      remainingQuestionIds: [],
      status: 'Not Started' as WorkspaceProgressStatus,
    };
    family.activeQuestionIds.push(item.question.id);
    if (item.state === 'frozen') family.frozenQuestionIds.push(item.question.id);
    else if (item.state === 'ready-for-qa') family.readyForQaQuestionIds.push(item.question.id);
    else family.remainingQuestionIds.push(item.question.id);
    family.status = statusForCounts(
      family.activeQuestionIds.length,
      family.frozenQuestionIds.length,
      family.readyForQaQuestionIds.length,
      family.remainingQuestionIds.length,
    );
    familyMap.set(key, family);
  }

  const families = [...familyMap.values()].sort((left, right) => left.family.localeCompare(right.family) || left.taskFormat.localeCompare(right.taskFormat));
  const remainingQuestionIds = questions.filter((item) => item.state === 'remaining').map((item) => item.question.id);
  const readyIds = questions.filter((item) => item.state === 'ready-for-qa').map((item) => item.question.id);
  const frozenIds = questions.filter((item) => item.state === 'frozen').map((item) => item.question.id);
  return {
    subject,
    activeQuestionCount: questions.length,
    frozenQuestionIds: frozenIds,
    readyForQaQuestionIds: readyIds,
    remainingQuestionIds,
    status: statusForCounts(questions.length, frozenIds.length, readyIds.length, remainingQuestionIds.length),
    families,
    questions,
    batches: getRefinementBatches(batches),
    invalidBatchReferences,
  };
}

export function buildSubjectDashboardSummary(
  subject: Subject,
  batches: readonly RefinementBatch[] = getWorkspaceRefinementBatches(),
  classifications: readonly ClassificationRecord[] = allClassifications(),
): SubjectDashboardSummary {
  const records = classifications.filter((record) => record.subject === subject);
  const frozen = new Set<string>();
  const readyForQa = new Set<string>();
  const activeIds = new Set(records.map((record) => record.questionId));
  for (const batch of batches) {
    for (const id of batch.questionIds) {
      if (!activeIds.has(id)) continue;
      if (batch.status === 'frozen') frozen.add(id);
      else if (!frozen.has(id)) readyForQa.add(id);
    }
  }
  for (const id of frozen) readyForQa.delete(id);
  const familyMap = new Map<string, WorkspaceFamilyProgress>();
  for (const record of records) {
    const key = familyKey(record.topic, record.poolId, record.taskFormat);
    const family = familyMap.get(key) ?? {
      key,
      family: record.topic,
      topic: record.topic,
      poolId: record.poolId,
      taskFormat: record.taskFormat,
      activeQuestionIds: [],
      frozenQuestionIds: [],
      readyForQaQuestionIds: [],
      remainingQuestionIds: [],
      status: 'Not Started' as WorkspaceProgressStatus,
    };
    family.activeQuestionIds.push(record.questionId);
    if (frozen.has(record.questionId)) family.frozenQuestionIds.push(record.questionId);
    else if (readyForQa.has(record.questionId)) family.readyForQaQuestionIds.push(record.questionId);
    else family.remainingQuestionIds.push(record.questionId);
    family.status = statusForCounts(
      family.activeQuestionIds.length,
      family.frozenQuestionIds.length,
      family.readyForQaQuestionIds.length,
      family.remainingQuestionIds.length,
    );
    familyMap.set(key, family);
  }
  const families = [...familyMap.values()].sort((left, right) => left.family.localeCompare(right.family) || left.taskFormat.localeCompare(right.taskFormat));
  const remaining = records.filter((record) => !frozen.has(record.questionId) && !readyForQa.has(record.questionId)).map((record) => record.questionId);
  return {
    subject,
    activeQuestionCount: records.length,
    familyCount: families.length,
    frozenQuestionCount: frozen.size,
    readyForQaQuestionCount: readyForQa.size,
    remainingQuestionCount: remaining.length,
    status: statusForCounts(records.length, frozen.size, readyForQa.size, remaining.length),
    families,
  };
}

export function getQuestionPreview(question: Question, maxLength = 132): string {
  const normalized = question.question.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

export function getNextRemainingQuestionIds(
  workspace: Pick<SubjectWorkspaceData, 'questions'>,
  count: number,
  family?: string,
): string[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  return workspace.questions
    .filter((item) => item.state === 'remaining' && (!family || item.family === family))
    .slice(0, Math.floor(count))
    .map((item) => item.question.id);
}

export function getBatchQuestions(
  batch: Pick<RefinementBatch, 'questionIds'>,
  catalog: NormalizedContentCatalog,
): Question[] {
  return batch.questionIds.map((questionId) => catalog.getQuestion(questionId)).filter((question): question is Question => Boolean(question));
}

function renderCodeBlock(expression: string): string {
  return `\n\`\`\`text\n${expression}\n\`\`\``;
}

function renderLearnerBlock(block: NonNullable<Question['structuredExplanation']>['blocks'][number]): string {
  switch (block.type) {
    case 'heading': return `## ${block.text}`;
    case 'correct_answer': return `**Correct Answer:** ${block.text}`;
    case 'paragraph': return block.label ? `**${block.label}**\n\n${block.text}` : block.text;
    case 'rule': return `**Rule**\n\n${block.text}`;
    case 'common_trap': return `**Common Trap**\n\n${block.text}`;
    case 'math': return `**Calculation**${renderCodeBlock(block.expression)}`;
    case 'pattern': return `**Pattern${block.label ? ` — ${block.label}` : ''}**${renderCodeBlock(block.expression)}`;
    case 'solution': return `**Apply the Pattern**${renderCodeBlock(block.expression)}`;
    case 'answer': return `**Answer:** ${block.text}`;
    case 'step': return `### ${block.title}\n\n${block.blocks.map(renderLearnerBlock).join('\n\n')}`;
    case 'alternative_solution': return `### ${block.title}\n\n${block.blocks.map(renderLearnerBlock).join('\n\n')}`;
  }
}

function indentText(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n');
}

function renderAuthoringBlock(block: NonNullable<Question['structuredExplanation']>['blocks'][number]): string {
  switch (block.type) {
    case 'heading': return `- type: heading\n  text: ${block.text}`;
    case 'correct_answer': return `- type: correct_answer\n  text: ${block.text}`;
    case 'paragraph': return `- type: paragraph\n  label: ${block.label ?? '(none)'}\n  text: |\n${indentText(block.text, 4)}`;
    case 'rule': return `- type: rule\n  text: |\n${indentText(block.text, 4)}`;
    case 'common_trap': return `- type: common_trap\n  text: |\n${indentText(block.text, 4)}`;
    case 'math': return `- type: math\n  expression: |\n${indentText(block.expression, 4)}`;
    case 'pattern': return `- type: pattern\n  label: ${block.label ?? '(none)'}\n  expression: |\n${indentText(block.expression, 4)}`;
    case 'solution': return `- type: solution\n  expression: |\n${indentText(block.expression, 4)}`;
    case 'answer': return `- type: answer\n  variant: ${block.variant ?? '(none)'}\n  text: ${block.text}`;
    case 'step': return `- type: step\n  title: ${block.title}\n  blocks:\n${indentText(block.blocks.map(renderAuthoringBlock).join('\n'), 4)}`;
    case 'alternative_solution': return `- type: alternative_solution\n  title: ${block.title}\n  blocks:\n${indentText(block.blocks.map(renderAuthoringBlock).join('\n'), 4)}`;
  }
}

function renderLegacyQuestionExplanation(question: Question): string {
  const sections = [`**Explanation**\n\n${question.explanation}`];
  if (question.steps?.length) sections.push(`**Steps**\n\n${question.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`);
  if (question.distractorExplanations && Object.keys(question.distractorExplanations).length) {
    sections.push(`**Distractor Explanations**\n\n${Object.entries(question.distractorExplanations).map(([id, text]) => `- **${id}:** ${text}`).join('\n')}`);
  }
  if (question.tip) sections.push(`**${question.tip.label}**\n\n${question.tip.text}`);
  return sections.join('\n\n');
}

function renderLegacyAuthoring(question: Question): string {
  const lines = [`- type: legacy`, `  explanation: |`, indentText(question.explanation, 4)];
  if (question.steps?.length) {
    lines.push('  steps:', ...question.steps.map((step) => `    - ${step}`));
  }
  if (question.distractorExplanations && Object.keys(question.distractorExplanations).length) {
    lines.push('  distractorExplanations:');
    for (const [id, text] of Object.entries(question.distractorExplanations)) {
      lines.push(`    ${id}: |`, indentText(text, 6));
    }
  }
  if (question.tip) {
    lines.push('  tip:', `    label: ${question.tip.label}`, '    text: |', indentText(question.tip.text, 6));
  }
  return lines.join('\n');
}

function renderSupportingQuestionContent(question: Question): string {
  const sections: string[] = [];
  if (question.passage) sections.push(`### Passage / Stimulus\n\n${question.passage}`);
  if (question.numberSeries) sections.push(`### Number-Series Data\n\n${renderCodeBlock(JSON.stringify(question.numberSeries, null, 2))}`);
  if (question.taskInstance) {
    sections.push(`### Task Instance\n\n- kind: ${question.taskInstance.kind}\n- payload:\n${indentText(JSON.stringify(question.taskInstance.payload, null, 2), 2)}`);
  }
  return sections.join('\n\n');
}

export function createReviewMarkdown(
  batch: RefinementBatch,
  questions: readonly Question[],
): string {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const missing = batch.questionIds.filter((questionId) => !questionById.has(questionId));
  if (missing.length) throw new Error(`Could not export batch: question ${missing[0]} is not in the active production catalog.`);
  const body = batch.questionIds.map((questionId, index) => {
    const question = questionById.get(questionId)!;
    const correctChoice = question.choices.find((choice) => choice.id === question.correctOptionId);
    const structured = question.structuredExplanation
      ? question.structuredExplanation.blocks.map(renderLearnerBlock).join('\n\n')
      : renderLegacyQuestionExplanation(question);
    const authoring = question.structuredExplanation
      ? question.structuredExplanation.blocks.map(renderAuthoringBlock).join('\n')
      : renderLegacyAuthoring(question);
    const supportingContent = renderSupportingQuestionContent(question);
    const choices = question.choices.map((choice) => `- **${choice.id}.** ${choice.text}`).join('\n');
    const metadata = [
      ['ID', question.id],
      ['Subject', question.subject],
      ['Topic / family', question.topic],
      ['Subtopic', question.subtopic ?? '—'],
      ['Difficulty', question.difficulty],
      ['Correct option', question.correctOptionId],
      ['Task format', question.taskFormat ?? '—'],
      ['Question format', question.questionFormat ?? '—'],
    ].map(([key, value]) => `| ${key} | ${value.replaceAll('|', '\\|')} |`).join('\n');
    return `## ${index + 1}. ${question.id}\n\n### Metadata\n\n| Field | Value |\n|---|---|\n${metadata}\n\n### Question\n\n${question.question}${supportingContent ? `\n\n${supportingContent}` : ''}\n\n### Choices\n\n${choices}\n\n### Correct Answer\n\n**${question.correctOptionId}.** ${correctChoice?.text ?? 'Unavailable'}\n\n### Learner View\n\n${structured}\n\n### Authoring View\n\n${authoring}`;
  }).join('\n\n---\n\n');
  return `# ${batch.title}\n\n- Batch ID: ${batch.id}\n- Status: ${refinementStatusLabel(batch.status)}\n- Question count: ${batch.questionIds.length}\n- Created: ${batch.createdAt}\n\n${body}\n`;
}

export function createRawBatchJson(
  batch: RefinementBatch,
  questions: readonly Question[],
): string {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const ordered = batch.questionIds.map((questionId) => {
    const question = questionById.get(questionId);
    if (!question) throw new Error(`Could not export batch: question ${questionId} is not in the active production catalog.`);
    return question;
  });
  return JSON.stringify(ordered, null, 2);
}

export function workspaceStateLabel(state: WorkspaceQuestionState): string {
  return state === 'frozen' ? 'Frozen' : state === 'ready-for-qa' ? 'Ready for QA' : 'Remaining';
}

export function workspaceStatusLabel(status: WorkspaceProgressStatus): string {
  return status;
}

export function buildSubjectDashboardSummaries(
  batches: readonly RefinementBatch[] = getWorkspaceRefinementBatches(),
  classifications: readonly ClassificationRecord[] = allClassifications(),
): SubjectDashboardSummary[] {
  return CONTENT_BANK_SUBJECTS.map((subject) => buildSubjectDashboardSummary(subject, batches, classifications));
}

export function getWorkspaceDifficulty(question: Question): Difficulty {
  return question.difficulty;
}

export function getWorkspaceFamily(question: Question, catalog: NormalizedContentCatalog): string {
  return classificationFor(question, catalog.classifications)?.topic ?? question.topic;
}
