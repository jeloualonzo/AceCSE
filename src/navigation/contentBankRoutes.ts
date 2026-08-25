import { slugForFamily, slugForSubject } from '@/data/contentBankWorkspace';
import { ADMIN_BASE, CONTENT_BANK_SEGMENT } from '@/navigation/appRoutes';
import type { Subject } from '@/types';

/**
 * Every Content Bank URL, built in one place.
 *
 * The admin area nests four deep, so hand-writing these strings across five
 * pages is how a broken link ships. Builders also keep the escaping consistent:
 * batch ids and family slugs are generated, but they are still interpolated into
 * a path, so they go through `encodeURIComponent`.
 *
 * The base is composed from `ADMIN_BASE` rather than spelled out, because the
 * Content Bank lives in the admin experience — it is not a learner surface and
 * never appears in learner navigation.
 */
export const CONTENT_BANK_BASE = `${ADMIN_BASE}/${CONTENT_BANK_SEGMENT}`;

/**
 * The literal segment that introduces a batch URL.
 *
 * Batch ids are globally unique, so a batch needs no subject/family context to
 * be found — and a flat URL cannot disagree with itself the way
 * `/clerical/spelling/batch/filing-batch-02` could. React Router scores a static
 * segment (10) above a dynamic one (3), so `batch/:batchId` (13) always beats
 * `:subjectSlug/:familySlug` (6) and the two patterns cannot collide. No subject
 * slug is `batch`; `contentBankRoutes.test.ts` holds that true.
 */
export const CONTENT_BANK_BATCH_SEGMENT = 'batch';

/**
 * The literal segment that introduces the structures (groups, directions,
 * instructions) workspace for one subject.
 *
 * Static-first for the same reason as `batch`: `structures/:subjectSlug` (13)
 * outranks `:subjectSlug/:familySlug` (6), so it cannot be mistaken for a
 * subject/family pair. No subject slug is `structures`;
 * `contentBankRoutes.test.ts` holds that true.
 */
export const CONTENT_BANK_STRUCTURES_SEGMENT = 'structures';

export function contentBankSubjectPath(subject: Subject): string {
  return `${CONTENT_BANK_BASE}/${slugForSubject(subject)}`;
}

export function contentBankStructuresPath(subject: Subject): string {
  return `${CONTENT_BANK_BASE}/${CONTENT_BANK_STRUCTURES_SEGMENT}/${slugForSubject(subject)}`;
}

export function contentBankFamilyPath(subject: Subject, family: string): string {
  return `${contentBankSubjectPath(subject)}/${encodeURIComponent(slugForFamily(family))}`;
}

export function contentBankBatchPath(batchId: string): string {
  return `${CONTENT_BANK_BASE}/${CONTENT_BANK_BATCH_SEGMENT}/${encodeURIComponent(batchId)}`;
}

export function contentBankBatchReviewPath(batchId: string): string {
  return `${contentBankBatchPath(batchId)}/review`;
}
