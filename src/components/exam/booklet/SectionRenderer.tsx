import React from 'react';
import type { ActiveFocus, NormalizedQuestionGroup, OptionId, Question } from '@/types';
import type { EdqItem } from '@/data/edq';
import type { BookletSection } from '@/lib/examViewModel';
import { getSharedTaskDefinitionForTaskFormat, taskFormatLabel } from '@/data/taxonomy';
import { AdministrativeItemRenderer } from './AdministrativeItemRenderer';
import { GroupRenderer } from './GroupRenderer';
import { QuestionRenderer } from './QuestionRenderer';
import { normalizeIntendedNewlines } from '@/lib/text';

/** Everything the booklet needs to render optional, local-only EDQ items. */
export interface EdqRenderContext {
  getItem: (id: string) => EdqItem | undefined;
  /** LOCAL-ONLY responses — never written to Firestore. */
  answers: Readonly<Record<string, string>>;
  responseMode: boolean;
  onSelect: (edqItemId: string, option: string) => void;
  onToggleResponseMode: () => void;
  /** Optional navigation shortcut from EDQ to the first scored section. */
  onSkip?: () => void;
}

export interface SectionRendererProps {
  section: BookletSection;
  getGroup: (groupId: string) => NormalizedQuestionGroup | undefined;
  questionIndex: ReadonlyMap<string, Question>;
  /** Internal numeric positions used for ordering and legacy Simulation display. */
  questionNumbers: ReadonlyMap<string, number>;
  /** Optional learner-facing labels such as N1/V1 for All Subjects Practice. */
  questionLabels?: ReadonlyMap<string, string>;
  /** New exclusive task/question focus source of truth. */
  activeFocus?: ActiveFocus;
  /** Legacy question-only focus input retained for compatible callers. */
  activeQuestionId?: string | null;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  edq?: EdqRenderContext;
  /** Practice keeps local explanation toggles; Simulation keeps feedback hidden. */
  practiceMode?: boolean;
}

function focusFromLegacy(activeFocus: ActiveFocus | undefined, activeQuestionId: string | null | undefined): ActiveFocus {
  if (activeFocus !== undefined) return activeFocus;
  return activeQuestionId ? { type: 'question', questionId: activeQuestionId } : null;
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
  questionLabels,
  activeFocus,
  activeQuestionId,
  answers,
  onSelectOption,
  edq,
  practiceMode = false,
}) {
  const resolvedFocus = focusFromLegacy(activeFocus, activeQuestionId);
  const activeQuestion = resolvedFocus?.type === 'question' ? resolvedFocus.questionId : null;

  return (
    <div className="space-y-4">
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
              taskId={`group:${section.sectionId}:${node.groupId}`}
              questionIds={node.questionIds}
              questionIndex={questionIndex}
              questionNumbers={questionNumbers}
              questionLabels={questionLabels}
              activeFocus={resolvedFocus}
              answers={answers}
              onSelectOption={onSelectOption}
              practiceMode={practiceMode}
            />
          );
        }
        if (node.kind === 'pool') {
          const shared = getSharedTaskDefinitionForTaskFormat(node.taskFormat);
          const definition = shared?.[1];
          const directionsSource = definition && typeof definition.directionsSource === 'string'
            ? getGroup(definition.directionsSource)
            : undefined;
          const examples = Array.isArray(definition?.examples)
            ? definition.examples
                .filter((example): example is Record<string, unknown> => Boolean(example) && typeof example === 'object')
                .map((example) => [example.input, example.result]
                  .filter((part): part is string => typeof part === 'string')
                  .map((part) => normalizeIntendedNewlines(part, 'decode-escaped-newlines'))
                  .join(' — '))
                .filter(Boolean)
                .join('\n\n')
            : undefined;
          const sharedContext = {
            title: typeof definition?.title === 'string' ? definition.title : taskFormatLabel(node.questionType, node.taskFormat),
            directions: typeof definition?.directions === 'string' ? definition.directions : directionsSource?.directions,
            example: examples || directionsSource?.example,
          };
          return (
            <GroupRenderer
              key={`pool-${node.poolId}-${index}`}
              group={undefined}
              taskId={`pool:${section.sectionId}:${node.poolId}:${node.taskFormat}`}
              sharedContext={sharedContext}
              plainFlow={node.poolId === 'clerical-filing' || node.taskFormat === 'shared_grammar_sentence_correction'}
              questionIds={node.questionIds}
              questionIndex={questionIndex}
              questionNumbers={questionNumbers}
              questionLabels={questionLabels}
              activeFocus={resolvedFocus}
              answers={answers}
              onSelectOption={onSelectOption}
              practiceMode={practiceMode}
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
            questionLabel={questionLabels?.get(node.questionId)}
            active={activeQuestion === node.questionId}
            selectedOptionId={answers[node.questionId] ?? null}
            onSelectOption={onSelectOption}
            itemContainer={true}
            practiceMode={practiceMode}
          />
        );
      })}
    </div>
  );
});
