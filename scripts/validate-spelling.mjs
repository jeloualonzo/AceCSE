import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
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
  'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048', 'cler-0055',
];
const expected = new Set(expectedIds);
const actual = new Set(spelling.map((question) => question.id));
const canonicalIds = canonicalSpelling.map((question) => question.id);
const approvedStructuredIds = new Set([
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
]);
const approvedAnswerTexts = {
  'cler-0055': 'C — *Personnel*',
  'cler-0012': 'D — *accommodate*',
  'cler-0013': 'E — *seperate*',
  'cler-0014': 'D — *embarrass*',
  'cler-0015': 'D — *priviledge*',
  'cler-0016': 'A — *maintenance*',
  'cler-0017': 'B — *conscientous*',
  'cler-0018': 'E — *perseverance*',
  'cler-0019': 'E — *supercede*',
  'cler-0046': 'C — *achieve*',
  'cler-0047': 'B — *afidavit*',
  'cler-0048': 'D — *inoculate*',
};
const approvedRationaleTexts = {
  'cler-0055': 'The correct spelling is **personnel**, with **double n** and a **single l**. *Personnel* refers to employees or staff, while *personal* means individual or private.',
  'cler-0012': 'The correct spelling is **accommodate**, with **double c** and **double m**. Remembering the two doubled consonants helps distinguish it from common misspellings such as *accomodate* and *acommodate*.\n\n**Memory aid:** Accommodate has **double c** and **double m**.',
  'cler-0013': 'The misspelled word is **seperate**. The correct spelling is **separate**, with **a**, not **e**, after **p**: *sep-a-rate*.\n\n**Memory aid:** There is a **RAT** in sepa-**RAT**-e.',
  'cler-0014': 'The correct spelling is **embarrass**, with **double r** and **double s**.',
  'cler-0015': 'The misspelled word is **priviledge**. The correct spelling is **privilege**, ending in **-lege**, not **-ledge**.\n\nA useful comparison is *privilege, college, sacrilege,* and *allege* versus *knowledge, acknowledge, pledge,* and *sledge*.\n\n**Memory aid:** Privi-**LEGE**.',
  'cler-0016': 'The correct spelling is **maintenance**. It contains **-ten-** in the middle, not **-tain-**, and ends in **-ance**, not **-ence**.\n\nCompare **maintenance, attendance, assistance, importance,** and **resistance** with words such as **difference, reference, existence, dependence,** and **confidence**.\n\n**Memory aid:** Think **MAIN-ten-ance**, not *MAIN-tain-ance*.',
  'cler-0017': 'The misspelled word is **conscientous**. The correct spelling is **conscientious**, with **-ious**, not **-ous**.\n\nExamples with **-ious** include *conscientious, curious, serious, delicious,* and *gracious*, while words such as *famous, nervous, dangerous, generous,* and *enormous* use **-ous**.\n\n**Memory aid:** *Conscientious* contains **-ious**.',
  'cler-0018': 'The correct spelling is **perseverance**. It keeps the root **persever-** and ends in **-ance**.\n\nCompare *perseverance, appearance, endurance, attendance,* and *resistance* with *difference, reference, existence, dependence,* and *confidence*.\n\n**Memory aid:** Connect *perseverance* with *persevere*: **persever-** + **-ance**.',
  'cler-0019': 'The misspelled word is **supercede**. The correct spelling is **supersede**, which uses **-sede**. Other words in this spelling family use different endings: *precede, recede, concede,* and *intercede* use **-cede**, while *proceed, exceed,* and *succeed* use **-ceed**.\n\n**Memory aid:** *Supersede* uses **-sede**.',
  'cler-0046': 'The correctly spelled word is **achieve**, with **-ie**. Compare it with words such as *believe, friend, field,* and *piece*, while words such as *receive, deceive, conceive, perceive,* and *ceiling* use **-ei** after **c**.\n\nThe familiar “i before e” rule has exceptions, so the spelling of the individual word still needs to be checked.',
  'cler-0047': 'The misspelled word is **afidavit**. The correct spelling is **affidavit**, with **double f**.\n\n**Memory aid:** *Affidavit* has **double f**.',
  'cler-0048': 'The correct spelling is **inoculate**, with **one n** and **one c**.\n\n**Memory aid:** Think **i-NOC-u-late**: one **n**, one **c**.',
};
const forbidden = /AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|training rules|authored task/i;
const expectedCorrect = {
  'cler-0012': 'D', 'cler-0013': 'E', 'cler-0014': 'D', 'cler-0015': 'D', 'cler-0016': 'A',
  'cler-0017': 'B', 'cler-0018': 'E', 'cler-0019': 'E',
  'cler-0046': 'C', 'cler-0047': 'B', 'cler-0048': 'D', 'cler-0055': 'C',
};

if (spelling.length !== expectedIds.length) fail(`expected ${expectedIds.length} Spelling questions, got ${spelling.length}`);
if (actual.size !== spelling.length || [...actual].some((id) => !expected.has(id))) fail('Spelling IDs do not match the frozen 12-question inventory');
if (canonicalSpelling.length !== approvedStructuredIds.size || JSON.stringify(canonicalIds) !== JSON.stringify([...approvedStructuredIds])) fail('canonical spelling.json must contain exactly the 12 approved IDs in order');
if (canonicalSpelling.some((question) => question.subject !== 'Clerical Ability' || question.topic !== 'Spelling')) fail('canonical spelling.json contains a non-Clerical Spelling record');
if (!task || task.title !== 'Spelling') fail('spelling_default task definition is missing or has the wrong title');
if (typeof task.directions !== 'string' || task.directions.length < 40) fail('spelling_default directions are missing or too short');
if (forbidden.test(JSON.stringify({ title: task.title, directions: task.directions, examples: task.examples }))) fail('spelling_default contains forbidden user-visible language');
if (!Array.isArray(task.supports) || !task.supports.includes('correctly_spelled_word') || !task.supports.includes('misspelled_word')) fail('spelling_default supported variants are incomplete');
if (task.answerStructure !== 'word_selection') fail('spelling_default answerStructure must be word_selection');
if (task.noErrorOptional !== true) fail('spelling_default must explicitly mark No Error as optional');
if (!Array.isArray(task.examples) || task.examples.length < 1) fail('spelling_default must include an original shared example');
if (pool.poolId !== 'clerical-spelling' || JSON.stringify(pool.entries.map((entry) => entry.questionId).sort()) !== JSON.stringify(expectedIds.slice().sort())) fail('clerical-spelling pool does not contain exactly the 12 Spelling IDs');
const structuredIds = spelling.filter((question) => question.structuredExplanation).map((question) => question.id);
if (structuredIds.length !== approvedStructuredIds.size || structuredIds.some((id) => !approvedStructuredIds.has(id))) fail('structuredExplanation must exist for exactly the 12 approved canonical Spelling IDs');

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
    const blocks = question.structuredExplanation?.blocks ?? [];
    if (blocks.length !== 2 || blocks[0]?.type !== 'correct_answer' || blocks[0]?.text !== approvedAnswerTexts[question.id]) fail(`${question.id}: structured explanation must begin with the exact approved correct_answer block`);
    if (blocks[1]?.type !== 'paragraph' || blocks[1]?.label !== 'Rationale' || blocks[1]?.text !== approvedRationaleTexts[question.id]) fail(`${question.id}: exact approved Rationale paragraph is missing or incorrect`);
    if (blocks.some((block) => block.type === 'heading' || block.type === 'distractor_section' || block.type === 'rule' || block.type === 'step' || block.type === 'alternative_solution')) fail(`${question.id}: only correct_answer and Rationale blocks are permitted for canonical Spelling`);
  }
  if (question.id === 'cler-0014') {
    const expectedChoices = ['embarass', 'embarras', 'embaras', 'embarrass', 'embarrased'];
    if (JSON.stringify(question.choices.map((choice) => choice.text)) !== JSON.stringify(expectedChoices)) fail('cler-0014: repaired choices do not match the verified single-answer set');
    if (question.structuredExplanation?.blocks?.[0]?.type !== 'correct_answer' || question.structuredExplanation.blocks[0].text !== approvedAnswerTexts['cler-0014']) fail('cler-0014: structured explanation does not establish D as the correctly spelled word');

  }
  const visible = JSON.stringify({ question: question.question, choices: question.choices, explanation: question.explanation, steps: question.steps, distractors: question.distractorExplanations, tip: question.tip, reference: question.reference, taskInstance: question.taskInstance });
  if (forbidden.test(visible)) fail(`${question.id}: user-visible Spelling content contains forbidden language`);
}

console.log(`Validated Spelling: ${spelling.length} total, ${spelling.filter((q) => q.taskInstance?.payload?.instanceFormat === 'compact').length} compact, ${spelling.filter((q) => q.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt').length} legacy, task definition and exact word preservation resolved.`);
