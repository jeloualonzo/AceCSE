import React from 'react';
import type { NormalizedQuestionGroup, OptionId, Question } from '@/types';
import type { BookletSection } from '@/lib/examViewModel';
import { AdministrativeItemRenderer } from './AdministrativeItemRenderer';
import { GroupRenderer } from './GroupRenderer';
import { QuestionRenderer } from './QuestionRenderer';

export interface SectionRendererProps {
  section: BookletSection;
  getGroup: (groupId: string) => NormalizedQuestionGroup | undefined;
  questionIndex: ReadonlyMap<string, Question>;
  /** Subject-scoped numbering (restarts at 1 per section) — see examViewModel.sectionQuestionNumberMap. */
  questionNumbers: ReadonlyMap<string, number>;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
}

/**
 * Renders exactly one subject's content — the caller (BookletExamLayout)
 * only ever mounts the currently-selected section, not the whole exam.
 */
export const SectionRenderer: React.FC<SectionRendererProps> = React.memo(function SectionRenderer({
  section,
  getGroup,
  questionIndex,
  questionNumbers,
  answers,
  onSelectOption,
}) {
  return (
    <div className="space-y-10">
      {section.nodes.map((node, index) => {
        if (node.kind === 'administrative') {
          return <AdministrativeItemRenderer key={`admin-${node.id}-${index}`} id={node.id} />;
        }
        if (node.kind === 'group') {
          return (
            <GroupRenderer
              key={`group-${node.groupId}`}
              group={getGroup(node.groupId)}
              questionIds={node.questionIds}
              questionIndex={questionIndex}
              questionNumbers={questionNumbers}
              answers={answers}
              onSelectOption={onSelectOption}
            />
          );
        }
        const question = questionIndex.get(node.questionId);
        if (!question) return null;
        return (
          <QuestionRenderer
            key={`q-${node.questionId}`}
            question={question}
            questionNumber={questionNumbers.get(node.questionId) ?? 0}
            selectedOptionId={answers[node.questionId] ?? null}
            onSelectOption={onSelectOption}
          />
        );
      })}
    </div>
  );
});
