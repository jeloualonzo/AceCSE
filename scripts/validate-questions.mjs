#!/usr/bin/env node
/**
 * Question bank validator with premium-content quality gates.
 * Run via `npm run validate:questions`.
 *
 * Structural gates (always fatal):
 *   valid JSON, unique ids, unique stem+choices, exactly 4 in-order choices,
 *   valid enums, non-empty fields.
 *
 * Teaching-quality gates (fatal — every production question must teach):
 *   - explanation is real teaching prose (≥ 100 chars)
 *   - worked steps (≥ 2) for computational items (Numerical; non-analogy Analytical)
 *   - distractor explanations for all three incorrect options (≥ 20 chars each)
 *   - a labeled tip ("Exam Tip", "Common Mistake", …)
 *
 * Also prints supply, difficulty, and answer-letter reports.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
const VALID_OPTIONS = ['A', 'B', 'C', 'D'];
const VALID_OPTION_SET = new Set(VALID_OPTIONS);

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
const subjectCounts = new Map();
const difficultyCounts = new Map();
const letterCounts = { A: 0, B: 0, C: 0, D: 0 };
let total = 0;
let fileCount = 0;

for (const path of jsonFiles(questionsDir)) {
  fileCount += 1;
  const file = relative(questionsDir, path);
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

    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      errors.push(`${where}: must have exactly 4 choices`);
    } else {
      const choiceIds = q.choices.map((c) => c?.id);
      if (JSON.stringify(choiceIds) !== JSON.stringify(VALID_OPTIONS)) {
        errors.push(`${where}: choice ids must be A,B,C,D in order`);
      }
      const texts = q.choices.map((c) => String(c?.text ?? '').trim().toLowerCase());
      if (new Set(texts).size !== 4) errors.push(`${where}: duplicate choice text`);
      if (texts.some((t) => !t)) errors.push(`${where}: empty choice text`);
    }

    if (!VALID_OPTION_SET.has(q.correctOptionId)) {
      errors.push(`${where}: bad correctOptionId "${q.correctOptionId}"`);
    } else {
      letterCounts[q.correctOptionId] += 1;
    }

    // ---- teaching-quality gates -------------------------------------------
    if (typeof q.explanation !== 'string' || q.explanation.length < 100) {
      errors.push(`${where}: explanation must teach (≥ 100 chars), got ${q.explanation?.length ?? 0}`);
    }

    if (needsSteps(q)) {
      if (!Array.isArray(q.steps) || q.steps.length < 2) {
        errors.push(`${where}: computational item requires a worked solution (steps ≥ 2)`);
      }
    }
    if (q.steps !== undefined) {
      if (!Array.isArray(q.steps) || q.steps.some((s) => typeof s !== 'string' || s.length < 3)) {
        errors.push(`${where}: steps must be non-empty strings`);
      }
    }

    const wrongOptions = VALID_OPTIONS.filter((o) => o !== q.correctOptionId);
    const distractors = q.distractorExplanations;
    if (typeof distractors !== 'object' || distractors === null) {
      errors.push(`${where}: missing distractorExplanations`);
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
    }

    if (
      typeof q.tip !== 'object' ||
      q.tip === null ||
      typeof q.tip.label !== 'string' ||
      !q.tip.label ||
      typeof q.tip.text !== 'string' ||
      q.tip.text.length < 10
    ) {
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

console.log(`Validated ${total} questions across ${fileCount} files.`);
console.log('\nSupply by subject:');
for (const [subject, count] of [...subjectCounts.entries()].sort()) {
  console.log(`  ${subject.padEnd(24)} ${count}`);
}
console.log('\nDifficulty:');
for (const level of ['Easy', 'Medium', 'Hard']) {
  console.log(`  ${level.padEnd(8)} ${difficultyCounts.get(level) ?? 0}`);
}
console.log(`\nAnswer letters: A=${letterCounts.A} B=${letterCounts.B} C=${letterCounts.C} D=${letterCounts.D}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} validation error(s):`);
  for (const error of errors.slice(0, 50)) console.error(`  - ${error}`);
  if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
  process.exit(1);
}
console.log('\n✓ Question bank passes all structural and teaching-quality gates.');
