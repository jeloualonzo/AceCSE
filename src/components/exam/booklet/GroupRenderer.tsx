import React from 'react';
import type { ActiveFocus, NormalizedQuestionGroup, OptionId, Question } from '@/types';
import { renderInlineRichText } from '@/lib/inlineRichText';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { QuestionRenderer } from './QuestionRenderer';

export interface GroupRendererProps {
  /** Resolved historical/fixed group metadata, or undefined for a pool block. */
  group: NormalizedQuestionGroup | undefined;
  /** Shared task directions/examples for a canonical pool block. */
  sharedContext?: { title?: string; directions?: string; example?: string };
  /** Stable task identity from the existing group/pool identity. */
  taskId?: string;
  /** @deprecated Retained for compatible callers; shared tasks now use one neutral container. */
  plainFlow?: boolean;
  questionIds: string[];
  questionIndex: ReadonlyMap<string, Question>;
  questionNumbers: ReadonlyMap<string, number>;
  /** Optional learner-facing labels such as N1/V1 for All Subjects Practice. */
  questionLabels?: ReadonlyMap<string, string>;
  /** New exclusive task/question focus source of truth. */
  activeFocus?: ActiveFocus;
  /** Legacy question-only focus input retained for compatible callers. */
  activeQuestionId?: string | null;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  /** Practice-only local explanation controls for each scored item. */
  practiceMode?: boolean;
}

/**
 * Group ├── Directions ├── Example/passage/table ├── Question 1..N
 *
 * Shared content renders exactly once above the member questions. Shared task
 * blocks participate in the same focus line as their member question cards,
 * and exactly one of those entities can be active at a time.
 */
export const GroupRenderer: React.FC<GroupRendererProps> = React.memo(function GroupRenderer({
  group,
  sharedContext,
  taskId,
  plainFlow: _plainFlow = false,
  questionIds,
  questionIndex,
  questionNumbers,
  questionLabels,
  activeFocus,
  activeQuestionId,
  answers,
  onSelectOption,
  practiceMode = false,
}) {
  const taskContext = sharedContext ?? group;
  const hasSharedContent = Boolean(
    taskContext?.directions || taskContext?.example || group?.contentBlocks?.length
  );
  const resolvedTaskId = taskId ?? (group ? `group:${group.id}` : undefined);
  const activeQuestion = activeFocus
    ? activeFocus.type === 'question' ? activeFocus.questionId : null
    : activeQuestionId ?? null;
  const isTaskActive = Boolean(
    hasSharedContent &&
    resolvedTaskId &&
    activeFocus?.type === 'task' &&
    activeFocus.taskId === resolvedTaskId
  );

  return (
    <div id={group ? `group-${group.id}` : undefined} className="space-y-4">
      {hasSharedContent && (
        <div
          data-focus-id={resolvedTaskId}
          data-focus-type="task"
          data-focus-active={isTaskActive ? 'true' : 'false'}
          className={`rounded-xl border border-l-4 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3 transition-shadow ${
            isTaskActive
              ? 'border-emerald-300 dark:border-emerald-500/70 border-l-emerald-600 dark:border-l-emerald-500 shadow-md'
              : 'border-slate-200 dark:border-slate-800 border-l-emerald-500 shadow-sm'
          }`}
        >
          {taskContext?.title && (
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">{taskContext.title}</h3>
          )}
          {taskContext?.directions && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{renderInlineRichText(taskContext.directions)}</p>
          )}
          {taskContext?.example && (
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Example</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {renderInlineRichText(taskContext.example)}
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
              active={activeQuestion === id}
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
