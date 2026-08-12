import React from 'react';

export interface AdministrativeItemRendererProps {
  id: string;
}

/**
 * Rendering boundary for non-scored administrative content (e.g. a future
 * personal-information section). Deliberately minimal — the actual form is a
 * separate content/product decision, not part of this phase. This only
 * establishes that such items:
 *
 *  - render outside the normal question flow, with no answer-choice UI
 *  - are visually and semantically marked as not scored
 *  - can never enter the scored count: `computeAnswerCounts` in
 *    `examViewModel.ts` reads `session.questionIds` only, and the engine
 *    never adds administrative ids there
 *
 * No session currently produces a `kind: 'administrative'` item — this
 * exists so the booklet doesn't need a follow-up structural change the day
 * one does.
 */
export const AdministrativeItemRenderer: React.FC<AdministrativeItemRendererProps> = ({ id }) => (
  <div
    className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400"
    role="note"
    aria-label="Administrative section — not scored"
  >
    Administrative section ({id}) — not yet implemented, and never counted toward your score.
  </div>
);
