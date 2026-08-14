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
    <div className="mb-6">
      {entries.length > 0 && (
        <ol className="list-decimal list-inside space-y-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 whitespace-pre-line mb-4">
          {entries.map((entry, index) => <li key={`${question.id}-entry-${index}`}>{entry}</li>)}
        </ol>
      )}
      {itemPrompt && (
        <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line">
          {itemPrompt}
        </p>
      )}
    </div>
  );
};
