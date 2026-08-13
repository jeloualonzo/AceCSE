#!/usr/bin/env node
/**
 * ONE-TIME five-choice migration for the production bank (2026-08-13).
 *
 * Deterministic half of the migration: takes agent-authored fifth
 * distractors (id → { text, explanation }) and rewrites every production
 * question to five choices, WITHOUT touching ids, stems, correct-answer
 * texts, explanations, steps, tips, or references.
 *
 * Placement classes (in priority order):
 *  1. FROZEN — the question's prose references option letters ("option B…"):
 *     existing A–D positions must not move; the new distractor is appended
 *     as E; the correct letter is unchanged.
 *  2. SORTED — all option texts parse as numbers in monotonic order (house
 *     style for numeric sets): the new value is inserted in sort position;
 *     the correct letter lands wherever its value falls.
 *  3. FREE — everything else: the correct answer is placed at a target
 *     letter drawn from a seeded, quota-balanced plan so the whole bank
 *     approaches ~20% per letter, with E genuinely represented.
 *
 * distractorExplanations are remapped by option TEXT, never by old letter.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const questionsDir = join(root, 'content', 'questions');

const FIFTH = {};
for (const name of ['verbal', 'numerical', 'analytical', 'clerical', 'gi']) {
  for (const entry of JSON.parse(readFileSync(`/tmp/fifth-${name}.json`, 'utf8'))) {
    if (FIFTH[entry.id]) throw new Error(`duplicate fifth entry ${entry.id}`);
    FIFTH[entry.id] = entry;
  }
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function seededRandom(seed) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let v = state;
    v = Math.imul(v ^ (v >>> 15), v | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

const parseNum = (t) => {
  const m = String(t).replace(/[,₱%\s]/g, '').match(/^-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

function hasLetterRefs(q) {
  const texts = [q.explanation, ...(q.steps ?? []), ...Object.values(q.distractorExplanations ?? {}), q.tip?.text]
    .filter(Boolean)
    .join(' ');
  return /\b(option|choice|letter)\s+[A-E]\b/i.test(texts);
}

function isSortedNumeric(q) {
  const vals = q.choices.map((c) => parseNum(c.text));
  if (!vals.every((v) => v !== null)) return null;
  // STRICT monotonicity only: ties (e.g. "2 hours" vs "2 hours 24 minutes")
  // mean the leading number does not represent the option — treat as FREE.
  const asc = vals.every((v, i) => i === 0 || v > vals[i - 1]);
  const desc = vals.every((v, i) => i === 0 || v < vals[i - 1]);
  return asc ? 'asc' : desc ? 'desc' : null;
}

// ---- Pass 1: load everything, classify ------------------------------------
const files = [];
for (const dir of readdirSync(questionsDir)) {
  for (const f of readdirSync(join(questionsDir, dir))) {
    if (f.endsWith('.json')) files.push(join(questionsDir, dir, f));
  }
}
files.sort();

const docs = files.map((path) => ({ path, items: JSON.parse(readFileSync(path, 'utf8')) }));
const all = docs.flatMap((d) => d.items);
if (all.length !== Object.keys(FIFTH).length) {
  throw new Error(`bank ${all.length} vs fifth entries ${Object.keys(FIFTH).length}`);
}

const classified = all.map((q) => {
  if (!FIFTH[q.id]) throw new Error(`no fifth distractor for ${q.id}`);
  if (q.choices.length !== 4) throw new Error(`${q.id} not 4-choice`);
  if (hasLetterRefs(q)) return { q, cls: 'frozen' };
  const sort = isSortedNumeric(q);
  if (sort) return { q, cls: 'sorted', sort };
  return { q, cls: 'free' };
});

// ---- Pass 2: compute forced letters, then quota plan for FREE --------------
const rng = seededRandom('acecse-five-choice-2026-08-13');
const finalLetterOf = new Map();

for (const c of classified) {
  if (c.cls === 'frozen') {
    finalLetterOf.set(c.q.id, c.q.correctOptionId);
  } else if (c.cls === 'sorted') {
    const vals = c.q.choices.map((x) => parseNum(x.text));
    const newVal = parseNum(FIFTH[c.q.id].text);
    if (newVal === null) throw new Error(`${c.q.id}: sorted set but new distractor not numeric: ${FIFTH[c.q.id].text}`);
    const merged = [...vals, newVal].sort((a, b) => (c.sort === 'asc' ? a - b : b - a));
    const correctVal = parseNum(c.q.choices.find((x) => x.id === c.q.correctOptionId).text);
    finalLetterOf.set(c.q.id, LETTERS[merged.indexOf(correctVal)]);
  }
}

const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
for (const letter of finalLetterOf.values()) counts[letter] += 1;

const freeItems = classified.filter((c) => c.cls === 'free');
// quota: bring every letter as close to total/5 as possible using FREE items
const total = all.length;
const targetPer = total / 5;
const deficits = LETTERS.map((L) => ({ L, need: Math.max(0, targetPer - counts[L]) }));
const needSum = deficits.reduce((s, d) => s + d.need, 0);
const plan = [];
for (const d of deficits) {
  plan.push(...Array(Math.round((d.need / needSum) * freeItems.length)).fill(d.L));
}
while (plan.length < freeItems.length) plan.push('E');
plan.length = freeItems.length;
// seeded shuffle of the plan
for (let i = plan.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [plan[i], plan[j]] = [plan[j], plan[i]];
}
freeItems.forEach((c, i) => finalLetterOf.set(c.q.id, plan[i]));

// ---- Pass 3: rewrite every question -----------------------------------------
let migrated = 0;
for (const { q, cls, sort } of classified) {
  const fifth = FIFTH[q.id];
  const correctText = q.choices.find((c) => c.id === q.correctOptionId).text;
  const explByText = new Map();
  for (const [letter, note] of Object.entries(q.distractorExplanations ?? {})) {
    const choice = q.choices.find((c) => c.id === letter);
    if (!choice) throw new Error(`${q.id}: distractor note for missing option ${letter}`);
    explByText.set(choice.text, note);
  }
  explByText.set(fifth.text, fifth.explanation);

  let orderedTexts;
  if (cls === 'frozen') {
    orderedTexts = [...q.choices.map((c) => c.text), fifth.text];
  } else if (cls === 'sorted') {
    orderedTexts = [...q.choices.map((c) => c.text), fifth.text].sort((a, b) =>
      sort === 'asc' ? parseNum(a) - parseNum(b) : parseNum(b) - parseNum(a)
    );
  } else {
    const target = finalLetterOf.get(q.id);
    const distractors = [...q.choices.filter((c) => c.id !== q.correctOptionId).map((c) => c.text), fifth.text];
    orderedTexts = [];
    let d = 0;
    for (let i = 0; i < 5; i++) {
      if (LETTERS[i] === target) orderedTexts.push(correctText);
      else orderedTexts.push(distractors[d++]);
    }
  }

  if (new Set(orderedTexts.map((t) => t.trim().toLowerCase())).size !== 5) {
    throw new Error(`${q.id}: duplicate option text after inserting "${fifth.text}"`);
  }

  q.choices = orderedTexts.map((text, i) => ({ id: LETTERS[i], text }));
  q.correctOptionId = LETTERS[orderedTexts.indexOf(correctText)];
  if (q.correctOptionId !== finalLetterOf.get(q.id)) {
    throw new Error(`${q.id}: letter plan mismatch`);
  }
  const newNotes = {};
  for (const choice of q.choices) {
    if (choice.id === q.correctOptionId) continue;
    const note = explByText.get(choice.text);
    if (!note) throw new Error(`${q.id}: missing distractor note for "${choice.text}"`);
    newNotes[choice.id] = note;
  }
  q.distractorExplanations = newNotes;
  migrated += 1;
}

for (const d of docs) writeFileSync(d.path, JSON.stringify(d.items, null, 2) + '\n');

const finalCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
for (const q of all) finalCounts[q.correctOptionId] += 1;
console.log(JSON.stringify({
  migrated,
  classes: {
    frozen: classified.filter((c) => c.cls === 'frozen').length,
    sorted: classified.filter((c) => c.cls === 'sorted').length,
    free: freeItems.length,
  },
  finalCounts,
}, null, 1));
