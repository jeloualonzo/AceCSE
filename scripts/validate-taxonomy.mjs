import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const taxonomyPath = path.join(root, 'content/taxonomy/taxonomy.json');
const manifestPath = path.join(root, 'content/taxonomy/classification-manifest.json');
const poolsDir = path.join(root, 'content/taxonomy/pools');
const groupsDir = path.join(root, 'content/groups');
const questionsDir = path.join(root, 'content/questions');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const taxonomy = readJson(taxonomyPath);
const manifest = readJson(manifestPath);
const poolFiles = fs.readdirSync(poolsDir).filter((file) => file.endsWith('.json')).sort();
const poolIndexes = new Map(poolFiles.map((file) => {
  const pool = readJson(path.join(poolsDir, file));
  return [pool.poolId, pool];
}));

const questionIds = [];
const questions = new Map();
for (const dir of fs.readdirSync(questionsDir)) {
  const subjectDir = path.join(questionsDir, dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json')).sort()) {
    const sourceFile = path.join('content/questions', dir, file);
    for (const question of readJson(path.join(subjectDir, file))) {
      questionIds.push(question.id);
      questions.set(question.id, { ...question, sourceFile });
    }
  }
}

const groupMap = new Map();
for (const dir of fs.readdirSync(groupsDir)) {
  const subjectDir = path.join(groupsDir, dir);
  if (!fs.statSync(subjectDir).isDirectory()) continue;
  for (const file of fs.readdirSync(subjectDir).filter((name) => name.endsWith('.json'))) {
    for (const group of readJson(path.join(subjectDir, file))) groupMap.set(group.id, group);
  }
}

const classifications = manifest.questions ?? [];
const manifestIds = classifications.map((row) => row.questionId);
const manifestSet = new Set(manifestIds);
const questionSet = new Set(questionIds);
const duplicateManifestIds = manifestIds.filter((id, index) => manifestIds.indexOf(id) !== index);
const missingManifestIds = questionIds.filter((id) => !manifestSet.has(id));
const extraManifestIds = manifestIds.filter((id) => !questionSet.has(id));

if (taxonomy.version !== 1) fail('taxonomy version must be 1');
if (manifest.questionCount !== 686) fail(`manifest.questionCount must be 686, got ${manifest.questionCount}`);
if (questions.size !== 686 || questionIds.length !== 686) fail(`question source must contain 686 records, got ${questionIds.length} records / ${questions.size} unique`);
if (classifications.length !== 686) fail(`manifest must contain 686 rows, got ${classifications.length}`);
if (duplicateManifestIds.length) fail(`duplicate manifest IDs: ${duplicateManifestIds.join(', ')}`);
if (missingManifestIds.length) fail(`missing manifest IDs: ${missingManifestIds.join(', ')}`);
if (extraManifestIds.length) fail(`manifest IDs not in question source: ${extraManifestIds.join(', ')}`);

const subjects = new Set(taxonomy.subjects);
const topics = new Set(taxonomy.topics);
const questionTypes = new Set(taxonomy.questionTypes);
const questionFormats = new Set(taxonomy.questionFormats);
const taskFormats = new Set(taxonomy.taskFormats);
const storageModes = new Set(taxonomy.storageModes);
const fixedSetDefs = new Map((taxonomy.fixedSets ?? []).map((set) => [set.fixedGroupId, set]));

if (taxonomy.subjects.length !== 5) fail('taxonomy must use exactly five application subjects');
if (fixedSetDefs.size !== 8) fail(`taxonomy must define eight fixed sets, got ${fixedSetDefs.size}`);

const poolMembership = new Map();
for (const row of classifications) {
  const question = questions.get(row.questionId);
  if (!question) { fail(`missing source question ${row.questionId}`); continue; }
  if (!subjects.has(row.subject)) fail(`${row.questionId}: unknown subject ${row.subject}`);
  if (question.subject !== row.subject) fail(`${row.questionId}: manifest subject does not match source`);
  if (!topics.has(row.topic)) fail(`${row.questionId}: topic not in taxonomy`);
  if (!questionTypes.has(row.questionType)) fail(`${row.questionId}: questionType not in taxonomy`);
  if (!questionFormats.has(row.questionFormat)) fail(`${row.questionId}: questionFormat not in taxonomy`);
  if (!taskFormats.has(row.taskFormat)) fail(`${row.questionId}: taskFormat not in taxonomy`);
  if (!storageModes.has(row.storageMode)) fail(`${row.questionId}: invalid storageMode`);
  if (!row.sourceFile || row.sourceFile !== question.sourceFile) fail(`${row.questionId}: sourceFile provenance mismatch`);
  if (row.storageMode === 'pool') {
    if (!row.poolId || !poolIndexes.has(row.poolId)) fail(`${row.questionId}: pool reference does not exist`);
    if (row.fixedGroupId !== null) fail(`${row.questionId}: pool item must have fixedGroupId null`);
    if (row.poolId) poolMembership.set(row.questionId, row.poolId);
  } else {
    if (row.poolId !== null) fail(`${row.questionId}: fixed-set item must have poolId null`);
    if (!row.fixedGroupId || !fixedSetDefs.has(row.fixedGroupId)) fail(`${row.questionId}: fixedGroupId does not exist`);
  }
}

for (const [poolId, pool] of poolIndexes) {
  if (!poolMembership.size && !taxonomy.pools.some((item) => item.poolId === poolId)) fail(`unregistered pool ${poolId}`);
  const taxonomyPool = taxonomy.pools.find((item) => item.poolId === poolId);
  if (!taxonomyPool) {
    fail(`pool ${poolId} is not registered in taxonomy`);
    continue;
  }
  const seen = new Set();
    for (const entry of pool.entries ?? []) {
    if (!isObject(entry) || typeof entry.questionId !== 'string') fail(`${poolId}: pool entry is not a reference object`);
    if (seen.has(entry.questionId)) fail(`${poolId}: duplicate question ${entry.questionId}`);
    seen.add(entry.questionId);
    if (!questions.has(entry.questionId)) fail(`${poolId}: unresolved question ${entry.questionId}`);
    const row = classifications.find((candidate) => candidate.questionId === entry.questionId);
    if (!row) fail(`${poolId}: ${entry.questionId} has no manifest row`);
    if (row?.subject !== taxonomyPool.subject) fail(`${poolId}: ${entry.questionId} subject mismatch`);
    if (row && !taxonomyPool.topics.includes(row.topic)) fail(`${poolId}: ${entry.questionId} topic is incompatible`);
    if (row && !taxonomyPool.questionFormats.includes(row.questionFormat)) fail(`${poolId}: ${entry.questionId} questionFormat is incompatible`);
    if (row && !taxonomyPool.taskFormats.includes(row.taskFormat)) fail(`${poolId}: ${entry.questionId} taskFormat is incompatible`);
    const rowPool = poolMembership.get(entry.questionId);
    if (rowPool !== poolId) fail(`${poolId}: ${entry.questionId} manifest pool mismatch`);
    if (Object.keys(entry).some((key) => key !== 'questionId' && key !== 'questionType' && key !== 'questionFormat' && key !== 'taskFormat')) {
      fail(`${poolId}: entry ${entry.questionId} contains unexpected full-content data`);
    }
  }
  if (pool.entries.length !== taxonomyPool.questionCount) fail(`${poolId}: pool count mismatch`);
}

for (const set of fixedSetDefs.values()) {
  const group = groupMap.get(set.fixedGroupId);
  if (!group) fail(`fixed group missing: ${set.fixedGroupId}`);
  if (group.selectionPolicy !== 'atomic' || group.orderPolicy !== 'fixed') fail(`${set.fixedGroupId}: not atomic/fixed`);
  if (JSON.stringify(group.questionIds) !== JSON.stringify(set.questionIds)) fail(`${set.fixedGroupId}: member order mismatch`);
  if (!group.contentBlocks?.length) fail(`${set.fixedGroupId}: shared content block missing`);
  for (const id of set.questionIds) {
    const row = classifications.find((item) => item.questionId === id);
    if (!row || row.fixedGroupId !== set.fixedGroupId || row.storageMode !== 'fixed-set') fail(`${set.fixedGroupId}: member ${id} classification mismatch`);
  }
}

const poolCount = poolIndexes.size;
const poolQuestionCount = classifications.filter((row) => row.storageMode === 'pool').length;
const fixedQuestionCount = classifications.filter((row) => row.storageMode === 'fixed-set').length;
const lowConfidence = classifications.filter((row) => row.confidence === 'low').length;
console.log(`Validated taxonomy v${taxonomy.version}: ${classifications.length} classifications, ${poolCount} reference-only pools, ${poolQuestionCount} pool questions, ${fixedQuestionCount} fixed-set questions.`);
console.log(`Fixed sets: ${fixedSetDefs.size}; low-confidence classifications: ${lowConfidence}.`);
