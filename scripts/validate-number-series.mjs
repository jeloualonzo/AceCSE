import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const expectedIds = ['num-0019', 'num-0020', 'num-0021', 'num-0022', 'num-0023', 'num-0024', 'num-0025', 'num-0026', 'num-0108', 'num-0137', 'num-0147'];
const expectedSet = new Set(expectedIds);
const questions = [];
const sourceOccurrences = new Map();
for (const dir of fs.readdirSync(path.join(root, 'content/questions'))) {
  const subjectDir = path.join(root, 'content/questions', dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    const sourceFile = path.join('content/questions', dir, file);
    const dataset = readJson(sourceFile);
    for (const question of dataset) {
      questions.push(question);
      if (!expectedSet.has(question.id)) continue;
      const occurrences = sourceOccurrences.get(question.id) ?? [];
      occurrences.push(sourceFile);
      sourceOccurrences.set(question.id, occurrences);
    }
  }
}
const numberSeries = questions.filter((question) => question.topic === 'Number Series');
const taxonomy = readJson('content/taxonomy/taxonomy.json');
const manifest = readJson('content/taxonomy/classification-manifest.json');
const pool = readJson('content/taxonomy/pools/numerical-number-sequence.json');
const rows = new Map(manifest.questions.map((row) => [row.questionId, row]));
const task = taxonomy.sharedTaskDefinitions?.number_series_default;
const expected = {
  'num-0019': { sequence: ['4', '9', '14', '19', null], correct: 'B', choices: ['25', '24', '22', '26', '29'] },
  'num-0020': { sequence: ['3', '6', '12', '24', null], correct: 'E', choices: ['44', '36', '40', '56', '48'] },
  'num-0021': { sequence: ['2', '5', '9', '14', '20', null], correct: 'C', choices: ['28', '25', '27', '26', '29'] },
  'num-0022': { sequence: ['1', '1', '2', '3', '5', '8', null], correct: 'D', choices: ['12', '14', '11', '13', '15'] },
  'num-0023': { sequence: ['2', '5', '11', '23', null], correct: 'E', choices: ['43', '45', '46', '48', '47'] },
  'num-0024': { sequence: ['1', '4', '9', '16', '25', null], correct: 'A', choices: ['36', '30', '34', '35', '37'] },
  'num-0025': { sequence: ['3', '7', '4', '10', '5', '13', '6', null], correct: 'C', choices: ['7', '14', '16', '15', '17'] },
  'num-0026': { sequence: ['1', '3', '7', '13', '21', null], correct: 'B', choices: ['29', '31', '33', '34', '35'] },
  'num-0108': { sequence: ['5', '6', '10', '19', '35', '60', null], correct: 'A', choices: ['96', '86', '72', '98', '101'] },
  'num-0137': { sequence: ['2/4', '1/2', '2/6', '1/3', '2/8', '1/4', '2/10', null], correct: 'A', choices: ['1/5', '1/6', '2/5', '3/4', '4/5'] },
  'num-0147': { sequence: ['13', '−21', '34', '−55', '89', null], correct: 'D', choices: ['−95', '104', '−130', '−144', '−109'] },
};
const approvedPilotExplanations = {
  'num-0019': {
    answer: 'B — 24',
    rationale: 'The difference between each consecutive term is **5**:\n\n\\[\n9-4=5,\\quad 14-9=5,\\quad 19-14=5\n\\]\n\nContinuing the same pattern:\n\n\\[\n19+5=24\n\\]\n\nTherefore, the missing term is **24**.',
  },
  'num-0020': {
    answer: 'E — 48',
    rationale: 'Each term is multiplied by **2**:\n\n\\[\n3\\times2=6,\\quad 6\\times2=12,\\quad 12\\times2=24\n\\]\n\nContinuing the same pattern:\n\n\\[\n24\\times2=48\n\\]\n\nTherefore, the missing term is **48**.',
  },
  'num-0021': {
    answer: 'C — 27',
    rationale: 'The differences increase by **1** each time:\n\n\\[\n5-2=3,\\quad 9-5=4,\\quad 14-9=5,\\quad 20-14=6\n\\]\n\nThe next difference is therefore **7**:\n\n\\[\n20+7=27\n\\]\n\nTherefore, the missing term is **27**.',
  },
};
const actualSet = new Set(numberSeries.map((question) => question.id));
const canonicalSource = 'content/questions/numerical/number-series.json';
const canonicalRecords = readJson(canonicalSource);
const forbidden = /AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|authored task|training rules/i;

if (!Array.isArray(canonicalRecords) || canonicalRecords.length !== expectedIds.length) fail(`${canonicalSource} must contain exactly ${expectedIds.length} records`);
if (JSON.stringify(canonicalRecords.map((question) => question.id)) !== JSON.stringify(expectedIds)) fail(`${canonicalSource} IDs/order do not match the verified 11-question inventory`);
for (const id of expectedIds) {
  const occurrences = sourceOccurrences.get(id) ?? [];
  if (JSON.stringify(occurrences) !== JSON.stringify([canonicalSource])) fail(`${id}: expected one active source occurrence in ${canonicalSource}, got ${JSON.stringify(occurrences)}`);
  const canonicalQuestion = canonicalRecords.find((question) => question.id === id);
  if (!canonicalQuestion || Object.hasOwn(canonicalQuestion, 'distractorExplanations')) fail(`${id}: canonical record still has distractorExplanations or is missing`);
  for (const field of ['structuredExplanation', 'numberSeries', 'taskInstance']) {
    if (!Object.hasOwn(canonicalQuestion, field)) fail(`${id}: required preserved field ${field} is missing from canonical record`);
  }
  if (!approvedPilotExplanations[id]) {
    for (const field of ['explanation', 'steps', 'tip']) {
      if (!Object.hasOwn(canonicalQuestion, field)) fail(`${id}: required preserved legacy field ${field} is missing from canonical record`);
    }
  }
  if (rows.get(id)?.sourceFile !== canonicalSource) fail(`${id}: classification manifest sourceFile is not ${canonicalSource}`);
}

if (numberSeries.length !== expectedIds.length) fail(`expected ${expectedIds.length} Number Series questions, got ${numberSeries.length}`);
if (actualSet.size !== numberSeries.length || [...actualSet].some((id) => !expectedSet.has(id))) fail('Number Series IDs do not match the verified 11-question inventory');
if (!task || task.title !== 'Number Series') fail('number_series_default task definition is missing or has the wrong title');
if (task.taskFormat !== 'number_sequence' || task.answerStructure !== 'sequence_missing_term') fail('number_series_default task contract is incomplete');
if (typeof task.directions !== 'string' || task.directions.length < 30) fail('number_series_default directions are missing or too short');
if (!Array.isArray(task.examples) || task.examples.length < 1) fail('number_series_default must include an original example');
if (task.sequenceRepresentation !== 'ordered_terms_with_null_marker' || task.missingPositionBase !== 1) fail('number_series_default sequence representation contract is incomplete');
const numberSeriesRule = taxonomy.rules?.numberSeries;
if (typeof numberSeriesRule !== 'string' || !/any valid one-based position/i.test(numberSeriesRule) || !/never move a blank to the end/i.test(numberSeriesRule) || !/never reorder/i.test(numberSeriesRule)) fail('taxonomy Number Series rule does not protect arbitrary missing positions and authored order');
if (forbidden.test(JSON.stringify({ title: task.title, directions: task.directions, examples: task.examples, provenance: task.provenance }))) fail('number_series_default contains forbidden user-visible language');
if (pool.poolId !== 'numerical-number-sequence' || JSON.stringify(pool.entries.map((entry) => entry.questionId).sort()) !== JSON.stringify(expectedIds.slice().sort())) fail('numerical-number-sequence pool does not contain exactly the 11 Number Series IDs');

for (const question of numberSeries) {
  const row = rows.get(question.id);
  const expectedItem = expected[question.id];
  if (!row || row.poolId !== 'numerical-number-sequence' || row.questionType !== 'number_sequence' || row.questionFormat !== 'number_sequence' || row.taskFormat !== 'number_sequence') fail(`${question.id}: canonical Number Series classification is incomplete`);
  if (question.questionType !== 'number_sequence' || question.questionFormat !== 'number_sequence' || question.taskFormat !== 'number_sequence') fail(`${question.id}: source format metadata is incomplete`);
  if (!question.numberSeries || !Array.isArray(question.numberSeries.sequence)) fail(`${question.id}: missing structured numberSeries sequence`);
  const structure = question.numberSeries;
  if (JSON.stringify(structure.sequence) !== JSON.stringify(expectedItem.sequence)) fail(`${question.id}: sequence values/order differ from the authored inventory`);
  if (!Number.isInteger(structure.missingPosition) || structure.missingPosition < 1 || structure.missingPosition > structure.sequence.length) fail(`${question.id}: missingPosition is invalid`);
  if (structure.sequence[structure.missingPosition - 1] !== null || structure.sequence.filter((term) => term === null).length !== 1) fail(`${question.id}: missingPosition does not match the single structured blank`);
  const payload = question.taskInstance?.payload;
  if (question.taskInstance?.kind !== 'number_series' || payload?.taskDefinitionId !== 'number_series_default') fail(`${question.id}: missing Number Series task instance definition`);
  if (payload?.instanceFormat !== 'compact' || payload?.answerStructure !== 'sequence_missing_term' || payload?.migrationStatus !== 'safe_compact_conversion' || payload?.sourcePromptPreserved !== true) fail(`${question.id}: compact task payload contract is incomplete`);
  if (JSON.stringify(payload.sequence) !== JSON.stringify(structure.sequence) || payload.missingPosition !== structure.missingPosition) fail(`${question.id}: task payload and numberSeries structure disagree`);
  if (payload.itemPrompt !== 'Choose the missing term.') fail(`${question.id}: item prompt is not the controlled compact prompt`);
  if (question.choices.length !== 5 || JSON.stringify(question.choices.map((choice) => choice.id)) !== JSON.stringify(['A', 'B', 'C', 'D', 'E'])) fail(`${question.id}: Number Series must retain exactly five contiguous A–E choices`);
  if (JSON.stringify(question.choices.map((choice) => choice.text)) !== JSON.stringify(expectedItem.choices)) fail(`${question.id}: authored choice text/order changed`);
  if (new Set(question.choices.map((choice) => choice.text)).size !== question.choices.length) fail(`${question.id}: duplicate choice text is not allowed`);
  if (question.correctOptionId !== expectedItem.correct || !question.choices.some((choice) => choice.id === question.correctOptionId)) fail(`${question.id}: answer key is invalid or changed`);
  const approvedPilot = approvedPilotExplanations[question.id];
  if (approvedPilot) {
    const blocks = question.structuredExplanation?.blocks ?? [];
    if (blocks.length !== 2) fail(`${question.id}: approved pilot explanation must contain exactly correct_answer plus Rationale`);
    if (blocks[0]?.type !== 'correct_answer' || blocks[0]?.text !== approvedPilot.answer) fail(`${question.id}: approved pilot correct_answer block is missing or incorrect`);
    if (blocks[1]?.type !== 'paragraph' || blocks[1]?.label !== 'Rationale' || blocks[1]?.text !== approvedPilot.rationale) fail(`${question.id}: approved pilot Rationale paragraph is missing or incorrect`);
    if (blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type))) fail(`${question.id}: obsolete Number Series explanation block remains`);
    for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
      if (Object.hasOwn(question, field)) fail(`${question.id}: obsolete legacy explanation field ${field} remains`);
    }
  }
  const visible = JSON.stringify({ question: question.question, choices: question.choices, explanation: question.explanation, steps: question.steps, tip: question.tip, reference: question.reference, taskInstance: question.taskInstance });
  if (forbidden.test(visible)) fail(`${question.id}: user-visible Number Series content contains forbidden language`);
}
for (const id of ['ana-0038', 'ana-0040']) {
  const row = rows.get(id);
  if (row?.taskFormat !== 'letter_sequence' || row.poolId !== 'analytical-letter-sequence') fail(`${id}: letter-series exclusion regressed`);
}

console.log(`Validated Number Series: ${numberSeries.length} total, ${numberSeries.filter((q) => q.taskInstance?.payload?.instanceFormat === 'compact').length} compact, arbitrary missing-position semantics verified, current final-position distribution recorded, numeric pool and letter-series exclusions resolved.`);
