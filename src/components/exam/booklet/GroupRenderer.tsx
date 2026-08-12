import React from 'react';
import type { NormalizedQuestionGroup, OptionId, Question } from '@/types';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { QuestionRenderer } from './QuestionRenderer';

export interface GroupRendererProps {
  /** Resolved group metadata, or undefined if the catalog has no record of it
   * (shouldn't happen for a real session, but rendering must not crash). */
  group: NormalizedQuestionGroup | undefined;
  questionIds: string[];
  questionIndex: ReadonlyMap<string, Question>;
  questionNumbers: ReadonlyMap<string, number>;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
}

/**
 * Group ├── Directions ├── Example/passage/table ├── Question 1..N
 *
 * Shared content renders exactly once above the member questions — this is
 * the whole point of the group model. Almost every group in the current
 * production bank is a migrated singleton with no directions/contentBlocks,
 * so `hasSharedContent` is false for it and this renders as a plain question
 * with no visual overhead, which is intentional: singleton groups should be
 * indistinguishable from a real ungrouped question.
 */
export const GroupRenderer: React.FC<GroupRendererProps> = React.memo(function GroupRenderer({
  group,
  questionIds,
  questionIndex,
  questionNumbers,
  answers,
  onSelectOption,
}) {
  const hasSharedContent = Boolean(
    group?.directions || group?.example || (group?.contentBlocks && group.contentBlocks.length > 0)
  );

  return (
    <div id={group ? `group-${group.id}` : undefined} className="space-y-6">
      {hasSharedContent && (
        <div className="rounded-lg border-l-4 border-l-slate-300 dark:border-l-slate-700 border-y border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-3">
          {group?.title && (
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{group.title}</h3>
          )}
          {group?.directions && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{group.directions}</p>
          )}
          {group?.example && (
            <p className="text-sm italic text-slate-600 dark:text-slate-400 whitespace-pre-line">
              {group.example}
            </p>
          )}
          {group?.contentBlocks?.map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      )}

      <div className="space-y-8">
        {questionIds.map((id) => {
          const question = questionIndex.get(id);
          if (!question) return null;
          return (
            <QuestionRenderer
              key={id}
              question={question}
              questionNumber={questionNumbers.get(id) ?? 0}
              selectedOptionId={answers[id] ?? null}
              onSelectOption={onSelectOption}
            />
          );
        })}
      </div>
    </div>
  );
});
