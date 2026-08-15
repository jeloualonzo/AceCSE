import type { ExamLevel, Subject } from '@/types';
import type { GroupMeta } from '@/data/questionShape';
import { getCanonicalPoolsForSubject } from '@/data/taxonomy';

/**
 * Historical splittable groups are retained as source/provenance records but
 * are not separate semantic Practice choices once their topic is represented
 * by a canonical pool/task format. Atomic fixed-context groups remain visible.
 */
export function isCanonicalPoolBackedGroup(group: GroupMeta): boolean {
  if (group.selectionPolicy !== 'splittable' || !group.tags?.includes('item-set')) return false;
  return getCanonicalPoolsForSubject(group.subject).some((pool) =>
    Boolean(group.topic) && pool.topics.includes(group.topic!) && pool.taskFormats.length > 0
  );
}

export function getVisiblePracticeItemSets(
  groups: readonly GroupMeta[],
  level: ExamLevel,
  subjects: readonly Subject[]
): GroupMeta[] {
  return groups
    .filter((group) => (group.examLevel === 'Both' || group.examLevel === level) && subjects.includes(group.subject))
    .filter((group) => !isCanonicalPoolBackedGroup(group));
}
