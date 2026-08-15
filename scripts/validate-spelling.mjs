import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const questions = [];
for (const dir of fs.readdirSync(path.join(root, 'content/questions'))) {
  const subjectDir = path.join(root, 'content/questions', dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    questions.push(...readJson(path.join('content/questions', dir, file)));
  }
}
const spelling = questions.filter((question) => question.topic === 'Spelling');
const taxonomy = readJson('content/taxonomy/taxonomy.json');
const manifest = readJson('content/taxonomy/classification-manifest.json');
const pool = readJson('content/taxonomy/pools/clerical-spelling.json');
const spellingRows = new Map(manifest.questions.filter((row) => row.topic === 'Spelling').map((row) => [row.questionId, row]));
const task = taxonomy.sharedTaskDefinitions?.spelling_default;
const expectedIds = [
  'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015', 'cler-0016', 'cler-0017', 'cler-0018',
  'cler-0019', 'cler-0034', 'seed-cler-002', 'cler-0046', 'cler-0047', 'cler-0048', 'cler-0055',
];
const expected = new Set(expectedIds);
const actual = new Set(spelling.map((question) => question.id));
const forbidden = /AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|training rules|authored task/i;
const expectedCorrect = {
  'cler-0012': 'D', 'cler-0013': 'E', 'cler-0014': 'D', 'cler-0015': 'D', 'cler-0016': 'A',
  'cler-0017': 'B', 'cler-0018': 'E', 'cler-0019': 'E', 'cler-0034': 'B', 'seed-cler-002': 'B',
  'cler-0046': 'C', 'cler-0047': 'B', 'cler-0048': 'D', 'cler-0055': 'C',
};

if (spelling.length !== expectedIds.length) fail(`expected ${expectedIds.length} Spelling questions, got ${spelling.length}`);
if (actual.size !== spelling.length || [...actual].some((id) => !expected.has(id))) fail('Spelling IDs do not match the frozen 14-question inventory');
if (!task || task.title !== 'Spelling') fail('spelling_default task definition is missing or has the wrong title');
if (typeof task.directions !== 'string' || task.directions.length < 40) fail('spelling_default directions are missing or too short');
if (forbidden.test(JSON.stringify({ title: task.title, directions: task.directions, examples: task.examples }))) fail('spelling_default contains forbidden user-visible language');
if (!Array.isArray(task.supports) || !task.supports.includes('correctly_spelled_word') || !task.supports.includes('misspelled_word')) fail('spelling_default supported variants are incomplete');
if (task.answerStructure !== 'word_selection') fail('spelling_default answerStructure must be word_selection');
if (task.noErrorOptional !== true) fail('spelling_default must explicitly mark No Error as optional');
if (!Array.isArray(task.examples) || task.examples.length < 1) fail('spelling_default must include an original shared example');
if (pool.poolId !== 'clerical-spelling' || JSON.stringify(pool.entries.map((entry) => entry.questionId).sort()) !== JSON.stringify(expectedIds.slice().sort())) fail('clerical-spelling pool does not contain exactly the 14 Spelling IDs');

for (const question of spelling) {
  const row = spellingRows.get(question.id);
  if (!row) fail(`${question.id}: missing Spelling manifest row`);
  if (row?.poolId !== 'clerical-spelling') fail(`${question.id}: not classified in clerical-spelling pool`);
  if (question.questionType !== row?.questionType) fail(`${question.id}: questionType does not match manifest`);
  if (question.questionFormat !== row?.questionFormat) fail(`${question.id}: questionFormat does not match manifest`);
  if (question.taskFormat !== 'shared_spelling_task' || question.taskFormat !== row?.taskFormat) fail(`${question.id}: taskFormat does not match shared_spelling_task`);
  if (question.taskInstance?.kind !== 'spelling') fail(`${question.id}: missing additive Spelling taskInstance`);
  if (question.taskInstance?.payload?.taskDefinitionId !== 'spelling_default') fail(`${question.id}: taskDefinitionId is not spelling_default`);
  if (question.taskInstance?.payload?.instanceFormat !== 'compact') fail(`${question.id}: must be a compact Spelling instance`);
  if (question.taskInstance?.payload?.sourcePromptPreserved !== true) fail(`${question.id}: sourcePromptPreserved must be true`);
  if (question.taskInstance?.payload?.migrationStatus !== 'safe_compact_conversion') fail(`${question.id}: migration status is not safe_compact_conversion`);
  if (question.taskInstance?.payload?.answerStructure !== 'word_selection') fail(`${question.id}: answerStructure must be word_selection`);
  if (question.taskInstance?.payload?.choiceEncoding !== 'direct_word_choices') fail(`${question.id}: choiceEncoding must be direct_word_choices`);
  const words = question.taskInstance?.payload?.words;
  const choiceTexts = question.choices.map((choice) => choice.text);
  if (!Array.isArray(words) || JSON.stringify(words) !== JSON.stringify(choiceTexts)) fail(`${question.id}: compact words do not exactly match authored choices`);
  const expectedPrompt = row?.questionType === 'misspelled_word' ? 'Choose the misspelled word.' : 'Choose the correctly spelled word.';
  if (question.taskInstance?.payload?.itemPrompt !== expectedPrompt) fail(`${question.id}: itemPrompt does not match controlled task variant`);
  const hasNoError = question.choices.some((choice) => choice.text === 'No Error');
  if (hasNoError !== Boolean(question.taskInstance?.payload?.noErrorVariant)) fail(`${question.id}: No Error choice and noErrorVariant metadata disagree`);
  if (hasNoError && question.choices.find((choice) => choice.text === 'No Error')?.id !== 'E') fail(`${question.id}: No Error must be option E`);
  if (question.choices.length !== 5 || JSON.stringify(question.choices.map((choice) => choice.id)) !== JSON.stringify(['A', 'B', 'C', 'D', 'E'])) fail(`${question.id}: Spelling must retain exactly five contiguous A–E choices`);
  if (new Set(question.choices.map((choice) => choice.text)).size !== question.choices.length) fail(`${question.id}: duplicate choice text creates an ambiguous Spelling item`);
  if (question.correctOptionId !== expectedCorrect[question.id]) fail(`${question.id}: correctOptionId does not match the verified Spelling answer map`);
  if (!question.choices.some((choice) => choice.id === question.correctOptionId)) fail(`${question.id}: correct answer is not among choices`);
  if (question.id === 'cler-0014') {
    const expectedChoices = ['embarass', 'embarras', 'embaras', 'embarrass', 'embarrased'];
    if (JSON.stringify(question.choices.map((choice) => choice.text)) !== JSON.stringify(expectedChoices)) fail('cler-0014: repaired choices do not match the verified single-answer set');
    if (!/embarrass.*double.*r.*double.*s|double.*r.*double.*s.*embarrass/i.test(question.explanation)) fail('cler-0014: explanation does not establish D as the correctly spelled word');
  }
  const visible = JSON.stringify({ question: question.question, choices: question.choices, explanation: question.explanation, steps: question.steps, distractors: question.distractorExplanations, tip: question.tip, reference: question.reference, taskInstance: question.taskInstance });
  if (forbidden.test(visible)) fail(`${question.id}: user-visible Spelling content contains forbidden language`);
}

console.log(`Validated Spelling: ${spelling.length} total, ${spelling.filter((q) => q.taskInstance?.payload?.instanceFormat === 'compact').length} compact, ${spelling.filter((q) => q.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt').length} legacy, task definition and exact word preservation resolved.`);
