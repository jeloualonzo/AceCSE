import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const stripInlineFormatting = (text) => text
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\*([^*]+)\*/g, '$1');
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const questions = [];
const sourceOccurrences = new Map();
for (const dir of fs.readdirSync(path.join(root, 'content/questions'))) {
  const subjectDir = path.join(root, 'content/questions', dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    const sourceFile = path.join('content/questions', dir, file).replaceAll('\\', '/');
    const dataset = readJson(sourceFile);
    for (const question of dataset) {
      questions.push(question);
      const occurrences = sourceOccurrences.get(question.id) ?? [];
      occurrences.push(sourceFile);
      sourceOccurrences.set(question.id, occurrences);
    }
  }
}
const spelling = questions.filter((question) => question.topic === 'Spelling');
const canonicalSpellingFile = 'content/questions/clerical/spelling.json';
const canonicalSpelling = readJson(canonicalSpellingFile);
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
const canonicalIds = canonicalSpelling.map((question) => question.id);
const approvedStructuredIds = new Set(['cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015']);
const approvedCorrectSpellings = {
  'cler-0055': 'Personnel',
  'cler-0012': 'accommodate',
  'cler-0013': 'separate',
  'cler-0014': 'embarrass',
  'cler-0015': 'privilege',
};
const forbidden = /AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|training rules|authored task/i;
const expectedCorrect = {
  'cler-0012': 'D', 'cler-0013': 'E', 'cler-0014': 'D', 'cler-0015': 'D', 'cler-0016': 'A',
  'cler-0017': 'B', 'cler-0018': 'E', 'cler-0019': 'E', 'cler-0034': 'B', 'seed-cler-002': 'B',
  'cler-0046': 'C', 'cler-0047': 'B', 'cler-0048': 'D', 'cler-0055': 'C',
};

if (spelling.length !== expectedIds.length) fail(`expected ${expectedIds.length} Spelling questions, got ${spelling.length}`);
if (actual.size !== spelling.length || [...actual].some((id) => !expected.has(id))) fail('Spelling IDs do not match the frozen 14-question inventory');
if (canonicalSpelling.length !== approvedStructuredIds.size || JSON.stringify(canonicalIds) !== JSON.stringify([...approvedStructuredIds])) fail('canonical spelling.json must contain exactly the five approved IDs in order');
if (canonicalSpelling.some((question) => question.subject !== 'Clerical Ability' || question.topic !== 'Spelling')) fail('canonical spelling.json contains a non-Clerical Spelling record');
if (!task || task.title !== 'Spelling') fail('spelling_default task definition is missing or has the wrong title');
if (typeof task.directions !== 'string' || task.directions.length < 40) fail('spelling_default directions are missing or too short');
if (forbidden.test(JSON.stringify({ title: task.title, directions: task.directions, examples: task.examples }))) fail('spelling_default contains forbidden user-visible language');
if (!Array.isArray(task.supports) || !task.supports.includes('correctly_spelled_word') || !task.supports.includes('misspelled_word')) fail('spelling_default supported variants are incomplete');
if (task.answerStructure !== 'word_selection') fail('spelling_default answerStructure must be word_selection');
if (task.noErrorOptional !== true) fail('spelling_default must explicitly mark No Error as optional');
if (!Array.isArray(task.examples) || task.examples.length < 1) fail('spelling_default must include an original shared example');
if (pool.poolId !== 'clerical-spelling' || JSON.stringify(pool.entries.map((entry) => entry.questionId).sort()) !== JSON.stringify(expectedIds.slice().sort())) fail('clerical-spelling pool does not contain exactly the 14 Spelling IDs');
const structuredIds = spelling.filter((question) => question.structuredExplanation).map((question) => question.id);
if (structuredIds.length !== approvedStructuredIds.size || structuredIds.some((id) => !approvedStructuredIds.has(id))) fail('structuredExplanation must exist for exactly the five approved Spelling pilot IDs');

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
  if (approvedStructuredIds.has(question.id)) {
    const occurrences = sourceOccurrences.get(question.id) ?? [];
    if (occurrences.length !== 1 || occurrences[0] !== canonicalSpellingFile) fail(`${question.id}: must occur exactly once in canonical spelling.json`);
        if (spellingRows.get(question.id)?.sourceFile !== canonicalSpellingFile) fail(`${question.id}: manifest sourceFile must point to canonical spelling.json`);
    for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
      if (Object.hasOwn(question, field)) fail(`${question.id}: legacy field ${field} must be removed from canonical Spelling records`);
    }
    const correctSpellingBlock = question.structuredExplanation?.blocks?.find((block) => block.type === 'paragraph' && block.label === 'Correct Spelling');

    if (stripInlineFormatting(correctSpellingBlock?.text ?? '') !== approvedCorrectSpellings[question.id]) fail(`${question.id}: approved Correct Spelling block is missing or incorrect`);
    const memoryAidBlocks = question.structuredExplanation?.blocks?.filter((block) => block.type === 'paragraph' && block.label === 'Memory Aid') ?? [];
    const alternativeMemoryAids = question.structuredExplanation?.blocks?.filter((block) => block.type === 'alternative_solution' && block.title === 'Memory Aid') ?? [];
    if (['cler-0012', 'cler-0013', 'cler-0015'].includes(question.id)) {
      if (memoryAidBlocks.length !== 1 || alternativeMemoryAids.length !== 0) fail(`${question.id}: Memory Aid must be a visible labeled paragraph, not a collapsible alternative`);
    } else if (memoryAidBlocks.length !== 0 || alternativeMemoryAids.length !== 0) {
      fail(`${question.id}: unexpected Memory Aid block`);
    }
  }
  if (question.id === 'cler-0014') {
    const expectedChoices = ['embarass', 'embarras', 'embaras', 'embarrass', 'embarrased'];
    if (JSON.stringify(question.choices.map((choice) => choice.text)) !== JSON.stringify(expectedChoices)) fail('cler-0014: repaired choices do not match the verified single-answer set');
    if (question.structuredExplanation?.blocks?.some((block) => block.type === 'paragraph' && block.label === 'Correct Spelling' && stripInlineFormatting(block.text) === 'embarrass') !== true) fail('cler-0014: structured explanation does not establish D as the correctly spelled word');

  }
  const visible = JSON.stringify({ question: question.question, choices: question.choices, explanation: question.explanation, steps: question.steps, distractors: question.distractorExplanations, tip: question.tip, reference: question.reference, taskInstance: question.taskInstance });
  if (forbidden.test(visible)) fail(`${question.id}: user-visible Spelling content contains forbidden language`);
}

console.log(`Validated Spelling: ${spelling.length} total, ${spelling.filter((q) => q.taskInstance?.payload?.instanceFormat === 'compact').length} compact, ${spelling.filter((q) => q.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt').length} legacy, task definition and exact word preservation resolved.`);
