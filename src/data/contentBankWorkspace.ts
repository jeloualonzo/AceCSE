import type { NormalizedContentCatalog } from '@/data/contentCatalog';
import {
  allClassifications,
  type ClassificationRecord,
} from '@/data/taxonomy';
import {
  getRefinementBatches,
  refinementFamilySlug,
  refinementStatusLabel,
  validateRefinementBatches,
  type RefinementBatch,
  type RefinementBatchStatus,
} from '@/data/refinementBatches';
import { isRetiredRefinementBatchId } from '@/data/retiredRefinementBatches';
import {
  buildExportDocument,
  type BuildExportDocumentOptions,
  type ExportDocument,
} from '@/lib/exportText';
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

/**
 * URL slug for a family (taxonomy topic).
 *
 * Families are open-ended — they come from the taxonomy, not a fixed list — so
 * there is no reverse table. `findFamilyBySlug` scans the subject's own families
 * instead, which also means a stale bookmark fails loudly with a "not in this
 * subject" message rather than resolving to the wrong family.
 *
 * Shares `refinementFamilySlug` with batch id generation on purpose: a family's
 * URL and its batch ids are then the same string, so `filing-alphabetizing`
 * appears in both places and cannot drift apart.
 */
export function slugForFamily(family: string): string {
  return refinementFamilySlug(family);
}

export function findFamilyBySlug(
  families: readonly WorkspaceFamilyProgress[],
  slug: string,
): WorkspaceFamilyProgress | undefined {
  return families.find((family) => slugForFamily(family.family) === slug);
}

/**
 * What the refinement workflow has claimed a question for.
 *
 * `in-progress` covers the two pre-QA statuses (`needs-content`, `builder`):
 * the question belongs to a batch someone is working on, so it is neither
 * finished nor free to be picked up again. `remaining` means exactly "no batch
 * has claimed this yet", which is what the Next Questions selection needs.
 */
export type WorkspaceQuestionState = 'frozen' | 'ready-for-qa' | 'in-progress' | 'remaining';
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
  inProgressQuestionIds: string[];
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
  inProgressQuestionIds: string[];
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
  inProgressQuestionCount: number;
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

interface WorkspaceProgressCounts {
  active: number;
  frozen: number;
  readyForQa: number;
  inProgress: number;
  remaining: number;
}

/**
 * Progress must not read as further along than the work actually is.
 *
 * `Almost Complete` is measured against everything that has NOT reached QA yet
 * — `remaining + inProgress` — so a freshly created draft batch cannot make a
 * family look nearly finished merely by claiming its last few questions. A
 * claimed-but-undrafted batch does move a family off `Not Started`, because
 * someone has started on it.
 */
function statusForCounts(counts: WorkspaceProgressCounts): WorkspaceProgressStatus {
  const { active, frozen, readyForQa, inProgress, remaining } = counts;
  if (active === 0 || frozen === active) return 'Complete';
  if (frozen === 0 && readyForQa === 0 && inProgress === 0) return 'Not Started';
  const notYetInQa = remaining + inProgress;
  if (notYetInQa <= Math.max(2, Math.ceil(active * 0.1)) || frozen / active >= 0.75) return 'Almost Complete';
  return 'In Progress';
}

function emptyFamilyProgress(
  key: string,
  topic: string,
  poolId: string | null,
  taskFormat: string,
): WorkspaceFamilyProgress {
  return {
    key,
    family: topic,
    topic,
    poolId,
    taskFormat,
    activeQuestionIds: [],
    frozenQuestionIds: [],
    readyForQaQuestionIds: [],
    inProgressQuestionIds: [],
    remainingQuestionIds: [],
    status: 'Not Started',
  };
}

function recordFamilyQuestion(family: WorkspaceFamilyProgress, questionId: string, state: WorkspaceQuestionState): void {
  family.activeQuestionIds.push(questionId);
  if (state === 'frozen') family.frozenQuestionIds.push(questionId);
  else if (state === 'ready-for-qa') family.readyForQaQuestionIds.push(questionId);
  else if (state === 'in-progress') family.inProgressQuestionIds.push(questionId);
  else family.remainingQuestionIds.push(questionId);
  family.status = statusForCounts({
    active: family.activeQuestionIds.length,
    frozen: family.frozenQuestionIds.length,
    readyForQa: family.readyForQaQuestionIds.length,
    inProgress: family.inProgressQuestionIds.length,
    remaining: family.remainingQuestionIds.length,
  });
}

/**
 * Which workspace state a batch confers on the questions it holds.
 *
 * The two pre-QA statuses both mean "someone is working on this", so they
 * collapse to `in-progress`. `remaining` is deliberately not reachable here,
 * because it means the opposite: no batch claimed the question at all.
 */
function stateForBatchStatus(status: RefinementBatchStatus): Exclude<WorkspaceQuestionState, 'remaining'> {
  switch (status) {
    case 'frozen':
      return 'frozen';
    case 'ready-for-qa':
      return 'ready-for-qa';
    case 'builder':
    case 'needs-content':
      return 'in-progress';
  }
}

/** Furthest state wins when a question is claimed by more than one batch. */
const STATE_PRECEDENCE: Record<WorkspaceQuestionState, number> = {
  frozen: 3,
  'ready-for-qa': 2,
  'in-progress': 1,
  remaining: 0,
};

/**
 * Resolves each active question's workflow state from the batches claiming it.
 *
 * Shared by the workspace and the dashboard so the two can never disagree about
 * what "frozen" or "remaining" means. Batch IDs outside `activeQuestionIds` are
 * ignored here — {@link buildSubjectWorkspaceData} reports those separately as
 * invalid references rather than letting them vanish.
 */
function resolveQuestionStates(
  batches: readonly RefinementBatch[],
  activeQuestionIds: ReadonlySet<string>,
): { states: Map<string, WorkspaceQuestionState>; batchIdsByQuestion: Map<string, string[]> } {
  const states = new Map<string, WorkspaceQuestionState>();
  const batchIdsByQuestion = new Map<string, string[]>();
  for (const batch of batches) {
    const state = stateForBatchStatus(batch.status);
    for (const questionId of batch.questionIds) {
      if (!activeQuestionIds.has(questionId)) continue;
      const ids = batchIdsByQuestion.get(questionId) ?? [];
      ids.push(batch.id);
      batchIdsByQuestion.set(questionId, ids);
      const current = states.get(questionId);
      if (!current || STATE_PRECEDENCE[state] > STATE_PRECEDENCE[current]) states.set(questionId, state);
    }
  }
  return { states, batchIdsByQuestion };
}

function questionOrder(left: WorkspaceQuestion, right: WorkspaceQuestion): number {
  return left.family.localeCompare(right.family) || left.question.id.localeCompare(right.question.id);
}

/**
 * Is this stored row one of the retired ids?
 *
 * Works on `unknown` because it runs before validation, where a row is still
 * whatever JSON.parse produced.
 */
function isRetiredStoredBatch(candidate: unknown): boolean {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const id = (candidate as { id?: unknown }).id;
  return typeof id === 'string' && isRetiredRefinementBatchId(id);
}

/**
 * Rewrite the stored list without the retired rows, so they physically leave
 * this browser instead of being filtered out on every future read.
 *
 * Silent on failure: quota limits and locked-down storage modes are real, and
 * the filter in `readLocalRefinementBatches` already keeps a retired batch out
 * of everything the app can see. Failing the read here would turn a cosmetic
 * cleanup into a broken Content Bank.
 */
function forgetRetiredLocalBatches(kept: readonly unknown[]): void {
  try {
    if (kept.length === 0) window.localStorage.removeItem(WORKSPACE_BATCHES_STORAGE_KEY);
    else window.localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify(kept));
  } catch {
    /* Non-fatal — see above. */
  }
}

/**
 * Batches this browser has stored locally.
 *
 * Exported so the source resolver can offer them to Firestore for migration —
 * a batch drafted while the database was unreachable should not be stranded.
 * A blob that fails validation is discarded wholesale rather than partially
 * trusted, because a half-read batch would silently under-report what is
 * already claimed.
 *
 * Retired ids are dropped here, at the point of reading, so no caller has to
 * remember to filter them. That ordering matters: they are removed *before*
 * validation, because a retired batch that is also malformed would otherwise
 * trip the wholesale discard and take every legitimate local batch down with
 * it — and, since the discard returns early, never get rewritten away either,
 * so it would still be sitting in storage on the next read.
 */
export function readLocalRefinementBatches(): RefinementBatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const kept = parsed.filter((candidate) => !isRetiredStoredBatch(candidate));
    if (kept.length !== parsed.length) forgetRetiredLocalBatches(kept);
    if (validateRefinementBatches(kept).length > 0) return [];
    return kept as RefinementBatch[];
  } catch {
    return [];
  }
}

function readWorkspaceBatches(): RefinementBatch[] {
  return readLocalRefinementBatches();
}

/**
 * Write the local batch list back, replacing any entry with the same id.
 *
 * Upsert rather than append so a status transition made while Firestore is
 * unreachable is not stored twice under one id — which would make the same
 * batch resolve to two different statuses depending on read order.
 */
export function persistLocalRefinementBatch(batch: RefinementBatch): string[] {
  if (typeof window === 'undefined') {
    return ['Batch changes are available only in the Content Bank browser session.'];
  }
  try {
    const local = readLocalRefinementBatches().filter((candidate) => candidate.id !== batch.id);
    window.localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([...local, batch]));
    return [];
  } catch {
    return ['Could not save the batch in this browser.'];
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
  return persistLocalRefinementBatch(batch);
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
  const { states, batchIdsByQuestion } = resolveQuestionStates(batches, activeQuestionIds);

  const questions: WorkspaceQuestion[] = activeQuestions.map((question) => {
    const classification = classificationFor(question, catalog.classifications);
    const family = classification?.topic ?? question.topic;
    return {
      question,
      classification,
      family,
      state: states.get(question.id) ?? 'remaining',
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
    const family = familyMap.get(key) ?? emptyFamilyProgress(key, topic, poolId, taskFormat);
    recordFamilyQuestion(family, item.question.id, item.state);
    familyMap.set(key, family);
  }

  const families = [...familyMap.values()].sort((left, right) => left.family.localeCompare(right.family) || left.taskFormat.localeCompare(right.taskFormat));
  const idsInState = (state: WorkspaceQuestionState): string[] =>
    questions.filter((item) => item.state === state).map((item) => item.question.id);
  const frozenIds = idsInState('frozen');
  const readyIds = idsInState('ready-for-qa');
  const inProgressIds = idsInState('in-progress');
  const remainingQuestionIds = idsInState('remaining');
  return {
    subject,
    activeQuestionCount: questions.length,
    frozenQuestionIds: frozenIds,
    readyForQaQuestionIds: readyIds,
    inProgressQuestionIds: inProgressIds,
    remainingQuestionIds,
    status: statusForCounts({
      active: questions.length,
      frozen: frozenIds.length,
      readyForQa: readyIds.length,
      inProgress: inProgressIds.length,
      remaining: remainingQuestionIds.length,
    }),
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
  const activeIds = new Set(records.map((record) => record.questionId));
  const { states } = resolveQuestionStates(batches, activeIds);
  const familyMap = new Map<string, WorkspaceFamilyProgress>();
  const counts: Record<WorkspaceQuestionState, number> = {
    frozen: 0,
    'ready-for-qa': 0,
    'in-progress': 0,
    remaining: 0,
  };
  for (const record of records) {
    const key = familyKey(record.topic, record.poolId, record.taskFormat);
    const family = familyMap.get(key) ?? emptyFamilyProgress(key, record.topic, record.poolId, record.taskFormat);
    const state = states.get(record.questionId) ?? 'remaining';
    counts[state] += 1;
    recordFamilyQuestion(family, record.questionId, state);
    familyMap.set(key, family);
  }
  const families = [...familyMap.values()].sort((left, right) => left.family.localeCompare(right.family) || left.taskFormat.localeCompare(right.taskFormat));
  return {
    subject,
    activeQuestionCount: records.length,
    familyCount: families.length,
    frozenQuestionCount: counts.frozen,
    readyForQaQuestionCount: counts['ready-for-qa'],
    inProgressQuestionCount: counts['in-progress'],
    remainingQuestionCount: counts.remaining,
    status: statusForCounts({
      active: records.length,
      frozen: counts.frozen,
      readyForQa: counts['ready-for-qa'],
      inProgress: counts['in-progress'],
      remaining: counts.remaining,
    }),
    families,
  };
}

export function getQuestionPreview(question: Question, maxLength = 132): string {
  const normalized = question.question.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

/**
 * Puts a selection back into the order the questions are listed in.
 *
 * A batch's `questionIds` order is not cosmetic — it is the order the review
 * export renders, and the order the exact-ID Practice session runs. Holding the
 * selection in a `Set` made that order depend on which checkbox was clicked
 * first, so two admins picking the same questions produced two different
 * batches. Resolving against the listed questions instead makes the batch a
 * function of *what* was picked and nothing else.
 *
 * Ids absent from `questions` are dropped rather than appended: the only list
 * passed here is one family's questions, and a selection that outlived the
 * family it was made in is not a selection worth keeping.
 */
export function orderQuestionSelection(
  questions: readonly WorkspaceQuestion[],
  selectedIds: Iterable<string>,
): string[] {
  const wanted = new Set(selectedIds);
  return questions.filter((item) => wanted.has(item.question.id)).map((item) => item.question.id);
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

/** Bumped whenever the review Markdown layout changes, so a reviewer can tell. */
export const REVIEW_MARKDOWN_FORMAT = 'AceCSE Review Markdown v2';

export interface ReviewMarkdownOptions {
  /**
   * Classification records used to resolve each question's family. Defaults to
   * the full manifest, and matters because the workspace groups families by
   * `classification.topic` — reading `question.topic` here instead would let
   * the export disagree with the workspace it was generated from.
   */
  classifications?: readonly ClassificationRecord[];
}

function buildClassificationIndex(
  records: readonly ClassificationRecord[],
): Map<string, ClassificationRecord> {
  return new Map(records.map((record) => [record.questionId, record]));
}

/**
 * A Markdown table cell must stay on one line, so internal whitespace is
 * collapsed and pipes escaped. This applies to metadata cells ONLY — the
 * Question, Learner View, and Authoring View sections carry authored text
 * verbatim, line breaks and `**bold**`/`*italic*` markers intact.
 */
function metadataCell(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim().replaceAll('|', '\\|');
  return collapsed === '' ? '—' : collapsed;
}

function renderQuestionMetadata(
  question: Question,
  classification: ClassificationRecord | undefined,
): string {
  const group = question.groupId
    ? question.groupPosition === undefined
      ? question.groupId
      : `${question.groupId} (position ${question.groupPosition})`
    : '—';
  const rows: Array<[string, string]> = [
    ['ID', question.id],
    ['Subject', question.subject],
    ['Exam level', question.examLevel],
    ['Topic / family', classification?.topic ?? question.topic],
    ['Question topic', question.topic],
    ['Subtopic', question.subtopic ?? '—'],
    ['Difficulty', question.difficulty],
    ['Correct option', question.correctOptionId],
    ['Choice count', String(question.choices.length)],
    ['Question type', question.questionType ?? classification?.questionType ?? '—'],
    ['Question format', question.questionFormat ?? classification?.questionFormat ?? '—'],
    ['Task format', question.taskFormat ?? classification?.taskFormat ?? '—'],
    ['Pool', classification?.poolId ?? '—'],
    ['Storage mode', classification?.storageMode ?? '—'],
    ['Group', group],
    ['Tags', question.tags.length > 0 ? question.tags.join(', ') : '—'],
    ['Reference', question.reference ?? '—'],
    ['Source', question.source ?? '—'],
    ['Content version', question.contentVersion === undefined ? '—' : String(question.contentVersion)],
    ['Content status', question.status ?? '—'],
    ['Explanation source', question.structuredExplanation ? 'structured' : 'legacy prose'],
  ];
  return rows.map(([field, value]) => `| ${field} | ${metadataCell(value)} |`).join('\n');
}

export function createReviewMarkdown(
  batch: RefinementBatch,
  questions: readonly Question[],
  options: ReviewMarkdownOptions = {},
): string {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const missing = batch.questionIds.filter((questionId) => !questionById.has(questionId));
  if (missing.length) throw new Error(`Could not export batch: question ${missing[0]} is not in the active production catalog.`);
  const classificationIndex = buildClassificationIndex(options.classifications ?? allClassifications());
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
    const metadata = renderQuestionMetadata(question, classificationIndex.get(questionId));
    return `## ${index + 1}. ${question.id}\n\n### Metadata\n\n| Field | Value |\n|---|---|\n${metadata}\n\n### Question\n\n${question.question}${supportingContent ? `\n\n${supportingContent}` : ''}\n\n### Choices\n\n${choices}\n\n### Correct Answer\n\n**${question.correctOptionId}.** ${correctChoice?.text ?? 'Unavailable'}\n\n### Learner View\n\n${structured}\n\n### Authoring View\n\n${authoring}`;
  }).join('\n\n---\n\n');
  // Deliberately no character count in the header: the count depends on the
  // finished string, so embedding it would be self-referential and never settle.
  const header = [
    `# ${batch.title}`,
    '',
    `- Batch ID: ${batch.id}`,
    `- Family: ${batch.family}`,
    `- Status: ${refinementStatusLabel(batch.status)}`,
    `- Question count: ${batch.questionIds.length}`,
    `- Created: ${batch.createdAt}`,
    `- Question IDs (batch order): ${batch.questionIds.join(', ')}`,
    `- Export format: ${REVIEW_MARKDOWN_FORMAT}`,
  ].join('\n');
  return `${header}\n\n${body}\n`;
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

export type ReviewExportOptions = ReviewMarkdownOptions & BuildExportDocumentOptions;

/**
 * The review Markdown as a countable, chunkable document.
 *
 * Everything downstream — the displayed character count, the chunk boundaries,
 * and each clipboard write — reads `document.text`, so the number shown and the
 * text copied can never drift apart. Throws, rather than omitting a question,
 * when any batch ID is unresolved.
 */
export function createReviewExport(
  batch: RefinementBatch,
  questions: readonly Question[],
  options: ReviewExportOptions = {},
): ExportDocument {
  return buildExportDocument(createReviewMarkdown(batch, questions, options), options);
}

/**
 * The exact production JSON as a countable, chunkable document.
 *
 * Same fail-closed contract as {@link createRawBatchJson}: exact records, exact
 * batch order, no batch metadata injected into any question object.
 */
export function createRawJsonExport(
  batch: RefinementBatch,
  questions: readonly Question[],
  options: BuildExportDocumentOptions = {},
): ExportDocument {
  return buildExportDocument(createRawBatchJson(batch, questions), options);
}

export function workspaceStateLabel(state: WorkspaceQuestionState): string {
  switch (state) {
    case 'frozen':
      return 'Frozen';
    case 'ready-for-qa':
      return 'Ready for QA';
    case 'in-progress':
      return 'In Progress';
    case 'remaining':
      return 'Remaining';
  }
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
