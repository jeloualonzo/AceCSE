#!/usr/bin/env node
/**
 * Content audit report → reports/content-audit.json
 * Run via `npm run audit:content`. Machine-readable snapshot of the
 * production bank: totals, choice counts, groups, distributions, duplicate
 * checks, and the human-review list.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const questionsDir = join(root, 'content', 'questions');
const groupsDir = join(root, 'content', 'groups');

function* jsonFiles(dir) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* jsonFiles(path);
    else if (entry.endsWith('.json')) yield path;
  }
}

const questions = [];
for (const path of jsonFiles(questionsDir)) questions.push(...JSON.parse(readFileSync(path, 'utf8')));
const groups = [];
if (existsSync(groupsDir)) for (const path of jsonFiles(groupsDir)) groups.push(...JSON.parse(readFileSync(path, 'utf8')));

const count = (arr, key) => {
  const out = {};
  for (const item of arr) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
};

const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const stems = new Map();
let exactDuplicates = 0;
for (const q of questions) {
  const k = norm(q.question) + '::' + q.choices.map((c) => norm(c.text)).join('|');
  if (stems.has(k)) exactDuplicates += 1;
  stems.set(k, q.id);
}

const grouped = new Set(groups.flatMap((g) => g.questionIds));
const review = [];
// review flags: any remaining 4-choice; suspicious short options; missing reference on GI
for (const q of questions) {
  if (q.choices.length !== 5) review.push({ id: q.id, reason: 'not five-choice' });
  if (q.subject === 'General Information' && !q.reference) review.push({ id: q.id, reason: 'missing reference' });
}

const report = {
  generatedAt: new Date().toISOString(),
  totalQuestions: questions.length,
  fiveChoiceQuestions: questions.filter((q) => q.choices.length === 5).length,
  fourChoiceQuestions: questions.filter((q) => q.choices.length === 4).length,
  totalGroups: groups.length,
  multiQuestionGroups: groups.length,
  groupedQuestions: grouped.size,
  singletonQuestions: questions.length - grouped.size,
  groupsBySubject: count(groups, (g) => g.subject),
  groupsByQuestionType: count(groups, (g) => g.questionType ?? 'unspecified'),
  questionsPerSubject: count(questions, (q) => q.subject),
  difficulty: count(questions, (q) => q.difficulty),
  answerDistribution: count(questions, (q) => q.correctOptionId),
  exactDuplicateCount: exactDuplicates,
  questionsNeedingHumanReview: review,
};

mkdirSync(join(root, 'reports'), { recursive: true });
writeFileSync(join(root, 'reports', 'content-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 1));
