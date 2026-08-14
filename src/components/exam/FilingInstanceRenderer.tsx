import type { Question } from '@/types';

interface FilingPayload {
  instanceFormat?: unknown;
  entries?: unknown;
  itemPrompt?: unknown;
}

function compactFilingPayload(question: Question): FilingPayload | null {
  if (question.taskInstance?.kind !== 'filing') return null;
  const payload = question.taskInstance.payload as FilingPayload;
  return payload.instanceFormat === 'compact' ? payload : null;
}

export function hasCompactFilingInstance(question: Question): boolean {
  return compactFilingPayload(question) !== null;
}

export const FilingInstanceRenderer: React.FC<{ question: Question }> = ({ question }) => {
  const payload = compactFilingPayload(question);
  if (!payload) return null;
  const entries = Array.isArray(payload.entries)
    ? payload.entries.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const itemPrompt = typeof payload.itemPrompt === 'string' ? payload.itemPrompt : undefined;
  return (
    <div className="rounded-lg border-l-4 border-l-emerald-400 dark:border-l-emerald-600 border-y border-r border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5 mb-4">
      <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2">
        Filing item
      </div>
      {entries.length > 0 && (
        <ol className="list-decimal list-inside space-y-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 whitespace-pre-line">
          {entries.map((entry, index) => <li key={`${question.id}-entry-${index}`}>{entry}</li>)}
        </ol>
      )}
      {itemPrompt && (
        <p className="mt-3 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line">
          {itemPrompt}
        </p>
      )}
    </div>
  );
};
