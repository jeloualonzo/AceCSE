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
const expectedStructuredBlocks = {
  'verb-0059': [
        { type: 'correct_answer', text: 'C — The panel of judges has announced its decision.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The question sets a formal American-English convention that treats *panel* as one collective unit. That convention requires a singular verb and a singular pronoun.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The panel of judges **has** announced **its** decision.' },
    { type: 'paragraph', label: 'Why the other choices fail', text: 'Choices A and D use plural **have**, which conflicts with treating *panel* as one unit. Choice B uses singular **has** but plural **their**, so the verb and pronoun do not agree under the stated convention. Choice E also uses singular **has** with plural **their**; the phrase **individual verdicts** foregrounds the members, which conflicts with the required single-unit reading.' },
    { type: 'rule', text: 'When a collective noun is treated as one unit under the stated formal convention, use a singular verb and singular pronoun. Collective nouns may take plural agreement in other contexts when their members are foregrounded; that is not the convention used here.' },
  ],
  'verb-0060': [
        { type: 'correct_answer', text: 'C — Because she arrived late, her application was disqualified.' },
    { type: 'paragraph', label: 'What to Notice', text: '*Because* is a subordinating conjunction that can introduce a complete causal clause: **because + subject + verb**. In choice C, *she arrived late* supplies that complete clause.' },
    { type: 'paragraph', label: 'Apply the Rule', text: '**Because** she arrived late, her application was disqualified.' },
    { type: 'rule', text: 'Use *because* to connect a cause expressed as a complete clause. In choice A, *Being she was late* is defective; a preposition such as *due to* or *on account of* normally takes a noun or gerund phrase, not a finite clause, as in choices B and D. *Since* can introduce a clause, but *since of* in choice E improperly combines a conjunction with a preposition.' },
  ],
  'verb-0061': [
        { type: 'correct_answer', text: 'B — The reason the memorandum was delayed is that the signatory was absent.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The question sets a formal-edited-English convention: use *the reason ... is that ...* rather than *the reason ... is because ...*. Choice B follows that target pattern.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The reason the memorandum was delayed **is that** the signatory was absent.' },
    { type: 'rule', text: 'Under the formal-edited-English convention stated here, pair *the reason ...* with *is that ...*. Choices A and E use *the reason ... is because*, a wording that occurs in ordinary contemporary English but is not the construction selected here; choice C compounds *reason why* with *is because*, while choice D is syntactically defective.' },
  ],
  'verb-0062': [
        { type: 'correct_answer', text: 'B — The commission not only reviewed the budget but also scrutinized the disbursements.' },
    { type: 'paragraph', label: 'What to Notice', text: 'The correlative pair *not only ... but also* should connect parallel grammatical elements. Here, **reviewed** and **scrutinized** are both past-tense verb phrases.' },
    { type: 'paragraph', label: 'Apply the Rule', text: 'The commission not only **reviewed** the budget but also **scrutinized** the disbursements.' },
    { type: 'rule', text: 'With *not only ... but also*, keep the two coordinated elements grammatically parallel. The distractors break that pattern by inserting *it*, pairing an object phrase with a verb phrase, using faulty inversion and singular *was* with plural *disbursements*, or using *scrutinizing* instead of the past-tense *scrutinized*.' },
  ],
};
const forbidden = /AceCSE|simulator|training platform|\bapp\b|software|AI-generated|generated question|authored task|former recognized|competing answer|authoring|process commentary/i;
const forbiddenPayloadKeys = new Set(['question', 'prompt', 'stem', 'itemPrompt', 'sourcePrompt']);

const questions = [];
const sourceOccurrences = new Map();
for (const dir of fs.readdirSync(path.join(root, 'content/questions'))) {
  const subjectDir = path.join(root, 'content/questions', dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    const sourceFile = `content/questions/${dir}/${file}`;
    for (const question of readJson(sourceFile)) {
      questions.push(question);
      const occurrences = sourceOccurrences.get(question.id) ?? [];
      occurrences.push(sourceFile);
      sourceOccurrences.set(question.id, occurrences);
    }
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
  const occurrences = sourceOccurrences.get(id) ?? [];
  if (occurrences.length !== 1 || occurrences[0] !== 'content/questions/verbal/core.json') fail(`${id}: must occur exactly once in canonical verbal/core.json`);
  if (question.choices.length !== 5 || JSON.stringify(question.choices.map((choice) => choice.id)) !== JSON.stringify(['A', 'B', 'C', 'D', 'E'])) fail(`${id}: pilot must retain exactly five A–E choices`);
  if (question.correctOptionId !== expectedAnswers[id]) fail(`${id}: corrected answer key changed`);
  for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
    if (Object.hasOwn(question, field)) fail(`${id}: legacy field ${field} must be removed from the migrated record`);
  }
  if (JSON.stringify(question.structuredExplanation?.blocks) !== JSON.stringify(expectedStructuredBlocks[id])) fail(`${id}: structured explanation does not match the approved learner-facing teaching blocks`);
  if (question.structuredExplanation?.blocks?.some((block) => block.type === 'alternative_solution')) fail(`${id}: alternative/Other Choices sections are not approved for the Grammar pilot`);
  if (forbidden.test(JSON.stringify({ question: question.question, choices: question.choices, structuredExplanation: question.structuredExplanation, reference: question.reference, taskInstance: question.taskInstance }))) fail(`${id}: user-visible pilot content contains forbidden app, generation, or authoring language`);
}

const structuredGrammarIds = questions
  .filter((question) => question.topic === 'Grammar & Usage' && question.structuredExplanation)
  .map((question) => question.id);
if (structuredGrammarIds.length !== pilotIds.length || structuredGrammarIds.some((id) => !pilotSet.has(id))) {
  fail(`structured Grammar explanations must exist for exactly ${pilotIds.length} pilot IDs, got ${structuredGrammarIds.join(', ') || 'none'}`);
}

const nonPilotGrammar = questions.filter((question) => question.topic === 'Grammar & Usage' && !pilotSet.has(question.id));
if (nonPilotGrammar.some((question) => question.taskFormat === 'shared_grammar_sentence_correction' || question.taskInstance?.payload?.taskDefinitionId === 'grammar_sentence_correction_pilot')) fail('A non-pilot Grammar question was migrated into the pilot task');

if (process.exitCode) process.exit();
console.log('Validated Grammar pilot: exactly four canonical pool items, compact payloads, formal-edited shared directions, required qualifiers, five-choice preservation, no repeated compact stem, and no non-pilot migration.');
