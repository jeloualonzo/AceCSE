#!/usr/bin/env node
/**
 * Question bank validator. Run via `npm run validate:questions`.
 *
 * Fails the build if any question file contains structurally invalid items,
 * duplicate ids, duplicate question text, or malformed choices. Also prints
 * per-subject supply and answer-letter balance so bank growth stays healthy.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

const errors = [];
const ids = new Set();
const normalizedQuestions = new Map();
const subjectCounts = new Map();
const letterCounts = { A: 0, B: 0, C: 0, D: 0 };
let total = 0;

for (const file of readdirSync(questionsDir).filter((f) => f.endsWith('.json')).sort()) {
  const path = join(questionsDir, file);
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

  for (const q of items) {
    total += 1;
    const where = `${file} → ${q?.id ?? '<missing id>'}`;

    if (typeof q.id !== 'string' || !q.id) errors.push(`${where}: missing id`);
    else if (ids.has(q.id)) errors.push(`${where}: duplicate id`);
    else ids.add(q.id);

    if (!VALID_LEVELS.has(q.examLevel)) errors.push(`${where}: bad examLevel "${q.examLevel}"`);
    if (!VALID_SUBJECTS.has(q.subject)) errors.push(`${where}: bad subject "${q.subject}"`);
    if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push(`${where}: bad difficulty "${q.difficulty}"`);
    if (typeof q.topic !== 'string' || !q.topic) errors.push(`${where}: missing topic`);
    if (typeof q.question !== 'string' || q.question.length < 10) errors.push(`${where}: question too short`);
    if (typeof q.explanation !== 'string' || q.explanation.length < 20) errors.push(`${where}: explanation too short`);
    if (!Array.isArray(q.tags)) errors.push(`${where}: tags must be an array`);

    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      errors.push(`${where}: must have exactly 4 choices`);
    } else {
      const choiceIds = q.choices.map((c) => c?.id);
      if (JSON.stringify(choiceIds) !== JSON.stringify(['A', 'B', 'C', 'D'])) {
        errors.push(`${where}: choice ids must be A,B,C,D in order`);
      }
      const texts = q.choices.map((c) => String(c?.text ?? '').trim().toLowerCase());
      if (new Set(texts).size !== 4) errors.push(`${where}: duplicate choice text`);
      if (texts.some((t) => !t)) errors.push(`${where}: empty choice text`);
    }

    if (!VALID_OPTIONS.has(q.correctOptionId)) {
      errors.push(`${where}: bad correctOptionId "${q.correctOptionId}"`);
    } else {
      letterCounts[q.correctOptionId] += 1;
    }

    // Duplicate detection keys on stem + choices: identical stems with
    // different choice sets (e.g. spelling items) are legitimate.
    const choiceKey = Array.isArray(q.choices)
      ? q.choices.map((c) => String(c?.text ?? '').trim().toLowerCase()).join('|')
      : '';
    const normalized =
      String(q.question ?? '').replace(/\s+/g, ' ').trim().toLowerCase() + '::' + choiceKey;
    if (normalized) {
      if (normalizedQuestions.has(normalized)) {
        errors.push(`${where}: duplicate question text (also in ${normalizedQuestions.get(normalized)})`);
      } else {
        normalizedQuestions.set(normalized, where);
      }
    }

    if (VALID_SUBJECTS.has(q.subject)) {
      subjectCounts.set(q.subject, (subjectCounts.get(q.subject) ?? 0) + 1);
    }
  }
}

console.log(`Validated ${total} questions across ${readdirSync(questionsDir).filter((f) => f.endsWith('.json')).length} files.`);
console.log('\nSupply by subject:');
for (const [subject, count] of [...subjectCounts.entries()].sort()) {
  console.log(`  ${subject.padEnd(24)} ${count}`);
}
console.log(`\nAnswer letters: A=${letterCounts.A} B=${letterCounts.B} C=${letterCounts.C} D=${letterCounts.D}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} validation error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('\n✓ Question bank is valid.');
