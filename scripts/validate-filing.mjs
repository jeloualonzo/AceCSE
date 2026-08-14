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
const visibleTask = JSON.stringify({ title: task.title, directions: task.directions, rules: task.rules, examples: task.examples });
if (/AceCSE|simulator|training platform|authored task|prefixes supported|Example: Example:/i.test(visibleTask)) fail('filing_default contains banned or internal examinee-facing wording');
if (!task.examples.every((example) => /filed before|filed after/i.test(String(example.result)))) fail('filing_default examples must demonstrate a concrete filing comparison');

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
for (const id of ['cler-0059', 'cler-0060', 'seed-cler-001']) {
  const q = filing.find((item) => item.id === id);
  const entries = q?.taskInstance?.payload?.entries;
  const choices = q?.choices?.map((choice) => choice.text) ?? [];
  const expectedEntryCount = id === 'seed-cler-001' ? 4 : 5;
  if (!Array.isArray(entries) || entries.length !== expectedEntryCount) fail(`${id}: candidate-entry task has an unexpected displayed-entry count`);
  if (id === 'seed-cler-001') {
    if (!entries.every((entry) => choices.includes(entry))) fail(`${id}: every displayed name must be offered as a choice`);
    if (choices.filter((choice) => !entries.includes(choice)).length !== 1) fail(`${id}: expected exactly one authored distractor outside the four displayed names`);
  } else if (JSON.stringify([...new Set(choices)].sort()) !== JSON.stringify([...new Set(entries)].sort())) {
    fail(`${id}: displayed candidates and choices do not describe the same set`);
  }
}
const seed = filing.find((q) => q.id === 'seed-cler-001');
if (seed?.correctOptionId !== 'C' || seed.choices.find((choice) => choice.id === 'C')?.text !== 'Del Fierro, Ana') fail('seed-cler-001: displayed four-name order must make Del Fierro the third answer (Option C)');
const suffix = filing.find((q) => q.id === 'cler-0010');
if (!/unsuffixed name first.*Jr\., Sr\., and III/i.test(String(suffix?.taskInstance?.payload?.itemNote))) fail('cler-0010: suffix-order convention is not visible');
for (const id of ['cler-0001', 'cler-0006', 'cler-0007', 'cler-0036', 'cler-0038', 'cler-0039', 'cler-0040', 'cler-0041']) {
  const explanation = filing.find((q) => q.id === id)?.explanation ?? '';
  if (/wait|let me recheck|actually|correcting|keyed answer|let me correct/i.test(explanation)) fail(`${id}: explanation contains drafting or self-repair narration`);
}

console.log(`Validated Filing: ${filing.length} total, ${compact.length} compact, ${legacy.length} legacy full-prompt, task definition resolved.`);
