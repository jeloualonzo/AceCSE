import { describe, expect, it } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { QUESTION_MANIFEST } from '@/data/questionBank';
import { getCanonicalPool } from '@/data/taxonomy';
import { getVisiblePracticeItemSets, isCanonicalPoolBackedGroup } from '@/data/practiceCatalog';

describe('Practice item-set visibility', () => {
  it('hides historical pool-like Spelling groups while retaining canonical Spelling and fixed-context sets', () => {
    const visible = getVisiblePracticeItemSets(
      QUESTION_MANIFEST.groups,
      'Subprofessional',
      SUBJECTS_BY_LEVEL.Subprofessional
    );
    const visibleIds = new Set(visible.map((group) => group.id));

    expect(visibleIds.has('grp-spelling-01')).toBe(false);
    expect(visibleIds.has('grp-spelling-02')).toBe(false);
    expect(isCanonicalPoolBackedGroup(QUESTION_MANIFEST.groups.find((group) => group.id === 'grp-spelling-01')!)).toBe(true);
    expect(getCanonicalPool('clerical-spelling')?.entries).toHaveLength(14);
    expect(visibleIds.has('grp-rc-public-trust')).toBe(true);
  });

  it('does not treat atomic fixed-context groups as canonical pool-backed history', () => {
    const fixed = QUESTION_MANIFEST.groups.find((group) => group.id === 'grp-rc-public-trust');
    expect(fixed).toBeDefined();
    expect(isCanonicalPoolBackedGroup(fixed!)).toBe(false);
  });
});
