import { describe, expect, it } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { slugForFamily, slugForSubject, subjectFromSlug } from '@/data/contentBankWorkspace';
import {
  CONTENT_BANK_BASE,
  CONTENT_BANK_BATCH_SEGMENT,
  contentBankBatchPath,
  contentBankBatchReviewPath,
  contentBankFamilyPath,
  contentBankSubjectPath,
} from '@/navigation/contentBankRoutes';
import type { Subject } from '@/types';

const ALL_SUBJECTS: readonly Subject[] = [
  ...new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional]),
];

describe('Content Bank route builders', () => {
  it('covers every subject in the closed set', () => {
    expect(ALL_SUBJECTS).toHaveLength(5);
  });

  /**
   * `/app/content-bank/batch/:batchId` and `/app/content-bank/:subjectSlug` are
   * both two segments deep. React Router prefers the static segment, but that
   * only matters if no subject actually slugs to `batch` — otherwise a real
   * subject would become unreachable behind the batch route.
   */
  it('never produces a subject slug that collides with the batch segment', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(slugForSubject(subject)).not.toBe(CONTENT_BANK_BATCH_SEGMENT);
    }
  });

  it('round-trips every subject slug back to its subject', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(subjectFromSlug(slugForSubject(subject))).toBe(subject);
    }
  });

  it('builds subject paths under the base', () => {
    expect(contentBankSubjectPath('Clerical Ability')).toBe('/app/content-bank/clerical');
    expect(contentBankSubjectPath('General Information')).toBe('/app/content-bank/general-information');
    for (const subject of ALL_SUBJECTS) {
      expect(contentBankSubjectPath(subject).startsWith(`${CONTENT_BANK_BASE}/`)).toBe(true);
    }
  });

  it('builds family paths that nest inside their subject', () => {
    const path = contentBankFamilyPath('Clerical Ability', 'Filing & Alphabetizing');
    expect(path.startsWith(`${contentBankSubjectPath('Clerical Ability')}/`)).toBe(true);
    expect(path).toBe('/app/content-bank/clerical/filing-alphabetizing');
  });

  /**
   * The family segment is the slug, so the Family Workspace must be able to
   * match the family again from it. This is the pair a broken link would break.
   */
  it('produces a family segment equal to the family slug', () => {
    const family = 'Filing & Alphabetizing';
    const segment = contentBankFamilyPath('Clerical Ability', family).split('/').pop() ?? '';
    expect(decodeURIComponent(segment)).toBe(slugForFamily(family));
  });

  it('keeps punctuation out of the family segment', () => {
    for (const family of ['Grammar / Usage', 'Filing & Alphabetizing', 'Word Analogy (Pairs)']) {
      const segment = contentBankFamilyPath('Verbal Ability', family).split('/').pop() ?? '';
      expect(segment).toMatch(/^[a-z0-9-]+$/);
      expect(contentBankFamilyPath('Verbal Ability', family).split('/')).toHaveLength(5);
    }
  });

  it('escapes characters in a batch id that would change the path shape', () => {
    expect(contentBankBatchPath('spelling batch/01')).toBe(
      '/app/content-bank/batch/spelling%20batch%2F01',
    );
  });

  it('builds batch and review paths', () => {
    expect(contentBankBatchPath('filing-batch-02')).toBe('/app/content-bank/batch/filing-batch-02');
    expect(contentBankBatchReviewPath('filing-batch-02')).toBe(
      '/app/content-bank/batch/filing-batch-02/review',
    );
  });

  it('nests the review path inside its batch path', () => {
    const batchId = 'grammar-pilot-01';
    expect(contentBankBatchReviewPath(batchId).startsWith(`${contentBankBatchPath(batchId)}/`)).toBe(true);
  });

  it('keeps family slugs stable for the same family name', () => {
    expect(slugForFamily('Filing & Alphabetizing')).toBe(slugForFamily('Filing & Alphabetizing'));
    expect(contentBankFamilyPath('Clerical Ability', 'Spelling')).toBe(
      contentBankFamilyPath('Clerical Ability', 'Spelling'),
    );
  });
});
