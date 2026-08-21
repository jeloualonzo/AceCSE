import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';
import {
  allClassifications,
  CANONICAL_TAXONOMY,
  getCanonicalPool,
  getClassification,
} from '@/data/taxonomy';
import type { Subject } from '@/types';
import { buildSimulationSession } from '@/lib/examEngine';

const subjects: Subject[] = [
  'Numerical Reasoning',
  'Analytical Reasoning',
  'Verbal Ability',
  'Clerical Ability',
  'General Information',
];

const fixedIds = [
  'grp-di-employment',
  'grp-di-roadworks',
  'grp-rc-public-trust',
  'grp-rc-csc',
  'grp-rc-property',
  'grp-rc-careers',
  'grp-rc-frontline',
  'grp-rc-appointments',
];

describe('canonical taxonomy', () => {
  it('classifies exactly 686 unique questions', () => {
    const records = allClassifications();
    expect(records).toHaveLength(686);
    expect(new Set(records.map((record) => record.questionId)).size).toBe(686);
    expect(records.every((record) => record.sourceFile.startsWith('content/questions/'))).toBe(true);
  });

  it('keeps every pool reference resolvable and reference-only', () => {
    const poolIds = new Set(CANONICAL_TAXONOMY.pools.map((pool) => pool.poolId));
    expect(poolIds.size).toBeGreaterThan(0);
    for (const record of allClassifications()) {
      if (record.storageMode === 'pool') {
        expect(record.poolId).toBeTruthy();
        expect(poolIds.has(record.poolId!)).toBe(true);
        expect(record.fixedGroupId).toBeNull();
      }
    }
    for (const pool of CANONICAL_TAXONOMY.pools) {
      const loaded = getCanonicalPool(pool.poolId);
      expect(loaded).toBeDefined();
      expect(loaded?.entries.every((entry) => Object.keys(entry).sort().join(',') === 'questionFormat,questionId,questionType,taskFormat')).toBe(true);
      expect(loaded?.entries.every((entry) => getClassification(entry.questionId)?.poolId === pool.poolId)).toBe(true);
    }
  });

  it('keeps the eight true shared-context sets fixed and separate from pools', () => {
    expect(CANONICAL_TAXONOMY.fixedSets.map((set) => set.fixedGroupId).sort()).toEqual([...fixedIds].sort());
    for (const id of fixedIds) {
      const set = CANONICAL_TAXONOMY.fixedSets.find((candidate) => candidate.fixedGroupId === id);
      expect(set?.selectionPolicy).toBe('atomic');
      expect(set?.orderPolicy).toBe('fixed');
      expect(set?.questionIds.length).toBeGreaterThan(1);
      expect(set?.questionIds.every((questionId) => getClassification(questionId)?.fixedGroupId === id)).toBe(true);
    }
  });

  it('preserves explicit letter-series corrections and task-format distinctions', () => {
    expect(getClassification('ana-0038')?.questionFormat).toBe('letter_sequence');
    expect(getClassification('ana-0040')?.questionFormat).toBe('letter_sequence');
    expect(getClassification('cler-0001')?.taskFormat).toBe('shared_filing_task');
    expect(getClassification('cler-0012')?.taskFormat).toBe('shared_spelling_task');
    expect(getClassification('num-0019')?.taskFormat).toBe('number_sequence');
  });

  it('allocates production simulations through canonical pool blocks', async () => {
    const catalog = await loadContentCatalog(subjects);
    for (const level of ['Professional', 'Subprofessional'] as const) {
      const count = level === 'Professional' ? 150 : 145;
      for (const seed of ['taxonomy-runtime-1', 'taxonomy-runtime-2', 'taxonomy-runtime-3']) {
        const session = await buildSimulationSession(level, count, { seed, catalog });
        const poolItems = (session.items ?? []).filter((item) => item.kind === 'pool');
        const groupItems = (session.items ?? []).filter((item) => item.kind === 'group');
        expect(session.questionIds).toHaveLength(count);
        expect(new Set(session.questionIds).size).toBe(count);
        expect(poolItems.length).toBeGreaterThan(0);
        expect(poolItems.every((item) => catalog.pools.has(item.poolId))).toBe(true);
        expect(poolItems.every((item) => item.questionIds.length > 0)).toBe(true);
        expect(groupItems.every((item) => fixedIds.includes(item.groupId))).toBe(true);
        expect(groupItems.every((item) => {
          const fixed = CANONICAL_TAXONOMY.fixedSets.find((set) => set.fixedGroupId === item.groupId);
          return fixed ? item.questionIds.join('|') === fixed.questionIds.join('|') : false;
        })).toBe(true);
      }
    }
  });
});
