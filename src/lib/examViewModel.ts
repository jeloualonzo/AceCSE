import type { ExamSession, SessionItem } from '@/types';

/**
 * Booklet view-model: derives the continuous-exam rendering structure from a
 * session without mutating or re-deriving grouping from question subjects.
 *
 * Structural source of truth: `session.items` when present. Sessions saved
 * before grouped rendering existed, and practice sessions (which never
 * populate `items`), fall back to one flat, unsectioned run of
 * `questionIds` — this is what keeps old localStorage sessions resumable
 * and keeps practice's existing one-question flow unaffected.
 */

export type BookletNode =
  | { kind: 'question'; questionId: string }
  | { kind: 'group'; groupId: string; questionIds: string[] }
  | { kind: 'administrative'; id: string };

export interface BookletSection {
  /** A Subject name for a real scored section, or a synthetic key below. */
  sectionId: string;
  nodes: BookletNode[];
}

/** Synthetic section id used when a session has no structured `items` at all. */
export const LEGACY_SECTION_ID = '__legacy__';
/** Synthetic section id for structured items that omit `sectionId`. */
export const UNSECTIONED_ID = '__unsectioned__';

function toNode(item: SessionItem): BookletNode {
  if (item.kind === 'group') {
    return { kind: 'group', groupId: item.groupId, questionIds: item.questionIds };
  }
  if (item.kind === 'administrative') {
    return { kind: 'administrative', id: item.id };
  }
  return { kind: 'question', questionId: item.questionId };
}

function sectionKeyOf(item: SessionItem): string {
  return item.sectionId ?? UNSECTIONED_ID;
}

/**
 * Groups `session.items` into sections, preserving the order each section
 * first appears in. This does not re-sort or re-interleave anything — if the
 * engine ever produces non-contiguous sections (it doesn't today), each
 * appearance is folded into that section's existing bucket rather than
 * creating a duplicate section, since a real exam section is not meant to
 * be revisited later in the booklet.
 */
export function buildBooklet(session: ExamSession): BookletSection[] {
  if (session.items && session.items.length > 0) {
    const order: string[] = [];
    const bySection = new Map<string, BookletNode[]>();
    for (const item of session.items) {
      const key = sectionKeyOf(item);
      if (!bySection.has(key)) {
        bySection.set(key, []);
        order.push(key);
      }
      bySection.get(key)!.push(toNode(item));
    }
    return order.map((sectionId) => ({ sectionId, nodes: bySection.get(sectionId) ?? [] }));
  }

  return [
    {
      sectionId: LEGACY_SECTION_ID,
      nodes: session.questionIds.map((questionId) => ({ kind: 'question' as const, questionId })),
    },
  ];
}

export function isLegacyBooklet(sections: readonly BookletSection[]): boolean {
  return sections.length === 1 && sections[0].sectionId === LEGACY_SECTION_ID;
}

/**
 * Every scored question id in booklet reading order, with groups expanded
 * in place. Used for Previous/Next targets and the default "current
 * question" before the reader has scrolled. Administrative nodes contribute
 * no ids — they are never scored and never part of Previous/Next.
 */
export function bookletQuestionOrder(sections: readonly BookletSection[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    for (const node of section.nodes) {
      if (node.kind === 'question') ids.push(node.questionId);
      else if (node.kind === 'group') ids.push(...node.questionIds);
    }
  }
  return ids;
}

/** 1-based display number for every scored question, in booklet order. */
export function questionNumberMap(sections: readonly BookletSection[]): Map<string, number> {
  const order = bookletQuestionOrder(sections);
  return new Map(order.map((id, index) => [id, index + 1]));
}

export interface AnswerCounts {
  total: number;
  answered: number;
  unanswered: number;
}

/**
 * Answered/unanswered counts over the SCORED question set only.
 *
 * Deliberately reads `session.questionIds`, not booklet nodes: the engine
 * never adds administrative ids to `questionIds` (see examEngine.ts), so
 * this stays correct even before any administrative-section UI exists, and
 * it can't accidentally count a stray/unexpected key in `session.answers`.
 */
export function computeAnswerCounts(session: ExamSession): AnswerCounts {
  const total = session.questionIds.length;
  const answered = session.questionIds.filter((id) => Boolean(session.answers[id])).length;
  return { total, answered, unanswered: total - answered };
}

/** Human-readable label for a section id, for headings and the navigator. */
export function sectionTitle(sectionId: string): string {
  if (sectionId === LEGACY_SECTION_ID || sectionId === UNSECTIONED_ID) return 'Questions';
  return sectionId;
}
