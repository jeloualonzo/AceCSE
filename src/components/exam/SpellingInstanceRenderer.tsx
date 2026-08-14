import React from 'react';
import type { Question } from '@/types';

interface SpellingPayload {
  instanceFormat?: unknown;
  itemPrompt?: unknown;
  words?: unknown;
  noErrorVariant?: unknown;
}

function compactSpellingPayload(question: Question): SpellingPayload | null {
  if (question.taskInstance?.kind !== 'spelling') return null;
  const payload = question.taskInstance.payload as SpellingPayload;
  return payload.instanceFormat === 'compact' ? payload : null;
}

export function hasCompactSpellingInstance(question: Question): boolean {
  return compactSpellingPayload(question) !== null;
}

export const SpellingInstanceRenderer: React.FC<{ question: Question }> = ({ question }) => {
  const payload = compactSpellingPayload(question);
  if (!payload) return null;
  const itemPrompt = typeof payload.itemPrompt === 'string' ? payload.itemPrompt : undefined;
  if (!itemPrompt) return null;
  return (
    <div className="mb-6">
      <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line">
        {itemPrompt}
      </p>
    </div>
  );
};
