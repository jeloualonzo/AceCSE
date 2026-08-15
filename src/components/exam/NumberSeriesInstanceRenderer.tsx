import React from 'react';
import type { Question } from '@/types';

interface NumberSeriesPayload {
  instanceFormat?: unknown;
  sequence?: unknown;
  missingPosition?: unknown;
  itemPrompt?: unknown;
}

function compactNumberSeriesPayload(question: Question): NumberSeriesPayload | null {
  if (question.taskInstance?.kind !== 'number_series') return null;
  const payload = question.taskInstance.payload as NumberSeriesPayload;
  return payload.instanceFormat === 'compact' ? payload : null;
}

export function hasCompactNumberSeriesInstance(question: Question): boolean {
  return compactNumberSeriesPayload(question) !== null;
}

export const NumberSeriesInstanceRenderer: React.FC<{ question: Question }> = ({ question }) => {
  const payload = compactNumberSeriesPayload(question);
  if (!payload || !Array.isArray(payload.sequence)) return null;
  const itemPrompt = typeof payload.itemPrompt === 'string' ? payload.itemPrompt : undefined;
  return (
    <div className="mb-6">
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono"
        aria-label="Number series"
      >
        {payload.sequence.map((term, index) => (
          <React.Fragment key={`${question.id}-${index}`}>
            {index > 0 && <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>}
            <span
              data-sequence-position={index + 1}
              className={term === null ? 'inline-flex min-w-[2.5rem] justify-center border-b-2 border-slate-500 dark:border-slate-400' : undefined}
              aria-label={term === null ? `Missing term at position ${index + 1}` : undefined}
            >
              {term === null ? '?' : String(term)}
            </span>
          </React.Fragment>
        ))}
      </div>
      {itemPrompt && (
        <p className="mt-3 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
          {itemPrompt}
        </p>
      )}
    </div>
  );
};
