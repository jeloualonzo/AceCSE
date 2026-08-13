import React from 'react';
import { edqApplicability } from '@/data/edq';
import type { EdqRenderContext } from './SectionRenderer';

export interface AdministrativeItemRendererProps {
  id: string;
  /** Session-based booklet number (EDQ items occupy 1–20). */
  displayNumber: number;
  /** Render this item's shared run instruction above it (first of its run). */
  showGroupHeader?: boolean;
  edq?: EdqRenderContext;
}

/**
 * One administrative (EDQ) item. Contract:
 *
 *  - clearly labeled as administrative and never scored
 *  - answer controls are read-only until EDQ Response Mode is enabled
 *  - responses are OPTIONAL, live only in the local session
 *    (localStorage), and are NEVER written to Firestore — grading builds
 *    the Attempt from scored `questionIds` only
 *  - numbered by its booklet position (1–20), so the examinee learns the
 *    real structure: the test proper starts at 21
 */
export const AdministrativeItemRenderer: React.FC<AdministrativeItemRendererProps> = ({
  id,
  displayNumber,
  showGroupHeader = false,
  edq,
}) => {
  const item = edq?.getItem(id);
  if (!item) {
    return (
      <div
        className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400"
        role="note"
        aria-label="Administrative item — not scored"
      >
        Administrative item ({id}) — never counted toward your score.
      </div>
    );
  }

  // Conditional structure: 'not-applicable' mirrors the real questionnaire's
  // "answer only the item that applies to you" runs. 'unknown' (controlling
  // item unanswered) stays enabled — the examinee decides.
  const applicability = edqApplicability(item, edq?.answers ?? {});
  const notApplicable = applicability === 'not-applicable';
  const interactive = edq?.responseMode === true && !notApplicable;
  const selected = edq?.answers[id];

  return (
    <div
      id={`question-${id}`}
      data-question-id={id}
      tabIndex={-1}
      className="scroll-mt-4 focus:outline-none"
      aria-label={`Item ${displayNumber}, administrative, not scored${notApplicable ? ', not applicable based on an earlier response' : ''}`}
    >
      {showGroupHeader && item.instruction && (
        <div className="mb-4 rounded-r-lg border-l-4 border-l-slate-400 dark:border-l-slate-500 border-y border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
          {item.groupLabel && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {item.groupLabel}
            </p>
          )}
          <p className="text-sm text-black dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {item.instruction}
          </p>
        </div>
      )}
      <div className="flex items-center gap-2.5 flex-wrap mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Item {displayNumber}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Not scored
        </span>
        {notApplicable && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
            Not applicable based on your earlier response
          </span>
        )}
      </div>

      <p className="text-base sm:text-lg font-medium text-black dark:text-slate-100 leading-relaxed mb-3">
        {item.prompt}
      </p>

      <div className="space-y-2" role={interactive ? 'radiogroup' : undefined} aria-label={item.prompt}>
        {item.options.map((option, optionIndex) => {
          const isSelected = selected === option;
          const base =
            'w-full text-left flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-lg border text-sm transition-colors';
          if (!interactive) {
            return (
              <div
                key={option}
                className={`${base} bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400`}
                aria-disabled="true"
              >
                <span className="w-6 h-6 rounded text-[11px] font-bold font-mono flex items-center justify-center shrink-0 border bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700">
                  {optionIndex + 1}
                </span>
                <span>{option}</span>
              </div>
            );
          }
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => edq?.onSelect(id, option)}
              className={`${base} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 text-black dark:text-white ring-1 ring-emerald-500/40'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-black dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span
                className={`w-6 h-6 rounded text-[11px] font-bold font-mono flex items-center justify-center shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                {optionIndex + 1}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
