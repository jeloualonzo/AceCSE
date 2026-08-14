import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const questions = [];
for (const dir of fs.readdirSync(path.join(root, 'content/questions'))) {
  const subjectDir = path.join(root, 'content/questions', dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    questions.push(...readJson(path.join(subjectDir, file)));
  }
}
const filing = questions.filter((q) => q.topic === 'Filing & Alphabetizing');
const taxonomy = readJson(path.join(root, 'content/taxonomy/taxonomy.json'));
const manifest = readJson(path.join(root, 'content/taxonomy/classification-manifest.json'));
const filingManifest = new Map(manifest.questions.filter((row) => row.topic === 'Filing & Alphabetizing').map((row) => [row.questionId, row]));
const task = taxonomy.sharedTaskDefinitions?.filing_default;
const compact = filing.filter((q) => q.taskInstance?.kind === 'filing' && q.taskInstance.payload?.instanceFormat === 'compact');
const legacy = filing.filter((q) => q.taskInstance?.kind === 'filing' && q.taskInstance.payload?.instanceFormat === 'legacy_full_prompt');

if (filing.length !== 26) fail(`expected 26 Filing questions, got ${filing.length}`);
if (compact.length !== 11) fail(`expected 11 compact Filing instances, got ${compact.length}`);
if (legacy.length !== 15) fail(`expected 15 legacy Filing instances, got ${legacy.length}`);
if (!task || task.title !== 'Filing and Alphabetizing') fail('filing_default task definition is missing or has the wrong title');
if (!Array.isArray(task.rules) || task.rules.length < 3) fail('filing_default must include reusable rules');
if (!Array.isArray(task.examples) || task.examples.length < 2) fail('filing_default must include reusable examples');
if (!Array.isArray(task.supportedEntityTypes) || !task.supportedEntityTypes.includes('personal_name')) fail('filing_default entity types are incomplete');
if (task.orderingMode !== 'alphabetical_filing') fail('filing_default ordering mode is not alphabetical_filing');

for (const q of filing) {
  const row = filingManifest.get(q.id);
  if (!row) fail(`${q.id}: missing Filing manifest row`);
  if (q.questionFormat !== row?.questionFormat) fail(`${q.id}: questionFormat does not match manifest`);
  if (q.taskFormat !== row?.taskFormat) fail(`${q.id}: taskFormat does not match manifest`);
  if (q.taskInstance?.kind !== 'filing') fail(`${q.id}: missing additive Filing taskInstance`);
  if (q.taskInstance?.payload?.sourcePromptPreserved !== true) fail(`${q.id}: sourcePromptPreserved must be true`);
  if (!Array.isArray(q.choices) || q.choices.length < 4 || q.choices.length > 5) fail(`${q.id}: invalid choice count`);
  if (!q.choices.some((choice) => choice.id === q.correctOptionId)) fail(`${q.id}: correct answer is not among choices`);
}
for (const q of compact) {
  const payload = q.taskInstance.payload;
  if (!Array.isArray(payload.entries) || payload.entries.length === 0) fail(`${q.id}: compact Filing entries are missing`);
  if (typeof payload.itemPrompt !== 'string' || payload.itemPrompt.length === 0) fail(`${q.id}: compact Filing itemPrompt is missing`);
  if (typeof payload.answerStructure !== 'string') fail(`${q.id}: compact Filing answerStructure is missing`);
  if (q.taskFormat !== 'shared_filing_task') fail(`${q.id}: compact Filing taskFormat must be shared_filing_task`);
}
for (const q of legacy) {
  if (q.taskFormat !== 'legacy_full_prompt') fail(`${q.id}: legacy Filing taskFormat must be legacy_full_prompt`);
  if (q.taskInstance.payload.sourcePromptPreserved !== true) fail(`${q.id}: legacy prompt preservation missing`);
}

console.log(`Validated Filing: ${filing.length} total, ${compact.length} compact, ${legacy.length} legacy full-prompt, task definition resolved.`);
