import { describe, expect, it } from 'vitest';
import { createNormalizedCatalog, mergeNormalizedCatalogs } from '@/data/contentCatalog';
import { loadContentCatalog, loadGroupedFixtureCatalog } from '@/data/questionBank';
import { buildSimulationSession, scaledDistribution } from '@/lib/examEngine';
import type { Question, QuestionGroup, Subject } from '@/types';

const subjects: Subject[] = ['Numerical Reasoning', 'Analytical Reasoning', 'Verbal Ability', 'General Information'];
const allSubjects: Subject[] = [...subjects, 'Clerical Ability'];
const simulationCount = 20;
const verbalTarget = scaledDistribution('Professional', simulationCount)['Verbal Ability'];

function question(id: string, subject: Subject, index: number): Question {
  return { id, examLevel: 'Both', subject, topic: 'Verification', difficulty: 'Easy', question: `Question ${id}`, choices: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }, { id: 'C', text: 'C' }, { id: 'D', text: 'D' }], correctOptionId: 'A', explanation: 'Verification explanation.', tags: [`index-${index}`] };
}

function group(id: string, subject: Subject, ids: string[], selectionPolicy: QuestionGroup['selectionPolicy'] = 'atomic', orderPolicy: QuestionGroup['orderPolicy'] = 'fixed'): QuestionGroup {
  return { id, examLevel: 'Both', subject, topic: 'Verification', questionIds: ids, selectionPolicy, orderPolicy, tags: ['test'] };
}

function completeCatalog(extraGroups: QuestionGroup[], extraQuestions: Question[], includeVerbalFiller = false): ReturnType<typeof createNormalizedCatalog> {
  const fillerSubjects = includeVerbalFiller ? subjects : subjects.filter((subject) => subject !== 'Verbal Ability');
  const fillerQuestions = fillerSubjects.flatMap((subject) => Array.from({ length: 30 }, (_, index) => question(`${subject}-filler-${index}`, subject, index)));
  const fillerGroups = fillerQuestions.map((item) => group(`singleton-${item.id}`, item.subject, [item.id]));
  return createNormalizedCatalog([...fillerQuestions, ...extraQuestions], [...fillerGroups, ...extraGroups]);
}

describe('group-aware simulation verification', () => {
  it('keeps an atomic group together', async () => {
    const ids = Array.from({ length: verbalTarget }, (_, index) => `Q${index + 1}`);
    const questions = ids.map((id, index) => question(id, 'Verbal Ability', index));
    const catalog = completeCatalog([group('2lqk9w', 'Verbal Ability', ids)], questions);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'atomic', catalog });
    expect(session.items).toContainEqual({ kind: 'group', groupId: '2lqk9w', sectionId: 'Verbal Ability', questionIds: ids });
    expect(new Set(session.questionIds)).toHaveProperty('size', session.questionIds.length);
  });

  it('preserves fixed ordering', async () => {
    const ids = Array.from({ length: verbalTarget }, (_, index) => `Q${index + 1}`);
    const questions = ids.map((id, index) => question(id, 'Verbal Ability', index));
    const catalog = completeCatalog([group('zv1h7q', 'Verbal Ability', ids)], questions);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'fixed', catalog });
    expect(session.items).toContainEqual({ kind: 'group', groupId: 'zv1h7q', sectionId: 'Verbal Ability', questionIds: ids });
  });

  it('shuffles only within a shuffle-questions group', async () => {
    const ids = Array.from({ length: verbalTarget }, (_, index) => `Q${index + 1}`);
    const questions = ids.map((id, index) => question(id, 'Verbal Ability', index));
    const catalog = completeCatalog([group('f2p0v4', 'Verbal Ability', ids, 'atomic', 'shuffle-questions')], questions);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'shuffle', catalog });
    const item = session.items?.find((candidate) => candidate.kind === 'group' && candidate.groupId === 'f2p0v4');
    expect(item).toMatchObject({ kind: 'group', groupId: 'f2p0v4' });
    expect(new Set(item?.kind === 'group' ? item.questionIds : [])).toEqual(new Set(ids));
  });

  it('takes a fixed-order subset from a splittable group', async () => {
    const ids = Array.from({ length: verbalTarget + 2 }, (_, index) => `Q${index + 1}`);
    const questions = ids.map((id, index) => question(id, 'Verbal Ability', index));
    const catalog = completeCatalog([group('split', 'Verbal Ability', ids, 'splittable')], questions);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'split', catalog });
    const item = session.items?.find((candidate) => candidate.kind === 'group' && candidate.groupId === 'split');
    expect(item).toMatchObject({ kind: 'group', questionIds: ids.slice(0, verbalTarget) });
  });

  it('prevents duplicate IDs and preserves configured section order', async () => {
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'sections', catalog: completeCatalog([], [], true) });
    expect(new Set(session.questionIds).size).toBe(session.questionIds.length);
    const sectionIndexes = session.items?.map((item) => subjects.indexOf(item.sectionId as Subject)) ?? [];
    expect(sectionIndexes.every((value, index) => index === 0 || value >= sectionIndexes[index - 1])).toBe(true);
  });

  it('reproduces structure for the same seed and permits variation for another seed', async () => {
    const catalog = completeCatalog([], [], true);
    const a = await buildSimulationSession('Professional', simulationCount, { seed: '7b8nq0', catalog });
    const b = await buildSimulationSession('Professional', simulationCount, { seed: '7b8nq0', catalog });
    const c = await buildSimulationSession('Professional', simulationCount, { seed: 'different', catalog });
    expect(a.items).toEqual(b.items);
    expect(a.questionIds).toEqual(b.questionIds);
    expect(c.questionIds).toEqual(expect.any(Array));
  });

  it('runs the explicit grouped fixture through the real session path', async () => {
    const ids = Array.from({ length: verbalTarget }, (_, index) => `FIXTURE-Q${index + 1}`);
    const questions = ids.map((id, index) => question(id, 'Verbal Ability', index));
    const fixtureGroup = group('fixture-reading-set-001', 'Verbal Ability', ids);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'fixture', catalog: completeCatalog([fixtureGroup], questions) });
    expect(session.items).toContainEqual({ kind: 'group', groupId: 'fixture-reading-set-001', sectionId: 'Verbal Ability', questionIds: ids });
    expect(session.questionIds).toContain(ids[0]);
    console.log(JSON.stringify({ items: session.items?.filter((item) => item.kind === 'group' && item.groupId === 'fixture-reading-set-001'), questionIds: session.questionIds.filter((id) => ids.includes(id)) }));
  });
});

describe('production and fixture verification', () => {
  it('loads the 688-question production bank and generates a valid simulation', async () => {
    const catalog = await loadContentCatalog(allSubjects);
    expect(catalog.questions.size).toBe(688);
    expect(catalog.groups.size).toBe(688);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'production-688', catalog });
    expect(session.questionIds).toHaveLength(simulationCount);
    expect(new Set(session.questionIds).size).toBe(simulationCount);
    expect(session.items?.every((item) => item.kind === 'group')).toBe(true);
  });

  it('loads the explicit fixture and sends its group through session generation', async () => {
    const fixture = await loadGroupedFixtureCatalog();
    expect(fixture.groups.has('fixture-reading-set-001')).toBe(true);
    expect(fixture.getGroup('fixture-reading-set-001')?.questionIds).toEqual(['FIXTURE-Q1', 'FIXTURE-Q2', 'FIXTURE-Q3']);
    const productionQuestions = subjects.filter((subject) => subject !== 'Verbal Ability').flatMap((subject) => Array.from({ length: 30 }, (_, index) => question(`${subject}-fixture-filler-${index}`, subject, index)));
    const verbalFillers = Array.from({ length: verbalTarget - 3 }, (_, index) => question(`verbal-fixture-filler-${index}`, 'Verbal Ability', index));
    const productionGroups = productionQuestions.map((item) => group(`fixture-filler-${item.id}`, item.subject, [item.id]));
    productionGroups.push(group('verbal-fixture-filler-group', 'Verbal Ability', verbalFillers.map((item) => item.id)));
    const production = createNormalizedCatalog([...productionQuestions, ...verbalFillers], productionGroups);
    const catalog = mergeNormalizedCatalogs(production, fixture);
    const session = await buildSimulationSession('Professional', simulationCount, { seed: 'fixture-real-loader', catalog });
    expect(session.items).toContainEqual({ kind: 'group', groupId: 'fixture-reading-set-001', sectionId: 'Verbal Ability', questionIds: ['FIXTURE-Q1', 'FIXTURE-Q2', 'FIXTURE-Q3'] });
    expect(session.questionIds).toEqual(expect.arrayContaining(['FIXTURE-Q1', 'FIXTURE-Q2', 'FIXTURE-Q3']));
  });
});

describe('group packing contract', () => {
  it('documents greedy atomic packing fallback without exceeding a target', async () => {
    const sizes = [5, 5, 8, 7, 4];
    const questions = sizes.flatMap((size, groupIndex) => Array.from({ length: size }, (_, index) => question(`P-${groupIndex}-${index}`, 'Verbal Ability', index)));
    const groups = sizes.map((size, groupIndex) => group(`pack-${groupIndex}`, 'Verbal Ability', Array.from({ length: size }, (_, index) => `P-${groupIndex}-${index}`)));
    await expect(buildSimulationSession('Professional', simulationCount, { seed: 'packing', catalog: completeCatalog(groups, questions) })).rejects.toThrow('Not enough unique questions for: Verbal Ability');
  });
});
