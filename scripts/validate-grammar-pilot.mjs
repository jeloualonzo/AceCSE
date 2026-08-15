import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const pilotIds = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'];
const pilotSet = new Set(pilotIds);
const expectedNotes = {
  'verb-0059': 'Treat the collective noun panel as a single unit.',
  'verb-0061': "Apply the formal-edited-English convention: use 'the reason ... is that' rather than 'the reason ... is because'.",
};
const expectedAnswers = {
  'verb-0059': 'C',
  'verb-0060': 'C',
  'verb-0061': 'B',
  'verb-0062': 'B',
};
const forbidden = /AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|authored task/i;
const forbiddenPayloadKeys = new Set(['question', 'prompt', 'stem', 'itemPrompt', 'sourcePrompt']);

const questions = [];
for (const dir of fs.readdirSync(path.join(root, 'content/questions'))) {
  const subjectDir = path.join(root, 'content/questions', dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    questions.push(...readJson(path.join('content/questions', dir, file)));
  }
}
const byId = new Map(questions.map((question) => [question.id, question]));
const taxonomy = readJson('content/taxonomy/taxonomy.json');
const manifest = readJson('content/taxonomy/classification-manifest.json');
const pool = readJson('content/taxonomy/pools/verbal-grammar-usage.json');
const manifestById = new Map(manifest.questions.map((row) => [row.questionId, row]));
const task = taxonomy.sharedTaskDefinitions?.grammar_sentence_correction_pilot;

const compactGrammarIds = questions
  .filter((question) => question.taskFormat === 'shared_grammar_sentence_correction')
  .map((question) => question.id);
if (compactGrammarIds.length !== pilotIds.length || compactGrammarIds.some((id) => !pilotSet.has(id))) {
  fail(`shared Grammar taskFormat must be assigned to exactly ${pilotIds.length} pilot IDs, got ${compactGrammarIds.join(', ') || 'none'}`);
}
if (!task || task.taskFormat !== 'shared_grammar_sentence_correction') fail('grammar_sentence_correction_pilot shared task definition is missing or misconfigured');
if (task.title !== 'Grammar & Usage — Sentence Correction') fail('Grammar pilot shared task title is incorrect');
if (task.directions !== 'Choose the sentence that is grammatically correct in formal edited English.') fail('Grammar pilot shared directions are missing or changed');
if (task.answerStructure !== 'sentence_selection' || task.register !== 'formal_edited_english') fail('Grammar pilot answer structure/register contract is incomplete');
if (!Array.isArray(task.instanceFormats) || !task.instanceFormats.includes('compact')) fail('Grammar pilot task must declare compact instances');
if (forbidden.test(JSON.stringify(task))) fail('Grammar pilot shared task contains forbidden app or generation language');

const poolIds = pool.entries.map((entry) => entry.questionId);
if (pool.poolId !== 'verbal-grammar-usage' || !pool.taskFormats.includes('shared_grammar_sentence_correction')) fail('Grammar pilot must remain in the canonical verbal-grammar-usage pool');
if (pilotIds.some((id) => !poolIds.includes(id))) fail('The canonical verbal Grammar pool is missing a pilot ID');
for (const id of pilotIds) {
  const entry = pool.entries.find((candidate) => candidate.questionId === id);
  if (!entry || entry.taskFormat !== 'shared_grammar_sentence_correction') fail(`${id}: pool index taskFormat is not the shared Grammar format`);
  const row = manifestById.get(id);
  if (!row || row.poolId !== 'verbal-grammar-usage' || row.storageMode !== 'pool' || row.taskFormat !== 'shared_grammar_sentence_correction') fail(`${id}: canonical manifest classification is incomplete`);
}

for (const id of pilotIds) {
  const question = byId.get(id);
  if (!question) {
    fail(`${id}: source question is missing`);
    continue;
  }
  if (question.subject !== 'Verbal Ability' || question.topic !== 'Grammar & Usage' || question.subtopic !== 'Sentence Correction') fail(`${id}: source taxonomy changed outside the pilot contract`);
  if (question.taskFormat !== 'shared_grammar_sentence_correction') fail(`${id}: source taskFormat is missing`);
  if (question.taskInstance?.kind !== 'grammar') fail(`${id}: compact Grammar taskInstance kind is missing`);
  const payload = question.taskInstance?.payload;
  if (!payload || payload.taskDefinitionId !== 'grammar_sentence_correction_pilot' || payload.instanceFormat !== 'compact') fail(`${id}: compact task payload definition/format is incomplete`);
  if (payload.answerStructure !== 'sentence_selection' || payload.migrationStatus !== 'safe_compact_conversion' || payload.sourcePromptPreserved !== true) fail(`${id}: compact task payload contract is incomplete`);
  for (const key of Object.keys(payload)) {
    if (forbiddenPayloadKeys.has(key)) fail(`${id}: compact payload repeats a long source prompt through '${key}'`);
  }
  if (JSON.stringify(payload).includes(question.question)) fail(`${id}: compact payload repeats the full source stem`);
  if (id in expectedNotes) {
    if (payload.itemNote !== expectedNotes[id]) fail(`${id}: required per-item qualifier is missing or changed`);
  } else if (Object.hasOwn(payload, 'itemNote')) {
    fail(`${id}: no itemNote is allowed for this pilot item`);
  }
  if (question.choices.length !== 5 || JSON.stringify(question.choices.map((choice) => choice.id)) !== JSON.stringify(['A', 'B', 'C', 'D', 'E'])) fail(`${id}: pilot must retain exactly five A–E choices`);
  if (question.correctOptionId !== expectedAnswers[id]) fail(`${id}: corrected answer key changed`);
  if (forbidden.test(JSON.stringify({ question: question.question, choices: question.choices, explanation: question.explanation, reference: question.reference, taskInstance: question.taskInstance }))) fail(`${id}: user-visible pilot content contains forbidden app or generation language`);
}

const nonPilotGrammar = questions.filter((question) => question.topic === 'Grammar & Usage' && !pilotSet.has(question.id));
if (nonPilotGrammar.some((question) => question.taskFormat === 'shared_grammar_sentence_correction' || question.taskInstance?.payload?.taskDefinitionId === 'grammar_sentence_correction_pilot')) fail('A non-pilot Grammar question was migrated into the pilot task');

if (process.exitCode) process.exit();
console.log('Validated Grammar pilot: exactly four canonical pool items, compact payloads, formal-edited shared directions, required qualifiers, five-choice preservation, no repeated compact stem, and no non-pilot migration.');
