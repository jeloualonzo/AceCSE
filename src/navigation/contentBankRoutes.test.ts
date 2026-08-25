import { describe, expect, it } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { slugForFamily, slugForSubject, subjectFromSlug } from '@/data/contentBankWorkspace';
import {
  CONTENT_BANK_BASE,
  CONTENT_BANK_BATCH_SEGMENT,
  CONTENT_BANK_STRUCTURES_SEGMENT,
  contentBankBatchPath,
  contentBankBatchReviewPath,
  contentBankFamilyPath,
  contentBankStructuresPath,
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
   * `/admin/content-bank/batch/:batchId` and `/admin/content-bank/:subjectSlug`
   * are both two segments deep under the base. React Router prefers the static
   * segment, but that only matters if no subject actually slugs to `batch` —
   * otherwise a real subject would become unreachable behind the batch route.
   */
  it('never produces a subject slug that collides with the batch segment', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(slugForSubject(subject)).not.toBe(CONTENT_BANK_BATCH_SEGMENT);
    }
  });

  /**
   * Same guarantee for the structures workspace. `structures/:subjectSlug` and
   * `:subjectSlug/:familySlug` match the same two-segment shape, so the only way
   * they can collide is a subject slugging to `structures` — which would hide a
   * real subject workspace behind the structures route.
   */
  it('never produces a subject slug that collides with the structures segment', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(slugForSubject(subject)).not.toBe(CONTENT_BANK_STRUCTURES_SEGMENT);
    }
  });

  it('keeps the batch and structures segments distinct from each other', () => {
    expect(CONTENT_BANK_STRUCTURES_SEGMENT).not.toBe(CONTENT_BANK_BATCH_SEGMENT);
  });

  /**
   * The structures path is one segment deeper than a subject path and puts the
   * static segment first, so it can never be read as a subject/family pair.
   */
  it('builds structures paths as structures/<subject slug>', () => {
    expect(contentBankStructuresPath('Clerical Ability')).toBe(
      '/admin/content-bank/structures/clerical',
    );
    expect(contentBankStructuresPath('General Information')).toBe(
      '/admin/content-bank/structures/general-information',
    );
    for (const subject of ALL_SUBJECTS) {
      const path = contentBankStructuresPath(subject);
      expect(path.startsWith(`${CONTENT_BANK_BASE}/${CONTENT_BANK_STRUCTURES_SEGMENT}/`)).toBe(true);
      // The final segment must round-trip, since the page reads it back.
      expect(subjectFromSlug(path.split('/').pop() ?? '')).toBe(subject);
    }
  });

  it('never builds the same path for two different subjects', () => {
    const paths = ALL_SUBJECTS.map((subject) => contentBankStructuresPath(subject));
    expect(new Set(paths).size).toBe(ALL_SUBJECTS.length);
  });

  it('round-trips every subject slug back to its subject', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(subjectFromSlug(slugForSubject(subject))).toBe(subject);
    }
  });

  /**
   * The Content Bank is an admin surface, so every path it builds must sit in the
   * admin tree. A path that leaked back under `/app` would render inside the
   * learner shell — where `RequireAdmin` does not sit, and where learners would
   * see Content Bank chrome.
   */
  it('builds every path inside the admin tree, never the learner tree', () => {
    const paths = [
      CONTENT_BANK_BASE,
      contentBankSubjectPath('Clerical Ability'),
      contentBankFamilyPath('Clerical Ability', 'Filing & Alphabetizing'),
      contentBankBatchPath('filing-batch-02'),
      contentBankBatchReviewPath('filing-batch-02'),
      contentBankStructuresPath('Clerical Ability'),
    ];
    for (const path of paths) {
      expect(path.startsWith('/admin/')).toBe(true);
      expect(path.startsWith('/app/')).toBe(false);
    }
  });

  it('builds subject paths under the base', () => {
    expect(contentBankSubjectPath('Clerical Ability')).toBe('/admin/content-bank/clerical');
    expect(contentBankSubjectPath('General Information')).toBe('/admin/content-bank/general-information');
    for (const subject of ALL_SUBJECTS) {
      expect(contentBankSubjectPath(subject).startsWith(`${CONTENT_BANK_BASE}/`)).toBe(true);
    }
  });

  it('builds family paths that nest inside their subject', () => {
    const path = contentBankFamilyPath('Clerical Ability', 'Filing & Alphabetizing');
    expect(path.startsWith(`${contentBankSubjectPath('Clerical Ability')}/`)).toBe(true);
    expect(path).toBe('/admin/content-bank/clerical/filing-alphabetizing');
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
      '/admin/content-bank/batch/spelling%20batch%2F01',
    );
  });

  it('builds batch and review paths', () => {
    expect(contentBankBatchPath('filing-batch-02')).toBe('/admin/content-bank/batch/filing-batch-02');
    expect(contentBankBatchReviewPath('filing-batch-02')).toBe(
      '/admin/content-bank/batch/filing-batch-02/review',
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
