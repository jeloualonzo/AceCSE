#!/usr/bin/env node
/**
 * Question bank validator with premium-content quality gates.
 * Run via `npm run validate:questions`.
 *
 * Structural gates (always fatal):
 *   valid JSON, unique ids, unique stem+choices, 4 or 5 in-order choices
 *   (legacy bank = 4; NEW authored content should use 5 — never invent a
 *   fake fifth option for legacy questions),
 *   valid enums, non-empty fields.
 *
 * Teaching-quality gates (fatal — every production question must teach):
 *   - explanation is real teaching prose (≥ 100 chars)
 *   - worked steps (≥ 2) for computational items (Numerical; non-analogy Analytical)
 *   - distractor explanations for all three incorrect options (≥ 20 chars), except
 *     the eleven frozen Number Series records, three canonical Age Problems records,
 *     twelve canonical Spelling records, twenty-four canonical Filing records, four
 *     canonical Grammar records, thirteen canonical Clerical Operations records, and six
 *     canonical Averages records whose obsolete fields were removed (all approved records
 *     use structured-only content)
 *   - a labeled tip ("Exam Tip", "Common Mistake", …), except the twelve canonical
 *     Spelling records, three canonical Age Problems records, twenty-four canonical
 *     Filing records, four canonical Grammar records, thirteen canonical Clerical
 *     Operations records, six canonical Averages records, and eleven canonical Number
 *     Series records that use structuredExplanation as their sole aid
 *
 * Also prints supply, difficulty, and answer-letter reports.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const questionsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'questions');

const VALID_LEVELS = new Set(['Professional', 'Subprofessional', 'Both']);
const VALID_SUBJECTS = new Set([
  'Numerical Reasoning',
  'Verbal Ability',
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
]);
const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const VALID_OPTIONS = ['A', 'B', 'C', 'D', 'E'];
const VALID_OPTION_SET = new Set(VALID_OPTIONS);
const MIN_CHOICES = 4;
const MAX_CHOICES = 5;
const CANONICAL_NUMBER_SERIES_FILE = 'numerical/number-series.json';
const CANONICAL_NUMBER_SERIES_IDS = new Set([
  'num-0019', 'num-0020', 'num-0021', 'num-0022', 'num-0023', 'num-0024',
  'num-0025', 'num-0026', 'num-0108', 'num-0137', 'num-0147',
]);
const CANONICAL_STRUCTURED_NUMBER_SERIES_IDS = new Set([
  'num-0019', 'num-0020', 'num-0021', 'num-0022', 'num-0023', 'num-0024',
  'num-0025', 'num-0026', 'num-0108', 'num-0137', 'num-0147',
]);
const CANONICAL_STRUCTURED_AGE_PROBLEMS_FILES = new Set([
  'numerical/core.json',
  'numerical/2026-08-07-0100-web-export-w2.json',
]);
const CANONICAL_STRUCTURED_AGE_PROBLEMS_IDS = new Set(['num-0030', 'num-0031', 'num-0142']);
const CANONICAL_STRUCTURED_AVERAGES_FILES = new Set([
  'numerical/core.json',
  'numerical/2026-08-07-0100-web-export-w2.json',
]);
const CANONICAL_STRUCTURED_AVERAGES_IDS = new Set(['num-0046', 'num-0047', 'num-0049', 'num-0145', 'num-0146', 'seed-num-005']);
const CANONICAL_SPELLING_FILE = 'clerical/spelling.json';
const CANONICAL_SPELLING_IDS = new Set([
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
]);
const CANONICAL_FILING_FILE = 'clerical/filing.json';
const CANONICAL_FILING_IDS = new Set([
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
]);
const CANONICAL_GRAMMAR_FILE = 'verbal/core.json';
const CANONICAL_GRAMMAR_IDS = new Set([
  'verb-0059', 'verb-0060', 'verb-0061', 'verb-0062',
]);
const CANONICAL_CLERICAL_OPERATIONS_FILES = new Set([
  'clerical/core.json',
  'clerical/2026-08-06-2300-gemini-draft-import.json',
]);
const CANONICAL_CLERICAL_OPERATIONS_IDS = new Set([
  'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
  'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
  'cler-0051', 'cler-0057', 'seed-cler-003',
]);

/**
 * Directory convention (mirrors src/data/questionShape.ts): every dataset file
 * lives under content/questions/<dir>/ and every question in it must carry
 * the subject that directory maps to. The runtime lazy-loader depends on this
 * to fetch only the subjects a session needs.
 */
const SUBJECT_BY_DIR = {
  numerical: 'Numerical Reasoning',
  analytical: 'Analytical Reasoning',
  verbal: 'Verbal Ability',
  clerical: 'Clerical Ability',
  'general-information': 'General Information',
};

function* jsonFiles(dir) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* jsonFiles(path);
    else if (entry.endsWith('.json')) yield path;
  }
}

function needsSteps(q) {
  if (q.subject === 'Numerical Reasoning') return true;
  if (q.subject === 'Analytical Reasoning' && !/analog/i.test(q.topic ?? '')) return true;
  return false;
}

const errors = [];
const ids = new Set();
const normalizedQuestions = new Map();
const questionsById = new Map();
const subjectCounts = new Map();
const difficultyCounts = new Map();
const letterCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
let total = 0;
let fileCount = 0;

for (const path of jsonFiles(questionsDir)) {
  fileCount += 1;
  const file = relative(questionsDir, path).replaceAll('\\', '/');

  let items;
  try {
    items = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${file}: invalid JSON — ${error.message}`);
    continue;
  }
  if (!Array.isArray(items)) {
    errors.push(`${file}: root must be an array`);
    continue;
  }

  // ---- directory-convention gates ----------------------------------------
  const topDir = file.split(/[\\/]/)[0];
  const dirSubject = SUBJECT_BY_DIR[topDir];
  if (!dirSubject) {
    errors.push(
      `${file}: dataset files must live under content/questions/<subject>/ ` +
        `(one of: ${Object.keys(SUBJECT_BY_DIR).join(', ')})`
    );
  }

  for (const q of items) {
    total += 1;
    const where = `${file} → ${q?.id ?? '<missing id>'}`;
    if (q && typeof q.id === 'string' && q.id) questionsById.set(q.id, q);

    // ---- structural gates ------------------------------------------------
    if (typeof q.id !== 'string' || !q.id) errors.push(`${where}: missing id`);
    else if (ids.has(q.id)) errors.push(`${where}: duplicate id`);
    else ids.add(q.id);

    if (!VALID_LEVELS.has(q.examLevel)) errors.push(`${where}: bad examLevel "${q.examLevel}"`);
    if (!VALID_SUBJECTS.has(q.subject)) errors.push(`${where}: bad subject "${q.subject}"`);
    else if (dirSubject && q.subject !== dirSubject)
      errors.push(`${where}: subject "${q.subject}" does not match its directory (${topDir}/ ⇒ ${dirSubject})`);
    if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push(`${where}: bad difficulty "${q.difficulty}"`);
    if (typeof q.topic !== 'string' || !q.topic) errors.push(`${where}: missing topic`);
    if (q.subtopic !== undefined && (typeof q.subtopic !== 'string' || !q.subtopic))
      errors.push(`${where}: subtopic must be a non-empty string when present`);
    if (typeof q.question !== 'string' || q.question.length < 10) errors.push(`${where}: question too short`);
    if (!Array.isArray(q.tags)) errors.push(`${where}: tags must be an array`);

    if (!Array.isArray(q.choices) || q.choices.length < MIN_CHOICES || q.choices.length > MAX_CHOICES) {
      errors.push(`${where}: must have ${MIN_CHOICES} or ${MAX_CHOICES} choices`);
    } else {
      const choiceIds = q.choices.map((c) => c?.id);
      const expected = VALID_OPTIONS.slice(0, q.choices.length);
      if (JSON.stringify(choiceIds) !== JSON.stringify(expected)) {
        errors.push(`${where}: choice ids must be ${expected.join(',')} in order (contiguous, no missing middle options)`);
      }
      const texts = q.choices.map((c) => String(c?.text ?? '').trim().toLowerCase());
      if (new Set(texts).size !== q.choices.length) errors.push(`${where}: duplicate choice text`);
      if (texts.some((t) => !t)) errors.push(`${where}: empty choice text`);
    }

    const ownChoiceIds = Array.isArray(q.choices) ? q.choices.map((c) => c?.id) : [];
    if (!VALID_OPTION_SET.has(q.correctOptionId) || !ownChoiceIds.includes(q.correctOptionId)) {
      errors.push(`${where}: correctOptionId "${q.correctOptionId}" must be one of this question's choices`);
    } else {
      letterCounts[q.correctOptionId] += 1;
    }

    // ---- teaching-quality gates -------------------------------------------
    const canonicalStructuredSpelling = file === CANONICAL_SPELLING_FILE && CANONICAL_SPELLING_IDS.has(q.id);
    const canonicalStructuredFiling = file === CANONICAL_FILING_FILE && CANONICAL_FILING_IDS.has(q.id);
    const canonicalStructuredGrammar = file === CANONICAL_GRAMMAR_FILE && CANONICAL_GRAMMAR_IDS.has(q.id);
    const canonicalStructuredClericalOperations = CANONICAL_CLERICAL_OPERATIONS_FILES.has(file) && CANONICAL_CLERICAL_OPERATIONS_IDS.has(q.id);
    const canonicalStructuredNumberSeries = file === CANONICAL_NUMBER_SERIES_FILE && CANONICAL_STRUCTURED_NUMBER_SERIES_IDS.has(q.id);
    const canonicalStructuredAgeProblems = CANONICAL_STRUCTURED_AGE_PROBLEMS_FILES.has(file) && CANONICAL_STRUCTURED_AGE_PROBLEMS_IDS.has(q.id);
    const canonicalStructuredAverages = CANONICAL_STRUCTURED_AVERAGES_FILES.has(file) && CANONICAL_STRUCTURED_AVERAGES_IDS.has(q.id);
    const canonicalStructured = canonicalStructuredSpelling || canonicalStructuredFiling || canonicalStructuredGrammar || canonicalStructuredClericalOperations || canonicalStructuredNumberSeries || canonicalStructuredAgeProblems || canonicalStructuredAverages;
    if (!canonicalStructured && (typeof q.explanation !== 'string' || q.explanation.length < 100)) {
      errors.push(`${where}: explanation must teach (≥ 100 chars), got ${q.explanation?.length ?? 0}`);
    }

    if (needsSteps(q) && !canonicalStructuredNumberSeries && !canonicalStructuredAgeProblems && !canonicalStructuredAverages) {
      if (!Array.isArray(q.steps) || q.steps.length < 2) {
        errors.push(`${where}: computational item requires a worked solution (steps ≥ 2)`);
      }
    }
    if (q.steps !== undefined) {
      if (!Array.isArray(q.steps) || q.steps.some((s) => typeof s !== 'string' || s.length < 3)) {
        errors.push(`${where}: steps must be non-empty strings`);
      }
    }

    const wrongOptions = (Array.isArray(q.choices) ? q.choices.map((c) => c?.id) : [])
      .filter((o) => VALID_OPTION_SET.has(o) && o !== q.correctOptionId);
    const distractors = q.distractorExplanations;
    const canonicalNumberSeries = file === CANONICAL_NUMBER_SERIES_FILE && CANONICAL_NUMBER_SERIES_IDS.has(q.id);
    if (typeof distractors !== 'object' || distractors === null) {
      if (!canonicalNumberSeries && !canonicalStructured) errors.push(`${where}: missing distractorExplanations`);

    } else {
      for (const option of wrongOptions) {
        const note = distractors[option];
        if (typeof note !== 'string' || note.length < 20) {
          errors.push(`${where}: distractor ${option} needs a real misconception note (≥ 20 chars)`);
        }
      }
      if (distractors[q.correctOptionId] !== undefined) {
        errors.push(`${where}: distractorExplanations must not include the correct option`);
      }
      for (const key of Object.keys(distractors)) {
        if (!ownChoiceIds.includes(key)) {
          errors.push(`${where}: distractorExplanations references option "${key}" which is not one of this question's choices`);
        }
      }
    }

    if (!canonicalStructured && (
      typeof q.tip !== 'object' ||
      q.tip === null ||
      typeof q.tip.label !== 'string' ||
      !q.tip.label ||
      typeof q.tip.text !== 'string' ||
      q.tip.text.length < 10
    )) {
      errors.push(`${where}: missing tip ({ label, text }) — every question needs a retention aid`);
    }

    // ---- duplicate stems (keyed on stem + choices) -------------------------
    const choiceKey = Array.isArray(q.choices)
      ? q.choices.map((c) => String(c?.text ?? '').trim().toLowerCase()).join('|')
      : '';
    const normalized =
      String(q.question ?? '').replace(/\s+/g, ' ').trim().toLowerCase() + '::' + choiceKey;
    if (normalized.length > 2) {
      if (normalizedQuestions.has(normalized)) {
        errors.push(`${where}: duplicate question (also in ${normalizedQuestions.get(normalized)})`);
      } else {
        normalizedQuestions.set(normalized, where);
      }
    }

    if (VALID_SUBJECTS.has(q.subject)) {
      subjectCounts.set(q.subject, (subjectCounts.get(q.subject) ?? 0) + 1);
    }
    if (VALID_DIFFICULTIES.has(q.difficulty)) {
      difficultyCounts.set(q.difficulty, (difficultyCounts.get(q.difficulty) ?? 0) + 1);
    }
  }
}

// ---- optional explicit groups ---------------------------------------------
// Group metadata is additive: the current bank has none, so this directory is
// intentionally optional during the migration foundation phase.
const groupsDir = join(dirname(questionsDir), 'groups');
const groupIds = new Set();
const groupedMembers = new Set();
let groupCount = 0;
if (existsSync(groupsDir)) {
  for (const path of jsonFiles(groupsDir)) {
    const file = relative(groupsDir, path);
    let groups;
    try {
      groups = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      errors.push(`groups/${file}: invalid JSON — ${error.message}`);
      continue;
    }
    if (!Array.isArray(groups)) groups = [groups];
    for (const group of groups) {
      const where = `groups/${file} → ${group?.id ?? '<missing id>'}`;
      if (!group || typeof group !== 'object') {
        errors.push(`${where}: group must be an object`);
        continue;
      }
      if (typeof group.id !== 'string' || !group.id) errors.push(`${where}: missing id`);
      else if (groupIds.has(group.id)) errors.push(`${where}: duplicate group id`);
      else groupIds.add(group.id);
      if (!VALID_LEVELS.has(group.examLevel)) errors.push(`${where}: bad examLevel "${group.examLevel}"`);
      if (!VALID_SUBJECTS.has(group.subject)) errors.push(`${where}: bad subject "${group.subject}"`);
      if (typeof group.topic !== 'string' || !group.topic) errors.push(`${where}: missing topic`);
      groupCount += 1;
      if (!Array.isArray(group.questionIds) || group.questionIds.length < 2) {
        errors.push(`${where}: a group needs at least 2 member questions`);
      } else {
        if (new Set(group.questionIds).size !== group.questionIds.length) errors.push(`${where}: duplicate question id`);
        for (const questionId of group.questionIds) {
          if (!questionsById.has(questionId)) errors.push(`${where}: missing referenced question "${questionId}"`);
          if (groupedMembers.has(questionId)) errors.push(`${where}: question ${questionId} belongs to more than one group`);
          groupedMembers.add(questionId);
        }
      }
      if (typeof group.directions !== 'string' || group.directions.length < 20) {
        errors.push(`${where}: a group must carry real shared directions (≥ 20 chars)`);
      }
      if (!['atomic', 'splittable'].includes(group.selectionPolicy)) errors.push(`${where}: bad selectionPolicy`);
      if (!['fixed', 'shuffle-questions'].includes(group.orderPolicy)) errors.push(`${where}: bad orderPolicy`);
      if (!Array.isArray(group.tags)) errors.push(`${where}: tags must be an array`);
      if (group.contentBlocks !== undefined && !Array.isArray(group.contentBlocks)) errors.push(`${where}: contentBlocks must be an array`);
      for (const block of group.contentBlocks ?? []) {
        if (!block || typeof block !== 'object' || typeof block.id !== 'string' || typeof block.kind !== 'string') {
          errors.push(`${where}: invalid content block`);
        }
      }
      for (const questionId of group.questionIds ?? []) {
        const question = questionsById.get(questionId);
        if (!question) continue;
        if (question.examLevel !== 'Both' && group.examLevel !== 'Both' && question.examLevel !== group.examLevel) errors.push(`${where}: exam level does not match ${question.id}`);
        if (question.subject !== group.subject) errors.push(`${where}: subject does not match ${question.id}`);
        if (question.groupId && question.groupId !== group.id) errors.push(`${where}: question ${question.id} points to group ${question.groupId}`);
      }
    }
  }
}

console.log(`Validated ${total} questions across ${fileCount} files.`);
console.log('\nSupply by subject:');
for (const [subject, count] of [...subjectCounts.entries()].sort()) {
  console.log(`  ${subject.padEnd(24)} ${count}`);
}
console.log('\nDifficulty:');
for (const level of ['Easy', 'Medium', 'Hard']) {
  console.log(`  ${level.padEnd(8)} ${difficultyCounts.get(level) ?? 0}`);
}
console.log(`\nGroups: ${groupCount} explicit item sets covering ${groupedMembers.size} questions (${total - groupedMembers.size} singleton questions)`);
console.log(`\nAnswer letters: A=${letterCounts.A} B=${letterCounts.B} C=${letterCounts.C} D=${letterCounts.D} E=${letterCounts.E}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} validation error(s):`);
  for (const error of errors.slice(0, 50)) console.error(`  - ${error}`);
  if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
  process.exit(1);
}
console.log('\n✓ Question bank passes all structural and teaching-quality gates.');
