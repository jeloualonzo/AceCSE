import type { Question } from '@/types';

interface GrammarPayload {
  instanceFormat?: unknown;
  itemNote?: unknown;
}

function compactGrammarPayload(question: Question): GrammarPayload | null {
  if (question.taskInstance?.kind !== 'grammar') return null;
  const payload = question.taskInstance.payload as GrammarPayload;
  return payload.instanceFormat === 'compact' ? payload : null;
}

export function hasCompactGrammarInstance(question: Question): boolean {
  return compactGrammarPayload(question) !== null;
}

export const GrammarInstanceRenderer: React.FC<{ question: Question }> = ({ question }) => {
  const payload = compactGrammarPayload(question);
  if (!payload || typeof payload.itemNote !== 'string' || payload.itemNote.length === 0) return null;

  return (
    <p className="mb-4 text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
      {payload.itemNote}
    </p>
  );
};
