import type {
  StructuredExplanation,
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

function MathDisplay({ expression, dark, kind }: { expression: string; dark: boolean; kind: 'math' | 'pattern' | 'solution' }) {
  const lines = mathLines(expression);
  const label = kind === 'pattern' ? 'Pattern' : kind === 'solution' ? 'Solution' : 'Mathematical expression';
  return (
    <div
      role="math"
      aria-label={`${label}: ${lines.join('; ')}`}
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

function renderBlock(block: StructuredExplanationBlock, index: number, dark: boolean): React.ReactNode {
  const key = `${block.type}-${index}`;
  switch (block.type) {
    case 'heading':
      return <h4 key={key} className={`text-sm font-bold uppercase tracking-wider ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{block.text}</h4>;
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
          <MathDisplay expression={block.expression} dark={dark} kind="pattern" />
        </div>
      );
    case 'math':
      return <MathDisplay key={key} expression={block.expression} dark={dark} kind="math" />;
    case 'solution':
      return (
        <div key={key} className="space-y-1">
          <SectionLabel dark={dark}>Solution</SectionLabel>
          <MathDisplay expression={block.expression} dark={dark} kind="solution" />
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
        <p
          key={key}
          className={`font-semibold ${block.variant === 'final' ? 'text-base' : 'text-sm'} ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}
        >
          {block.variant === 'final' ? 'Answer: ' : ''}
          <span className="font-mono font-bold">{block.text}</span>
        </p>
      );
    case 'step':
      return renderFutureStep(block, key, dark);
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
