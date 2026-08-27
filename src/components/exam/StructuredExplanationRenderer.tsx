import { createElement, Fragment, useState } from 'react';
import { MathValue } from './MathValue';
import type {
  StructuredExplanation,
  StructuredExplanationAlternativeSolutionBlock,
  StructuredExplanationBlock,
  StructuredExplanationDistractorSectionBlock,
  StructuredExplanationStepBlock,
} from '@/types';

interface StructuredExplanationRendererProps {
  explanation: StructuredExplanation;
  theme?: 'dark' | 'light';
}

function formatMathExpression(expression: string): string {
  return expression
    .replace(/\s*-\s*/g, ' − ')
    .replace(/\s*\*\s*/g, ' × ')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mathLines(expression: string): string[] {
  return expression.split(/\r?\n/).map(formatMathExpression).filter(Boolean);
}

const DISPLAY_MATH_PATTERN = /\\\[([\s\S]*?)\\\]/g;
const INLINE_MATH_PATTERN = /\\\(([\s\S]*?)\\\)|(?<![\w./])([−-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![\w./])/g;

function InlineLatexMath({ expression, keyPrefix }: { expression: string; keyPrefix: string }): React.ReactNode {
  return createElement(
    'math',
    {
      key: `${keyPrefix}-latex`,
      role: 'math',
      'data-testid': 'structured-inline-math',
      'aria-label': formatLatexForAria(expression),
      className: 'inline-block align-middle text-[1.2em]',
      xmlns: 'http://www.w3.org/1998/Math/MathML',
    },
    createElement('mrow', null, renderLatexTokens(expression, `${keyPrefix}-latex`)),
  );
}

function renderInlineMathText(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(INLINE_MATH_PATTERN)) {
    const start = match.index ?? cursor;
    if (start > cursor) parts.push(text.slice(cursor, start));
    if (match[1] !== undefined) {
      parts.push(<InlineLatexMath key={`${keyPrefix}-latex-${matchIndex++}`} expression={match[1]} keyPrefix={keyPrefix} />);
    } else {
      parts.push(<MathValue key={`${keyPrefix}-fraction-${matchIndex++}`} value={match[0]} />);
    }
    cursor = start + match[0].length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length > 0 ? parts : [text];
}

function renderInlineMathRichText(text: string): React.ReactNode {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const key = `inline-${index}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key}>{renderInlineMathText(token.slice(2, -2), key)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={key}>{renderInlineMathText(token.slice(1, -1), key)}</em>;
    }
    return <Fragment key={key}>{renderInlineMathText(token, key)}</Fragment>;
  });
}

function renderCorrectAnswerText(text: string): React.ReactNode {
  const match = text.match(/^([A-E])\s*[—–-]\s*(.*)$/s);
  if (!match) return renderInlineMathRichText(text);

  return <><span>{match[1]}.</span>{' '}{renderInlineMathRichText(match[2] ?? '')}</>;
}

function readLatexGroup(source: string, start: number): { content: string; end: number } | null {
  if (source[start] !== '{') return null;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return { content: source.slice(start + 1, index), end: index + 1 };
  }
  return null;
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

function formatSuperscript(value: string): string {
  return [...value].map((character) => SUPERSCRIPT_DIGITS[character] ?? character).join('');
}

function formatLatexForAriaLine(line: string): string {
  let formatted = line;
  let previous: string;
  do {
    previous = formatted;
    formatted = formatted.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2');
  } while (formatted !== previous);

  return formatted
    .replaceAll('\\times', ' × ')
    .replaceAll('\\div', ' ÷ ')
    .replaceAll('\\rightarrow', ' → ')
    .replaceAll('\\qquad', '  ')
    .replaceAll('\\quad', ' ')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\\\s+-/g, '−')
    .replaceAll('\\_', '_')
    .replace(/\\\s/g, ' ')
    .replace(/\^\{([^{}]*)\}/g, (_, value: string) => formatSuperscript(value))
    .replace(/\^([0-9]+)/g, (_, value: string) => formatSuperscript(value))
    .replace(/\s+/g, ' ')
    .trim();
}

function formatLatexForAria(expression: string): string {
  return expression
    .split(/\r?\n/)
    .map(formatLatexForAriaLine)
    .filter(Boolean)
    .join('; ');
}

function renderLatexTokens(line: string, keyPrefix = 'math'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let index = 0;
  let keyIndex = 0;
  const nextKey = () => `${keyPrefix}-${keyIndex++}`;
  const appendOperator = (value: string) => nodes.push(createElement('mo', { key: nextKey() }, value));

  while (index < line.length) {
    if (line.startsWith('\\frac', index)) {
      const numerator = readLatexGroup(line, index + 5);
      const denominator = numerator ? readLatexGroup(line, numerator.end) : null;
      if (numerator && denominator) {
        nodes.push(createElement(
          'mfrac',
          { key: nextKey() },
          createElement('mrow', null, renderLatexTokens(numerator.content, `${keyPrefix}-n`)),
          createElement('mrow', null, renderLatexTokens(denominator.content, `${keyPrefix}-d`)),
        ));
        index = denominator.end;
        continue;
      }
    }

    if (line.startsWith('\\times', index)) {
      appendOperator('×');
      index += '\\times'.length;
      continue;
    }
    if (line.startsWith('\\div', index)) {
      appendOperator('÷');
      index += '\\div'.length;
      continue;
    }
    if (line.startsWith('\\rightarrow', index)) {
      appendOperator('→');
      index += '\\rightarrow'.length;
      continue;
    }
    if (line.startsWith('\\qquad', index)) {
      nodes.push(createElement('mspace', { key: nextKey(), width: '2em' }));
      index += '\\qquad'.length;
      continue;
    }
    if (line.startsWith('\\quad', index)) {
      nodes.push(createElement('mspace', { key: nextKey(), width: '1em' }));
      index += '\\quad'.length;
      continue;
    }
    if (line.startsWith('\\left', index)) {
      index += '\\left'.length;
      continue;
    }
    if (line.startsWith('\\right', index)) {
      index += '\\right'.length;
      continue;
    }
    if (line.startsWith('\\_', index)) {
      appendOperator('_');
      index += 2;
      continue;
    }
    if (line.startsWith('\\ ', index)) {
      nodes.push(createElement('mspace', { key: nextKey(), width: '0.25em' }));
      index += 2;
      continue;
    }
    if (line.startsWith('\\-', index)) {
      appendOperator('−');
      index += 2;
      continue;
    }
    if (line[index] === '^') {
      const exponent = line[index + 1] === '{'
        ? readLatexGroup(line, index + 1)
        : { content: line[index + 1] ?? '', end: index + 2 };
      const base = nodes.pop();
      if (base && exponent?.content) {
        nodes.push(createElement(
          'msup',
          { key: nextKey() },
          base,
          createElement('mrow', null, renderLatexTokens(exponent.content, `${keyPrefix}-sup`)),
        ));
        index = exponent.end;
        continue;
      }
    }

    const character = line[index];
    if (/\s/.test(character)) {
      while (index < line.length && /\s/.test(line[index])) index += 1;
      nodes.push(createElement('mspace', { key: nextKey(), width: '0.25em' }));
      continue;
    }
    if (/\d/.test(character)) {
      const start = index;
      while (index < line.length && /[\d.]/.test(line[index])) index += 1;
      nodes.push(createElement('mn', { key: nextKey() }, line.slice(start, index)));
      continue;
    }
    if ('=+−-,/→'.includes(character) || character === '-') {
      appendOperator(character === '-' ? '−' : character);
      index += 1;
      continue;
    }
    if (character === '_') {
      appendOperator('_');
      index += 1;
      continue;
    }
    if (/[a-zA-Z]/.test(character)) {
      const start = index;
      while (index < line.length && /[a-zA-Z]/.test(line[index])) index += 1;
      nodes.push(createElement('mi', { key: nextKey() }, line.slice(start, index)));
      continue;
    }
    nodes.push(createElement('mo', { key: nextKey() }, character));
    index += 1;
  }

  return nodes;
}

function LatexMathDisplay({ expression, dark }: { expression: string; dark: boolean }) {
  const lines = expression
    .split(/,\s*\\quad\s*|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div
      data-testid="structured-latex-math"
      className={`w-full overflow-hidden space-y-3 px-1 py-1 text-center ${dark ? 'text-slate-100' : 'text-slate-900'}`}
    >
      {lines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          role="math"
          data-testid="structured-latex-equation"
          aria-label={formatLatexForAria(line)}
          className="w-full overflow-hidden"
        >
          {createElement(
            'math',
            { xmlns: 'http://www.w3.org/1998/Math/MathML', display: 'block' },
            createElement('mrow', null, renderLatexTokens(line)),
          )}
        </div>
      ))}
    </div>
  );
}

function renderParagraphText(text: string, dark: boolean): React.ReactNode {
  const matches = [...text.matchAll(DISPLAY_MATH_PATTERN)];
  if (matches.length === 0) {
    return <p className={`leading-relaxed whitespace-pre-line ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{renderInlineMathRichText(text)}</p>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let pendingMath: string[] = [];
  let partIndex = 0;
  const pushMath = () => {
    if (pendingMath.length === 0) return;
    parts.push(
      <LatexMathDisplay
        key={`math-${partIndex++}`}
        expression={pendingMath.join('\n')}
        dark={dark}
      />,
    );
    pendingMath = [];
  };

  matches.forEach((match) => {
    const start = match.index ?? cursor;
    const before = text.slice(cursor, start);
    if (before.trim()) {
      pushMath();
      parts.push(
        <p key={`text-${partIndex++}`} className={`leading-relaxed whitespace-pre-line ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          {renderInlineMathRichText(before.trim())}
        </p>,
      );
    }
    pendingMath.push(match[1] ?? '');
    cursor = start + match[0].length;
  });

  pushMath();
  const after = text.slice(cursor).trim();
  if (after) {
    parts.push(
      <p key={`text-${partIndex++}`} className={`leading-relaxed whitespace-pre-line ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
        {renderInlineMathRichText(after)}
      </p>,
    );
  }
  return <div className="space-y-2">{parts}</div>;
}

function MathDisplay({ expression, dark, label }: { expression: string; dark: boolean; label?: string }) {
  const lines = mathLines(expression);
  return (
    <div
      role="math"
      aria-label={label ? `${label}: ${lines.join('; ')}` : lines.join('; ')}
      className={`w-full overflow-hidden px-1 py-1 text-center font-mono text-sm sm:text-base tracking-wide whitespace-nowrap ${
        dark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
    </div>
  );
}

const SECTION_HEADING_CLASS = 'text-[11px] font-bold uppercase tracking-wider';

function SectionHeading({ children, dark, id }: { children: React.ReactNode; dark: boolean; id?: string }) {
  return (
    <h5
      id={id}
      data-section-heading="true"
      className={`${SECTION_HEADING_CLASS} ${dark ? 'text-slate-400' : 'text-slate-500'}`}
    >
      {children}
    </h5>
  );
}

function DistractorSection({
  block,
  dark,
  id,
}: {
  block: StructuredExplanationDistractorSectionBlock;
  dark: boolean;
  id: string;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      data-testid="structured-distractor-section"
      aria-labelledby={titleId}
      className="space-y-2"
    >
      <SectionHeading dark={dark} id={titleId}>{block.title}</SectionHeading>
      <div className="space-y-3">
        {block.blocks.map((child, childIndex) => renderBlock(child, childIndex, dark))}
      </div>
    </section>
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
      return <SectionHeading key={key} dark={dark}>{block.text}</SectionHeading>;
    case 'correct_answer':
      return (
        <p key={key} className={`font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>
          Correct Answer: <span className="font-mono font-bold">{renderCorrectAnswerText(block.text)}</span>
        </p>
      );
    case 'paragraph':
      return (
        <div key={key} className="space-y-2">
          {block.label && <SectionHeading dark={dark}>{block.label}</SectionHeading>}
          {renderParagraphText(block.text, dark)}
        </div>
      );
    case 'distractor_section':
      return <DistractorSection key={key} block={block} dark={dark} id={key} />;
    case 'pattern':
      return (
        <div key={key} className="space-y-2">
          <SectionHeading dark={dark}>
            Pattern{block.label ? ` — ${block.label}` : ''}
          </SectionHeading>
          <MathDisplay
            expression={block.expression}
            dark={dark}
            label={block.label ? `Pattern, ${block.label}` : 'Pattern'}
          />
        </div>
      );
    case 'math':
      return <MathDisplay key={key} expression={block.expression} dark={dark} />;
    case 'solution':
      return (
        <div key={key} className="space-y-2">
          <SectionHeading dark={dark}>Apply the Pattern</SectionHeading>
          <MathDisplay expression={block.expression} dark={dark} label="Apply the Pattern" />
        </div>
      );
    case 'rule':
      return (
        <div key={key} className="space-y-2">
          <SectionHeading dark={dark}>Rule</SectionHeading>
          <p className={`leading-relaxed whitespace-pre-line ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{renderInlineMathRichText(block.text)}</p>
        </div>
      );
    case 'common_trap':
      return (
        <div key={key} className="space-y-2">
          <SectionHeading dark={dark}>Common Trap</SectionHeading>
          <p className={`leading-relaxed whitespace-pre-line ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{renderInlineMathRichText(block.text)}</p>
        </div>
      );
    case 'answer':
      return (
        <p key={key} className={`font-semibold text-base ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>
          Answer: <span className="font-mono font-bold">{renderInlineMathRichText(block.text)}</span>
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
      <SectionHeading dark={dark} id={`${key}-title`}>{block.title}</SectionHeading>
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
