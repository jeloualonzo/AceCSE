import React from 'react';
import type { NormalizedQuestionGroup, OptionId, Question } from '@/types';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { QuestionRenderer } from './QuestionRenderer';

export interface GroupRendererProps {
  /** Resolved historical/fixed group metadata, or undefined for a pool block. */
  group: NormalizedQuestionGroup | undefined;
  /** Shared task directions/examples for a canonical pool block. */
  sharedContext?: { title?: string; directions?: string; example?: string };
  /** @deprecated Retained for compatible callers; shared tasks now use one neutral container. */
  plainFlow?: boolean;
  questionIds: string[];
  questionIndex: ReadonlyMap<string, Question>;
  questionNumbers: ReadonlyMap<string, number>;
  /** Optional learner-facing labels such as N1/V1 for All Subjects Practice. */
  questionLabels?: ReadonlyMap<string, string>;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  /** Practice-only local explanation controls for each scored item. */
  practiceMode?: boolean;
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
  sharedContext,
  plainFlow: _plainFlow = false,
  questionIds,
  questionIndex,
  questionNumbers,
  questionLabels,
  answers,
  onSelectOption,
  practiceMode = false,
}) {
  const taskContext = sharedContext ?? group;
  const hasSharedContent = Boolean(
    taskContext?.directions || taskContext?.example || group?.contentBlocks?.length
  );

  return (
    <div id={group ? `group-${group.id}` : undefined} className="space-y-4">
      {hasSharedContent && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5 space-y-3">
          {taskContext?.title && (
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">{taskContext.title}</h3>
          )}
          {taskContext?.directions && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{taskContext.directions}</p>
          )}
          {taskContext?.example && (
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Example</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {taskContext.example}
              </p>
            </div>
          )}
          {group?.contentBlocks?.map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {questionIds.map((id) => {
          const question = questionIndex.get(id);
          if (!question) return null;
          return (
            <QuestionRenderer
              key={id}
              question={question}
              questionNumber={questionNumbers.get(id) ?? 0}
              questionLabel={questionLabels?.get(id)}
              selectedOptionId={answers[id] ?? null}
              onSelectOption={onSelectOption}
              suppressPassage={Boolean(group?.contentBlocks && group.contentBlocks.length > 0)}
              itemContainer={true}
              practiceMode={practiceMode}
            />
          );
        })}
      </div>
    </div>
  );
});
