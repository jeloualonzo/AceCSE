import { useState } from 'react';
import type {
  StructuredExplanation,
  StructuredExplanationAlternativeSolutionBlock,
  StructuredExplanationBlock,
  StructuredExplanationStepBlock,
} from '@/types';

interface StructuredExplanationRendererProps {
  explanation: StructuredExplanation;
  theme?: 'dark' | 'light';
}

function formatMathExpression(expression: string): string {
  return expression
    .replace(/\s*-\s*/g, ' − ')
    .replace(/\s*\/\s*/g, ' ÷ ')
    .replace(/\s*\*\s*/g, ' × ')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mathLines(expression: string): string[] {
  return expression.split(/\r?\n/).map(formatMathExpression).filter(Boolean);
}

function MathDisplay({ expression, dark, label }: { expression: string; dark: boolean; label?: string }) {
  const lines = mathLines(expression);
  return (
    <div
      role="math"
      aria-label={label ? `${label}: ${lines.join('; ')}` : lines.join('; ')}
      className={`overflow-x-auto px-1 py-1 font-mono text-sm sm:text-base tracking-wide whitespace-nowrap ${
        dark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
    </div>
  );
}

function SectionLabel({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <h5 className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
      {children}
    </h5>
  );
}

function AlternativeSolution({
  block,
  dark,
  id,
}: {
  block: StructuredExplanationAlternativeSolutionBlock;
  dark: boolean;
  id: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = `${id}-content`;

  return (
    <div data-testid="structured-alternative-method" className="border-t pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
          dark
            ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:ring-emerald-400'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-emerald-600'
        }`}
      >
        <span>{block.title}</span>
        <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
      </button>
      <div
        id={contentId}
        hidden={!expanded}
        data-testid="structured-alternative-content"
        className="space-y-3 pt-3"
      >
        {block.blocks.map((child, index) => renderBlock(child, index, dark))}
      </div>
    </div>
  );
}

function renderBlock(block: StructuredExplanationBlock, index: number, dark: boolean): React.ReactNode {
  const key = `${block.type}-${index}`;
  switch (block.type) {
    case 'heading':
      return <h4 key={key} className={`text-sm font-bold uppercase tracking-wider ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{block.text}</h4>;
    case 'correct_answer':
      return (
        <p key={key} className={`font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>
          Correct Answer: <span className="font-mono font-bold">{block.text}</span>
        </p>
      );
    case 'paragraph':
      return (
        <div key={key} className="space-y-1">
          {block.label && <SectionLabel dark={dark}>{block.label}</SectionLabel>}
          <p className={`leading-relaxed ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{block.text}</p>
        </div>
      );
    case 'pattern':
      return (
        <div key={key} className="space-y-1">
          <SectionLabel dark={dark}>Pattern</SectionLabel>
          <MathDisplay expression={block.expression} dark={dark} label="Pattern" />
        </div>
      );
    case 'math':
      return <MathDisplay key={key} expression={block.expression} dark={dark} />;
    case 'solution':
      return (
        <div key={key} className="space-y-1">
          <SectionLabel dark={dark}>Apply the Pattern</SectionLabel>
          <MathDisplay expression={block.expression} dark={dark} label="Apply the Pattern" />
        </div>
      );
    case 'rule':
      return (
        <div key={key} className="space-y-1">
          <SectionLabel dark={dark}>Rule</SectionLabel>
          <p className={`leading-relaxed ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{block.text}</p>
        </div>
      );
    case 'common_trap':
      return (
        <div key={key} className="space-y-1">
          <SectionLabel dark={dark}>Common Trap</SectionLabel>
          <p className={`leading-relaxed ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{block.text}</p>
        </div>
      );
    case 'answer':
      return (
        <p key={key} className={`font-semibold text-base ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>
          Answer: <span className="font-mono font-bold">{block.text}</span>
        </p>
      );
    case 'step':
      return renderFutureStep(block, key, dark);
    case 'alternative_solution':
      return <AlternativeSolution key={key} block={block} dark={dark} id={key} />;
    default:
      return null;
  }
}

function renderFutureStep(block: StructuredExplanationStepBlock, key: string, dark: boolean) {
  return (
    <section key={key} aria-labelledby={`${key}-title`} className="space-y-2">
      <h5 id={`${key}-title`} className={`text-sm font-bold ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{block.title}</h5>
      <div className="space-y-3">
        {block.blocks.map((child, index) => renderBlock(child, index, dark))}
      </div>
    </section>
  );
}

/** Renders validated structured blocks within the existing single explanation card. */
export const StructuredExplanationRenderer: React.FC<StructuredExplanationRendererProps> = ({
  explanation,
  theme = 'dark',
}) => {
  const dark = theme === 'dark';
  return (
    <div data-testid="structured-explanation" data-structured-explanation="true" className="space-y-4 text-xs sm:text-sm">
      {explanation.blocks.map((block, index) => renderBlock(block, index, dark))}
    </div>
  );
};
