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
const filingPool = readJson(path.join(root, 'content/taxonomy/pools/clerical-filing.json'));
const filingManifest = new Map(manifest.questions.filter((row) => row.topic === 'Filing & Alphabetizing').map((row) => [row.questionId, row]));
const task = taxonomy.sharedTaskDefinitions?.filing_default;
const canonicalFilingFile = 'content/questions/clerical/filing.json';
const canonicalFilingIds = new Set([
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
]);
const batch2Ids = new Set([
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
]);
const expectedKeys = {
  'cler-0006': 'C',
  'cler-0007': 'A',
  'cler-0008': 'A',
  'cler-0009': 'C',
  'cler-0010': 'B',
  'cler-0011': 'D',
  'cler-0031': 'C',
  'cler-0032': 'B',
  'cler-0033': 'D',
  'seed-cler-001': 'C',
  'cler-0036': 'C',
  'cler-0037': 'D',
  'cler-0038': 'B',
  'cler-0039': 'B',
};
const canonicalRecords = readJson(path.join(root, 'content/questions/clerical/filing.json'));
const canonicalRecordIds = new Set(canonicalRecords.map((q) => q.id));
const compact = filing.filter((q) => q.taskInstance?.kind === 'filing' && q.taskInstance.payload?.instanceFormat === 'compact');
const legacy = filing.filter((q) => q.taskInstance?.kind === 'filing' && q.taskInstance.payload?.instanceFormat === 'legacy_full_prompt');
const canonicalStructured = filing.filter((q) => canonicalFilingIds.has(q.id));

if (filing.length !== 26) fail(`expected 26 Filing questions, got ${filing.length}`);
if (compact.length !== 21) fail(`expected 21 compact Filing instances, got ${compact.length}`);
if (legacy.length !== 5) fail(`expected 5 legacy Filing instances, got ${legacy.length}`);
if (canonicalRecords.length !== 24) fail(`expected 24 records in canonical filing.json, got ${canonicalRecords.length}`);
if (canonicalRecordIds.size !== canonicalRecords.length || ![...canonicalFilingIds].every((id) => canonicalRecordIds.has(id))) fail('canonical filing.json membership is not exactly the approved 24-record set');
if (canonicalStructured.length !== canonicalFilingIds.size) fail(`expected all ${canonicalFilingIds.size} canonical structured Filing records, got ${canonicalStructured.length}`);
if (filingPool.poolId !== 'clerical-filing' || filingPool.entries.length !== 26) fail('clerical-filing production pool must remain intact at 26 entries');
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
  if (canonicalFilingIds.has(q.id) && row?.sourceFile !== canonicalFilingFile) fail(`${q.id}: canonical Filing sourceFile must be ${canonicalFilingFile}`);
  if (canonicalFilingIds.has(q.id)) {
    if (!q.structuredExplanation?.blocks?.length) fail(`${q.id}: canonical Filing structuredExplanation is missing`);
    for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
      if (field in q) fail(`${q.id}: migrated legacy field remains: ${field}`);
    }
    if (expectedKeys[q.id] && q.correctOptionId !== expectedKeys[q.id]) fail(`${q.id}: expected approved answer key ${expectedKeys[q.id]}, got ${q.correctOptionId}`);
    const blocks = q.structuredExplanation.blocks;
    if (blocks.some((block) => /Other Choices|corrected alternatives/i.test(`${block.label ?? ''} ${block.title ?? ''} ${block.text ?? ''}`))) fail(`${q.id}: unapproved Other Choices/corrected alternatives block present`);
    for (const block of blocks) {
      if (block.type !== 'paragraph' || block.label !== 'Filing Order') continue;
      const lines = String(block.text).split('\n');
      if (lines.some((line, index) => !new RegExp(`^\\*\\*${index + 1}\\.\\*\\* \\*.+\\*$`).test(line))) fail(`${q.id}: Filing Order entries must be vertically stacked numbered italic lines`);
      if (String(block.text).includes('→')) fail(`${q.id}: Filing Order must not use arrows`);
    }
  }
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
for (const id of batch2Ids) {
  const q = filing.find((item) => item.id === id);
  if (!q || !canonicalFilingIds.has(id)) fail(`${id}: Batch 2 record is not canonical Filing content`);
  if (q?.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt' && ['cler-0009', 'cler-0031', 'cler-0032', 'cler-0033', 'cler-0036', 'cler-0037', 'cler-0038', 'cler-0039'].includes(id)) fail(`${id}: representable Batch 2 legacy item was not converted to compact Filing format`);
}
const suffix = filing.find((q) => q.id === 'cler-0010');
if (!/unsuffixed name first.*Jr\., Sr\., and III/i.test(String(suffix?.taskInstance?.payload?.itemNote))) fail('cler-0010: suffix-order convention is not visible');
const seed = filing.find((q) => q.id === 'seed-cler-001');
if (seed?.correctOptionId !== 'C' || seed.choices.find((choice) => choice.id === 'C')?.text !== 'Del Fierro, Ana') fail('seed-cler-001: Del Fierro must remain Option C');
if (seed?.taskInstance?.payload?.entries?.length !== 4) fail('seed-cler-001: the four-name authored filing set must remain four entries');

console.log(`Validated Filing: ${filing.length} total, ${compact.length} compact, ${legacy.length} legacy full-prompt, ${canonicalRecords.length} canonical structured, task definition and 26-question pool resolved.`);
