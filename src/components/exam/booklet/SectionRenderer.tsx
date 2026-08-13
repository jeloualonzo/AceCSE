import React from 'react';
import type { NormalizedQuestionGroup, OptionId, Question } from '@/types';
import type { EdqItem } from '@/data/edq';
import type { BookletSection } from '@/lib/examViewModel';
import { AdministrativeItemRenderer } from './AdministrativeItemRenderer';
import { GroupRenderer } from './GroupRenderer';
import { QuestionRenderer } from './QuestionRenderer';

/** Everything the booklet needs to render optional, local-only EDQ items. */
export interface EdqRenderContext {
  getItem: (id: string) => EdqItem | undefined;
  /** LOCAL-ONLY responses — never written to Firestore. */
  answers: Readonly<Record<string, string>>;
  responseMode: boolean;
  onSelect: (edqItemId: string, option: string) => void;
  onToggleResponseMode: () => void;
}

export interface SectionRendererProps {
  section: BookletSection;
  getGroup: (groupId: string) => NormalizedQuestionGroup | undefined;
  questionIndex: ReadonlyMap<string, Question>;
  /** SESSION-BASED numbering: continuous across the whole booklet (EDQ = 1–20, first scored = 21). */
  questionNumbers: ReadonlyMap<string, number>;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  edq?: EdqRenderContext;
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
  edq,
}) {
  return (
    <div className="space-y-10">
      {section.nodes.map((node, index) => {
        if (node.kind === 'administrative') {
          // A shared instruction renders ONCE above the first item of a
          // labeled run (booklet-style), never repeated per item.
          const prev = section.nodes[index - 1];
          const prevLabel =
            prev?.kind === 'administrative' ? edq?.getItem(prev.id)?.groupLabel : undefined;
          const ownLabel = edq?.getItem(node.id)?.groupLabel;
          const showGroupHeader = Boolean(ownLabel) && ownLabel !== prevLabel;
          return (
            <AdministrativeItemRenderer
              key={`admin-${node.id}-${index}`}
              id={node.id}
              displayNumber={questionNumbers.get(node.id) ?? 0}
              showGroupHeader={showGroupHeader}
              edq={edq}
            />
          );
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
