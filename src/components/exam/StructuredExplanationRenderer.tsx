import type {
  StructuredExplanation,
  StructuredExplanationBlock,
  StructuredExplanationLeafBlock,
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

function mathBlock(expression: string, dark: boolean) {
  const lines = expression.split(/\r?\n/).map(formatMathExpression).filter(Boolean);
  return (
    <div
      role="math"
      aria-label={lines.join('; ')}
      className={`overflow-x-auto rounded-lg border px-3 py-2.5 font-mono text-sm sm:text-base tracking-wide whitespace-nowrap ${
        dark
          ? 'border-slate-700 bg-slate-950/70 text-slate-100'
          : 'border-slate-200 bg-slate-50 text-slate-900'
      }`}
    >
      <div className="space-y-1">
        {lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
      </div>
    </div>
  );
}

function renderLeafBlock(block: StructuredExplanationLeafBlock, dark: boolean, key: string) {
  if (block.type === 'paragraph') {
    return <p key={key} className={`leading-relaxed ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{block.text}</p>;
  }
  if (block.type === 'math') return <div key={key}>{mathBlock(block.expression, dark)}</div>;
  return (
    <p key={key} className={`font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>
      Answer: <span className="font-mono">{block.text}</span>
    </p>
  );
}

function renderBlock(block: StructuredExplanationBlock, index: number, dark: boolean) {
  const key = `${block.type}-${index}`;
  if (block.type === 'heading') {
    return <h4 key={key} className={`text-sm font-bold uppercase tracking-wider ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{block.text}</h4>;
  }
  if (block.type === 'step') {
    return (
      <section
        key={key}
        aria-labelledby={`${key}-title`}
        className={`rounded-lg border p-3.5 sm:p-4 space-y-3 ${dark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'}`}
      >
        <div className="flex items-start gap-2.5">
          <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
            Step {index + 1}
          </span>
          <h5 id={`${key}-title`} className={`pt-0.5 text-sm font-bold ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{block.title}</h5>
        </div>
        <div className="space-y-2.5 pl-0 sm:pl-1">
          {block.blocks.map((leaf, leafIndex) => renderLeafBlock(leaf, dark, `${key}-leaf-${leafIndex}`))}
        </div>
      </section>
    );
  }
  if (block.type === 'paragraph') {
    return <p key={key} className={`leading-relaxed ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{block.text}</p>;
  }
  if (block.type === 'math') return <div key={key}>{mathBlock(block.expression, dark)}</div>;
  return (
    <div key={key} className={`rounded-lg border px-3.5 py-3 ${dark ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50/70'}`}>
      <p className={`text-sm font-semibold ${dark ? 'text-emerald-200' : 'text-emerald-900'}`}>
        Answer: <span className="font-mono font-bold">{block.text}</span>
      </p>
    </div>
  );
}

/** Renders only validated structured blocks; callers own legacy fallback. */
export const StructuredExplanationRenderer: React.FC<StructuredExplanationRendererProps> = ({
  explanation,
  theme = 'dark',
}) => {
  const dark = theme === 'dark';
  return (
    <div data-testid="structured-explanation" data-structured-explanation="true" className="space-y-3.5 text-xs sm:text-sm">
      {explanation.blocks.map((block, index) => renderBlock(block, index, dark))}
    </div>
  );
};
