import React from 'react';
import type { NormalizedQuestionGroup, OptionId, Question } from '@/types';
import type { BookletSection } from '@/lib/examViewModel';
import { sectionTitle } from '@/lib/examViewModel';
import { AdministrativeItemRenderer } from './AdministrativeItemRenderer';
import { GroupRenderer } from './GroupRenderer';
import { QuestionRenderer } from './QuestionRenderer';

export interface SectionRendererProps {
  section: BookletSection;
  sectionNumber: number;
  totalSections: number;
  getGroup: (groupId: string) => NormalizedQuestionGroup | undefined;
  questionIndex: ReadonlyMap<string, Question>;
  questionNumbers: ReadonlyMap<string, number>;
  answers: Readonly<Record<string, OptionId>>;
  onSelectOption: (questionId: string, optionId: OptionId) => void;
  /** False for the single legacy/unsectioned fallback section — showing
   * "Section 1 of 1 — Questions" would be noise, not information. */
  showHeading: boolean;
}

export const SectionRenderer: React.FC<SectionRendererProps> = React.memo(function SectionRenderer({
  section,
  sectionNumber,
  totalSections,
  getGroup,
  questionIndex,
  questionNumbers,
  answers,
  onSelectOption,
  showHeading,
}) {
  const headingId = `section-${section.sectionId}-heading`;
  return (
    <section aria-labelledby={showHeading ? headingId : undefined} className="space-y-8">
      {showHeading && (
        <header className="pt-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
            Section {sectionNumber} of {totalSections}
          </p>
          <h2 id={headingId} className="text-lg font-extrabold text-slate-900 dark:text-white">
            {sectionTitle(section.sectionId)}
          </h2>
        </header>
      )}

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
    </section>
  );
});
