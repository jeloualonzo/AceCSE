import type { Question } from '@/types';
import { ContentBlockRenderer } from './booklet/ContentBlockRenderer';

export interface QuestionStimulusRendererProps {
  question: Pick<Question, 'passage' | 'contentBlocks'>;
  /** Optional classes for the outer stimulus region. */
  className?: string;
}

/**
 * Shared learner-facing stimulus surface for both legacy passages and semantic
 * content blocks. A structured block takes precedence over the legacy string so
 * the same authored table is rendered consistently across Practice, booklet, and
 * Results rather than being re-parsed by each surface independently.
 */
export const QuestionStimulusRenderer: React.FC<QuestionStimulusRendererProps> = ({
  question,
  className = '',
}) => {
  if (question.contentBlocks?.length) {
    return (
      <div
        data-question-stimulus="structured"
        className={`space-y-4 text-sm leading-relaxed text-black dark:text-slate-300 ${className}`.trim()}
      >
        {question.contentBlocks.map((block) => (
          <ContentBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    );
  }

  if (!question.passage) return null;

  return (
    <div
      data-question-stimulus="legacy"
      className={`border-l-2 border-slate-300 dark:border-slate-700 pl-4 text-sm leading-relaxed text-black dark:text-slate-300 whitespace-pre-line ${className}`.trim()}
    >
      {question.passage}
    </div>
  );
};
