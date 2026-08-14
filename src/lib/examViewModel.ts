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
  | { kind: 'pool'; poolId: string; questionType: string; taskFormat: string; questionIds: string[] }
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
  if (item.kind === 'pool') {
    return {
      kind: 'pool',
      poolId: item.poolId,
      questionType: item.questionType,
      taskFormat: item.taskFormat,
      questionIds: item.questionIds,
    };
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
 * in place. Administrative nodes contribute no ids here — this is the
 * SCORED order (grading, answer counts).
 */
export function bookletQuestionOrder(sections: readonly BookletSection[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    for (const node of section.nodes) {
      if (node.kind === 'question') ids.push(node.questionId);
      else if (node.kind === 'group' || node.kind === 'pool') ids.push(...node.questionIds);
    }
  }
  return ids;
}

/**
 * Every DISPLAYABLE item id in booklet reading order — administrative (EDQ)
 * items included. This is the sequence display numbers are assigned from.
 */
export function bookletItemOrder(sections: readonly BookletSection[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    for (const node of section.nodes) {
      if (node.kind === 'question') ids.push(node.questionId);
      else if (node.kind === 'group' || node.kind === 'pool') ids.push(...node.questionIds);
      else ids.push(node.id);
    }
  }
  return ids;
}

/**
 * SESSION-BASED display numbers: one continuous 1..N sequence across the
 * whole generated booklet. Administrative EDQ items occupy 1–20, the first
 * scored question is 21, and numbering NEVER resets between subjects.
 * Content ids stay permanent — these numbers exist only for this session.
 */
export function sessionNumberMap(sections: readonly BookletSection[]): Map<string, number> {
  const order = bookletItemOrder(sections);
  return new Map(order.map((id, index) => [id, index + 1]));
}

/** @deprecated scored-only numbering — kept for legacy callers; prefer sessionNumberMap. */
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

/** Synthetic-free label for a section id, for headings and the navigator. */
export function sectionTitle(sectionId: string): string {
  if (sectionId === LEGACY_SECTION_ID || sectionId === UNSECTIONED_ID) return 'Questions';
  if (sectionId === 'EDQ') return 'Examinee Descriptive Questionnaire';
  return sectionId;
}

/** Compact label for tight UI (subject buttons). */
export function sectionShortTitle(sectionId: string): string {
  if (sectionId === 'EDQ') return 'EDQ';
  return sectionTitle(sectionId);
}

// ---------------------------------------------------------------------------
// Subject-scoped helpers.
//
// The booklet is continuous WITHIN a subject/section, not across the whole
// exam — each BookletSection is shown as its own view, switched via a
// subject tab control, so numbering, ordering, and navigator grids below are
// all deliberately scoped to a single section rather than the whole session.
// ---------------------------------------------------------------------------

/** Every scored question id within one section, in reading order (groups expanded). */
export function sectionQuestionOrder(section: BookletSection): string[] {
  const ids: string[] = [];
  for (const node of section.nodes) {
    if (node.kind === 'question') ids.push(node.questionId);
    else if (node.kind === 'group' || node.kind === 'pool') ids.push(...node.questionIds);
  }
  return ids;
}

/**
 * Every DISPLAYABLE item id within one section (administrative items
 * included) — Previous/Next and scroll-spy walk this, so the EDQ section is
 * navigable exactly like a scored section.
 */
export function sectionItemOrder(section: BookletSection): string[] {
  const ids: string[] = [];
  for (const node of section.nodes) {
    if (node.kind === 'question') ids.push(node.questionId);
    else if (node.kind === 'group' || node.kind === 'pool') ids.push(...node.questionIds);
    else ids.push(node.id);
  }
  return ids;
}

/** Answered/unanswered counts scoped to one section — powers the subject tab badges. */
export function computeSectionAnswerCounts(
  section: BookletSection,
  answers: Readonly<Record<string, string>>
): AnswerCounts {
  const order = sectionQuestionOrder(section);
  const answered = order.filter((id) => Boolean(answers[id])).length;
  return { total: order.length, answered, unanswered: order.length - answered };
}

export interface NavigatorBlock {
  ids: string[];
  /** True for a block of administrative (EDQ) items — rendered muted, never scored. */
  administrative?: boolean;
  /** Present for a real multi-question group; retained for legacy navigation. */
  groupId?: string;
  /** Present for a canonical semantic pool block. */
  poolId?: string;
  /** Task/presentation label for a canonical pool block. */
  taskFormat?: string;
  /** Canonical skill label for a canonical pool block. */
  questionType?: string;
}

/**
 * Buckets a section's nodes into navigator grid blocks. Consecutive plain
 * questions and singleton groups (questionIds.length <= 1) are merged into
 * one shared block so they render as a single continuous grid. A real
 * multi-question group gets its own block (optionally labeled by the
 * caller via its groupId) without breaking the surrounding grid into a
 * vertical stack. Administrative nodes carry no question ids and are
 * excluded — they are never scored, so they don't belong in a question grid.
 */
export function navigatorBlocks(section: BookletSection): NavigatorBlock[] {
  const blocks: NavigatorBlock[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length > 0) {
      blocks.push({ ids: buffer });
      buffer = [];
    }
  };

  let adminBuffer: string[] = [];
  const flushAdmin = () => {
    if (adminBuffer.length > 0) {
      blocks.push({ ids: adminBuffer, administrative: true });
      adminBuffer = [];
    }
  };

  for (const node of section.nodes) {
    if (node.kind === 'administrative') {
      flush();
      adminBuffer.push(node.id);
      continue;
    }
    flushAdmin();
    if (node.kind === 'question') {
      buffer.push(node.questionId);
      continue;
    }
    // group or canonical pool block
    if (node.questionIds.length <= 1) {
      buffer.push(...node.questionIds);
      continue;
    }
    flush();
    blocks.push({ ids: node.questionIds, groupId: node.kind === 'group' ? node.groupId : undefined, poolId: node.kind === 'pool' ? node.poolId : undefined, taskFormat: node.kind === 'pool' ? node.taskFormat : undefined, questionType: node.kind === 'pool' ? node.questionType : undefined });
  }
  flush();
  flushAdmin();
  return blocks;
}
