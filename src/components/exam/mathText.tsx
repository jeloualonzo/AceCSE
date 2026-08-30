/**
 * The one semantic-math layer every learner-facing surface reads.
 *
 * AceCSE has exactly one math renderer: a small LaTeX subset compiled to
 * semantic MathML, hand-written so the app carries no KaTeX/MathJax payload.
 * It used to live inside `StructuredExplanationRenderer`, which meant only
 * explanation prose could stack a fraction — question stems printed `3/8` flat
 * and choices could only render a value that was a fraction and nothing else.
 * Moving it here lets stems, choices, and explanations share the same
 * tokenizer instead of growing a second, divergent system.
 *
 * Entry points:
 *   - `MathText` / `renderMathText` — mixed prose that may contain fractions or
 *     `\(…\)` inline LaTeX. Used by question stems and choice text.
 *   - `renderLatexTokens` — the tokenizer, used by display equations.
 *   - `formatLatexForAria` — the honest text equivalent for `aria-label`.
 *
 * `renderMathText` reads a whole expression, not one fraction at a time. A stem
 * asking for `(2/3) × (9/14)` used to print two stacked fractions stranded among
 * prose-sized parentheses and a prose-sized `×`; it is now compiled to a single
 * `<math>` element, so fences stretch to the fractions they hold and every part
 * shares one scale. Ordinary prose stays ordinary: an expression is only emitted
 * when a real fraction takes part, so `The answer is 135.`, `08/30/2026`,
 * `and/or`, and `https://csc.gov.ph/faq` are untouched.
 */

import { createElement } from 'react';
import { MathValue } from './MathValue';

/**
 * Fraction / inline-LaTeX detection, shared by prose, stems, and choices.
 *
 * The lookbehind and lookahead guards are the whole safety story: a bare
 * `digits/digits` run becomes a fraction only when it is not glued to a word
 * character, another slash, or a thousands separator, and only when a following
 * dot is sentence punctuation rather than the start of a decimal, a file
 * extension, or another path segment. That is what keeps `and/or`,
 * `A/B testing`, `https://csc.gov.ph/faq`, `08/30/2026`, and the `061/8` inside
 * `1,061/8` as ordinary text while `3/8`, `5/12`, the `1/8` inside `4 1/8`, and
 * the `4/3` closing `One of the numbers is 4/3.` render as real fractions — a
 * sentence should not have to avoid ending on a fraction to have it typeset.
 * Deliberately ONE pattern for every surface — a second heuristic would drift.
 */
export const INLINE_MATH_PATTERN =
  /\\\(([\s\S]*?)\\\)|(?<![\w./])(?<!\d,)([−-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![\w/])(?!\.[\w/])/g;

/** Reads a brace-delimited LaTeX group, honouring nesting. */
export function readLatexGroup(source: string, start: number): { content: string; end: number } | null {
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
  // Signs belong here for scientific notation: `8.5 × 10^{-3}` has to read
  // `8.5 × 10⁻³`, not `8.5 × 10-³`.
  '-': '⁻', '−': '⁻', '+': '⁺',
};

/**
 * Spoken radical glyphs by index. Beyond the fourth root there is no Unicode
 * radical, so the aria text falls back to `5√32` — honest, and still ordered
 * index-then-radicand the way it is read aloud.
 */
const INDEX_RADICALS: Record<string, string> = { '2': '√', '3': '∛', '4': '∜' };

/**
 * Relational and sign macros that map straight onto one Unicode operator.
 *
 * Ordered so that no entry is reached through a longer entry's prefix — the scan
 * takes the first match, and `\le` is a prefix of `\leq`. Before these existed,
 * an authored `\approx` reached the learner DOM as a literal backslash followed
 * by the identifier `approx`: a raw-LaTeX leak, just a quiet one.
 */
const LATEX_OPERATOR_MACROS: ReadonlyArray<readonly [string, string]> = [
  ['\\approx', '≈'],
  ['\\lbrace', '{'],
  ['\\rbrace', '}'],
  ['\\lvert', '|'],
  ['\\rvert', '|'],
  ['\\cdot', '·'],
  ['\\leq', '≤'],
  ['\\geq', '≥'],
  ['\\neq', '≠'],
  ['\\le', '≤'],
  ['\\ge', '≥'],
  ['\\pm', '±'],
];

function formatSuperscript(value: string): string {
  return [...value].map((character) => SUPERSCRIPT_DIGITS[character] ?? character).join('');
}

/**
 * `line-through` inherits `currentColor`, so the strike is legible on the light
 * shell and the dark exam surface without either theme having to plumb a colour
 * in. MathML Core routes `text-decoration` to descendants, which is the
 * portable way to draw this — `<menclose notation="updiagonalstrike">` is not
 * implemented in Chromium.
 */
const CANCEL_STRIKE_CLASS = 'line-through';

/**
 * A fraction operand or a radicand that is itself compound keeps its own fence
 * in the spoken text.
 *
 * The flattening below turns structure into slashes, and a compound operand
 * loses its grouping on the way: `\frac{x+1}{2}` read as `x+1/2` says something
 * the page does not draw, `\sqrt{2+3}` read as `√2+3` likewise, and a nested
 * `\frac{\frac{1}{2}}{\frac{3}{4}}` flattened to `1/2/3/4` says nothing at all.
 * An atomic operand — a number, an identifier, a cancellation note — is left
 * bare, which is what keeps every label the bank already produces unchanged.
 */
function groupAriaOperand(operand: string): string {
  const trimmed = operand.trim();
  return /[/+×÷−-]/.test(trimmed) ? `(${trimmed})` : trimmed;
}

function formatLatexForAriaLine(line: string): string {
  let formatted = line;
  let previous: string;
  // Cancellations resolve before fractions: `\frac` flattening only matches
  // groups with no inner braces, so `\frac{\cancelto{1}{13}}{12}` has to lose
  // its `\cancelto` first. Looping lets them unwind in any nesting order,
  // `\sqrt` included.
  do {
    previous = formatted;
    formatted = formatted
      .replace(/\\cancelto\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$2 (cancels to $1)')
      .replace(/\\cancel\s*\{([^{}]*)\}/g, '$1 (cancels)')
      .replace(
        /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
        (_, numerator: string, denominator: string) =>
          `${groupAriaOperand(numerator)}/${groupAriaOperand(denominator)}`,
      )
      .replace(
        /\\sqrt\s*\[([^[\]]*)\]\s*\{([^{}]*)\}/g,
        (_, degree: string, radicand: string) =>
          `${INDEX_RADICALS[degree.trim()] ?? `${degree.trim()}√`}${groupAriaOperand(radicand)}`,
      )
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, radicand: string) => `√${groupAriaOperand(radicand)}`);
  } while (formatted !== previous);

  return formatted
    .replaceAll('\\times', ' × ')
    .replaceAll('\\div', ' ÷ ')
    .replaceAll('\\rightarrow', ' → ')
    .replaceAll('\\qquad', '  ')
    .replaceAll('\\quad', ' ')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    // After `\left`/`\right` are gone, so `\le` can never eat the `\left` in
    // `\left(`. Longest-first among themselves for the same reason.
    .replaceAll('\\approx', ' ≈ ')
    .replaceAll('\\lbrace', '{')
    .replaceAll('\\rbrace', '}')
    .replaceAll('\\lvert', '|')
    .replaceAll('\\rvert', '|')
    .replaceAll('\\cdot', ' · ')
    .replaceAll('\\leq', ' ≤ ')
    .replaceAll('\\geq', ' ≥ ')
    .replaceAll('\\neq', ' ≠ ')
    .replaceAll('\\le', ' ≤ ')
    .replaceAll('\\ge', ' ≥ ')
    .replaceAll('\\pm', ' ± ')
    .replace(/\\\s+-/g, '−')
    .replaceAll('\\_', '_')
    .replace(/\\\s/g, ' ')
    .replace(/\^\{([^{}]*)\}/g, (_, value: string) => formatSuperscript(value))
    .replace(/\^([0-9]+)/g, (_, value: string) => formatSuperscript(value))
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatLatexForAria(expression: string): string {
  return expression
    .split(/\r?\n/)
    .map(formatLatexForAriaLine)
    .filter(Boolean)
    .join('; ');
}

export function renderLatexTokens(line: string, keyPrefix = 'math'): React.ReactNode[] {
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

    // `\sqrt{…}` is the root notation the bank authors, and stems already print
    // the radical as text (`What is √0.0081?`). `msqrt` draws it with a real
    // overbar, so the radicand's extent is unambiguous — the reason a `√` glyph
    // followed by loose digits is not good enough in display math.
    //
    // `\sqrt[3]{8}` takes the same path into `mroot`, whose children are
    // (radicand, index) in that order. Without this branch the optional degree
    // was not read at all: `\sqrt[3]{8}` rendered as `∛`-less `√8` with a
    // literal `[3]` stranded in front of it — raw authored LaTeX in the learner
    // DOM. An index is only honoured when its bracket actually closes.
    if (line.startsWith('\\sqrt', index)) {
      let afterMacro = index + '\\sqrt'.length;
      let degree: string | null = null;
      if (line[afterMacro] === '[') {
        const close = line.indexOf(']', afterMacro + 1);
        if (close !== -1) {
          degree = line.slice(afterMacro + 1, close);
          afterMacro = close + 1;
        }
      }
      const radicand = readLatexGroup(line, afterMacro);
      if (radicand) {
        const body = createElement('mrow', null, renderLatexTokens(radicand.content, `${keyPrefix}-sqrt`));
        nodes.push(degree === null
          ? createElement('msqrt', { key: nextKey() }, body)
          : createElement(
              'mroot',
              { key: nextKey() },
              body,
              createElement('mrow', null, renderLatexTokens(degree, `${keyPrefix}-root-index`)),
            ));
        index = radicand.end;
        continue;
      }
    }

    // `\cancelto` must be tested before `\cancel` — it is a longer prefix of
    // the same macro name. `\cancelto{1}{13}` is the notation that answers
    // "what does the cancelled value become?": 13 struck through, with the 1 it
    // reduces to set beside it, exactly as the LaTeX `cancel` package draws it.
    if (line.startsWith('\\cancelto', index)) {
      const replacement = readLatexGroup(line, index + '\\cancelto'.length);
      const target = replacement ? readLatexGroup(line, replacement.end) : null;
      if (replacement && target) {
        nodes.push(createElement(
          'msup',
          { key: nextKey(), 'data-testid': 'math-cancel' },
          createElement(
            'mrow',
            { 'data-cancel': 'from', className: CANCEL_STRIKE_CLASS },
            renderLatexTokens(target.content, `${keyPrefix}-cancel-from`),
          ),
          createElement(
            'mrow',
            { 'data-cancel': 'to' },
            renderLatexTokens(replacement.content, `${keyPrefix}-cancel-to`),
          ),
        ));
        index = target.end;
        continue;
      }
    }
    if (line.startsWith('\\cancel', index)) {
      const target = readLatexGroup(line, index + '\\cancel'.length);
      if (target) {
        nodes.push(createElement(
          'mrow',
          { key: nextKey(), 'data-testid': 'math-cancel', 'data-cancel': 'from', className: CANCEL_STRIKE_CLASS },
          renderLatexTokens(target.content, `${keyPrefix}-cancel`),
        ));
        index = target.end;
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
    // Deliberately after `\left`/`\right`, so `\le` can never claim the `\left`
    // in `\left(`.
    const operatorMacro = LATEX_OPERATOR_MACROS.find(([name]) => line.startsWith(name, index));
    if (operatorMacro) {
      appendOperator(operatorMacro[1]);
      index += operatorMacro[0].length;
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
    // A balanced parenthesised group becomes a real `mrow`, which is what lets
    // MathML size the fences to what they hold: `(2/3) × (9/14)` gets parens as
    // tall as the stacked fractions instead of prose-height ones beside them.
    // An unbalanced `(` still falls through to a plain `<mo>` below.
    if (character === '(') {
      let depth = 0;
      let close = -1;
      for (let scan = index; scan < line.length; scan += 1) {
        if (line[scan] === '(') depth += 1;
        else if (line[scan] === ')') {
          depth -= 1;
          if (depth === 0) {
            close = scan;
            break;
          }
        }
      }
      if (close !== -1) {
        nodes.push(createElement(
          'mrow',
          { key: nextKey() },
          createElement('mo', { key: 'open' }, '('),
          createElement('mrow', { key: 'body' }, renderLatexTokens(line.slice(index + 1, close), `${keyPrefix}-group`)),
          createElement('mo', { key: 'close' }, ')'),
        ));
        index = close + 1;
        continue;
      }
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

export function InlineLatexMath({
  expression,
  keyPrefix,
  testId = 'structured-inline-math',
}: {
  expression: string;
  keyPrefix: string;
  testId?: string;
}): React.ReactNode {
  return createElement(
    'math',
    {
      key: `${keyPrefix}-latex`,
      role: 'math',
      'data-testid': testId,
      'aria-label': formatLatexForAria(expression),
      className: 'inline-block align-middle text-[1.2em]',
      xmlns: 'http://www.w3.org/1998/Math/MathML',
    },
    createElement('mrow', null, renderLatexTokens(expression, `${keyPrefix}-latex`)),
  );
}

/**
 * The vulgar fractions the bank actually authors (`7¾ – 3⅝`, `2⅔ × 1½`), mapped
 * onto the same `\frac` the explanation renderer draws. Authored text is never
 * rewritten to earn a stacked fraction — it is read as one.
 */
const VULGAR_FRACTIONS: Record<string, string> = {
  '¼': '\\frac{1}{4}', '½': '\\frac{1}{2}', '¾': '\\frac{3}{4}',
  '⅐': '\\frac{1}{7}', '⅑': '\\frac{1}{9}', '⅒': '\\frac{1}{10}',
  '⅓': '\\frac{1}{3}', '⅔': '\\frac{2}{3}',
  '⅕': '\\frac{1}{5}', '⅖': '\\frac{2}{5}', '⅗': '\\frac{3}{5}', '⅘': '\\frac{4}{5}',
  '⅙': '\\frac{1}{6}', '⅚': '\\frac{5}{6}',
  '⅛': '\\frac{1}{8}', '⅜': '\\frac{3}{8}', '⅝': '\\frac{5}{8}', '⅞': '\\frac{7}{8}',
};

/**
 * Operators that may bind two operands into ONE expression.
 *
 * Two absences are load-bearing. `/` is not here: a slash reaches the math side
 * only inside a fraction `INLINE_MATH_PATTERN` already matched, which is what
 * keeps `08/30/2026`, `https://csc.gov.ph/faq`, `and/or`, and `A/B testing`
 * ordinary. `,` is not here either: a comma-separated run of fractions is a
 * list of values — a number series — not one expression, and must stay a list of
 * separately stacked values.
 */
const MATH_OPERATORS: Record<string, string> = {
  '+': '+',
  '=': '=',
  '-': '−', '−': '−', '–': '−', '—': '−',
  '×': '\\times', '*': '\\times', '·': '\\times',
  '÷': '\\div',
};

type MathAtomKind = 'fraction' | 'vulgar' | 'number' | 'identifier' | 'operator' | 'power' | 'open' | 'close' | 'space' | 'latex' | 'prose';

interface MathAtom {
  kind: MathAtomKind;
  start: number;
  end: number;
  /** The atom in the LaTeX subset `renderLatexTokens` already speaks. */
  latex: string;
  /** Original source, so a lone authored fraction can go back to `MathValue`. */
  source: string;
}

/**
 * A radical glyph is unambiguous mathematical notation, unlike a bare slash.
 * Convert it into the same LaTex subset used by authored inline equations so
 * a stem such as `What is √0.0081?` receives a genuine MathML radical rather
 * than relying on a nearby fixture-only LaTeX duplicate.
 */
function readUnicodeRadical(text: string, start: number): { latex: string; end: number } | null {
  const radical = text[start];
  const macro = radical === '√'
    ? '\\sqrt'
    : radical === '∛'
      ? '\\sqrt[3]'
      : radical === '∜'
        ? '\\sqrt[4]'
        : null;
  if (!macro) return null;

  let end = start + 1;
  if (text[end] === '(') {
    let depth = 0;
    for (let index = end; index < text.length; index += 1) {
      if (text[index] === '(') depth += 1;
      if (text[index] === ')') {
        depth -= 1;
        if (depth === 0) {
          const radicand = text.slice(end + 1, index).replace(
            /([−-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g,
            (_match, numerator: string, denominator: string) => `\\frac{${numerator}}{${denominator}}`,
          );
          return { latex: `${macro}{${radicand}}`, end: index + 1 };
        }
      }
    }
    return null;
  }

  const radicandStart = end;
  while (/\d/.test(text[end] ?? '')) end += 1;
  if (text[end] === '.' && /\d/.test(text[end + 1] ?? '')) {
    end += 1;
    while (/\d/.test(text[end] ?? '')) end += 1;
  }
  if (end === radicandStart) return null;
  return { latex: `${macro}{${text.slice(radicandStart, end)}}`, end };
}

/**
 * Splits text into atoms the expression grammar can read, with everything else
 * marked `prose` so it can never be absorbed.
 *
 * Fractions and `\(…\)` come straight from `INLINE_MATH_PATTERN`, so fraction
 * detection — and every false-positive guard on it — keeps exactly one
 * implementation shared with the explanation renderer.
 */
function scanMathAtoms(text: string): MathAtom[] {
  const seeds = new Map<number, MathAtom>();
  for (const match of text.matchAll(INLINE_MATH_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (match[1] !== undefined) {
      seeds.set(start, { kind: 'latex', start, end, latex: match[1], source: match[0] });
      continue;
    }
    const signed = /^[−-]/.test(match[2]);
    const numerator = signed ? match[2].slice(1) : match[2];
    seeds.set(start, {
      kind: 'fraction',
      start,
      end,
      latex: `${signed ? '−' : ''}\\frac{${numerator}}{${match[3]}}`,
      source: match[0],
    });
  }

  const atoms: MathAtom[] = [];
  let index = 0;
  const push = (kind: MathAtomKind, start: number, end: number, latex: string) => {
    atoms.push({ kind, start, end, latex, source: text.slice(start, end) });
  };

  while (index < text.length) {
    const seed = seeds.get(index);
    if (seed) {
      atoms.push(seed);
      index = seed.end;
      continue;
    }

    const character = text[index];
    const unicodeRadical = readUnicodeRadical(text, index);
    if (unicodeRadical) {
      push('latex', index, unicodeRadical.end, unicodeRadical.latex);
      index = unicodeRadical.end;
      continue;
    }
    const vulgar = VULGAR_FRACTIONS[character];
    if (vulgar) {
      push('vulgar', index, index + 1, vulgar);
      index += 1;
      continue;
    }
    // Only inline whitespace can join an expression: a newline is a layout break
    // the stem's own `whitespace-pre-line` has to keep.
    if (character === ' ' || character === '\t') {
      const start = index;
      while (index < text.length && (text[index] === ' ' || text[index] === '\t')) index += 1;
      push('space', start, index, ' ');
      continue;
    }
    if (/\d/.test(character)) {
      const start = index;
      while (index < text.length && /\d/.test(text[index])) index += 1;
      if (text[index] === '.' && /\d/.test(text[index + 1] ?? '')) {
        index += 1;
        while (index < text.length && /\d/.test(text[index])) index += 1;
      }
      push('number', start, index, text.slice(start, index));
      continue;
    }
    if (/[a-zA-Z]/.test(character)) {
      const start = index;
      while (/[a-zA-Z]/.test(text[index] ?? '')) index += 1;
      push('identifier', start, index, text.slice(start, index));
      continue;
    }
    if (character === '^') {
      push('power', index, index + 1, '^');
      index += 1;
      continue;
    }
    const operator = MATH_OPERATORS[character];
    if (operator) {
      push('operator', index, index + 1, operator);
      index += 1;
      continue;
    }
    if (character === '(' || character === ')') {
      push(character === '(' ? 'open' : 'close', index, index + 1, character);
      index += 1;
      continue;
    }
    push('prose', index, index + 1, '');
    index += 1;
  }

  return atoms;
}

interface MathParse {
  /** Index of the first atom past the expression. */
  next: number;
  latex: string;
  /**
   * A real fraction took part. A run of bare numbers and operators is arithmetic
   * *prose* (`The answer is 135.`, `0.60 × 120 = 72`) and is left alone — this is
   * the flag that keeps ordinary numbers out of math.
   */
  hasFraction: boolean;
  /** A plain-text exponent is also explicit mathematical notation. */
  hasPower: boolean;
  /** The parse is exactly one authored `n/d`, so `MathValue` can render it. */
  loneFraction: MathAtom | null;
}

function skipSpace(atoms: MathAtom[], index: number): number {
  return atoms[index]?.kind === 'space' ? index + 1 : index;
}

function parseOperand(atoms: MathAtom[], index: number): MathParse | null {
  const atom = atoms[index];
  if (!atom) return null;
  if (atom.kind === 'fraction' || atom.kind === 'vulgar') {
    return {
      next: index + 1,
      latex: atom.latex,
      hasFraction: true,
      hasPower: false,
      loneFraction: atom.kind === 'fraction' ? atom : null,
    };
  }
  if (atom.kind === 'number') {
    return { next: index + 1, latex: atom.latex, hasFraction: false, hasPower: false, loneFraction: null };
  }
  if (atom.kind === 'identifier') {
    // A letter only enters the math grammar when the immediately following
    // caret makes its intent explicit. Treating every prose word as an operand
    // would let `rate — 3/4` swallow its trailing fraction into a false
    // expression, while `x^2` and `a^m` remain supported.
    if (atoms[index + 1]?.kind !== 'power') return null;
    return { next: index + 1, latex: atom.latex, hasFraction: false, hasPower: false, loneFraction: null };
  }
  if (atom.kind === 'open') {
    const inner = parseExpression(atoms, skipSpace(atoms, index + 1));
    if (!inner) return null;
    const close = skipSpace(atoms, inner.next);
    if (atoms[close]?.kind !== 'close') return null;
    return {
      next: close + 1,
      latex: `(${inner.latex})`,
      hasFraction: inner.hasFraction,
      hasPower: inner.hasPower,
      loneFraction: null,
    };
  }
  return null;
}

/** Applies a tight caret exponent to a parsed base. */
function withPower(atoms: MathAtom[], base: MathParse): MathParse {
  const power = atoms[base.next];
  if (power?.kind !== 'power') return base;

  let next = base.next + 1;
  let sign = '';
  const signAtom = atoms[next];
  if (signAtom?.kind === 'operator' && (signAtom.source === '-' || signAtom.source === '−')) {
    sign = '−';
    next += 1;
  }
  const exponent = atoms[next];
  if (!exponent || (exponent.kind !== 'number' && exponent.kind !== 'identifier')) return base;
  return {
    next: next + 1,
    latex: `${base.latex}^{${sign}${exponent.latex}}`,
    hasFraction: base.hasFraction,
    hasPower: true,
    loneFraction: null,
  };
}

/**
 * One operand, plus the mixed-number forms the bank authors: a whole number
 * against a fraction, either spaced (`4 3/8`, `132 5/8`) or set tight against a
 * vulgar fraction (`2⅔`, `1½`).
 *
 * A *signed* fraction is never a mixed part: `3 − 1/2` is a subtraction, and the
 * shared pattern hands back `−1/2` as one token when the sign is tight against
 * the numerator, so the sign has to be checked here rather than assumed away.
 */
function parseTerm(atoms: MathAtom[], index: number): MathParse | null {
  const first = parseOperand(atoms, index);
  if (!first || atoms[index].kind !== 'number') return first ? withPower(atoms, first) : null;

  const tight = atoms[first.next];
  if (tight?.kind === 'vulgar') {
    // A thin space, not concatenation: `7 \frac{3}{4}` is how a mixed number is
    // typeset, and it is also what keeps the aria text honest — `73/4` would be
    // read as seventy-three quarters.
    return withPower(atoms, {
      next: first.next + 1,
      latex: `${first.latex} ${tight.latex}`,
      hasFraction: true,
      hasPower: false,
      loneFraction: null,
    });
  }
  const spaced = tight?.kind === 'space' ? atoms[first.next + 1] : undefined;
  if (spaced && (spaced.kind === 'vulgar' || (spaced.kind === 'fraction' && !/^[−-]/.test(spaced.source)))) {
    return withPower(atoms, {
      next: first.next + 2,
      latex: `${first.latex} ${spaced.latex}`,
      hasFraction: true,
      hasPower: false,
      loneFraction: null,
    });
  }
  return withPower(atoms, first);
}

/**
 * `term (operator term)*` — the whole point of the grammar. It is what makes
 * `(2/3) × (9/14)` one expression whose parens, operator, and fractions share a
 * single math presentation, instead of two stacked fractions marooned among
 * prose-sized punctuation. An operator is only absorbed when a real operand
 * follows it, so a trailing `–` in prose can never drag the sentence in.
 */
function parseExpression(atoms: MathAtom[], index: number): MathParse | null {
  const first = parseTerm(atoms, index);
  if (!first) return null;

  let { next, latex, hasFraction, hasPower, loneFraction } = first;
  for (;;) {
    const operatorIndex = skipSpace(atoms, next);
    const operator = atoms[operatorIndex];
    if (operator?.kind !== 'operator') break;
    const term = parseTerm(atoms, skipSpace(atoms, operatorIndex + 1));
    if (!term) break;
    latex += `${operator.latex}${term.latex}`;
    hasFraction = hasFraction || term.hasFraction;
    hasPower = hasPower || term.hasPower;
    loneFraction = null;
    next = term.next;
  }
  return { next, latex, hasFraction, hasPower, loneFraction };
}

/**
 * Splits mixed text into plain runs and math runs.
 *
 * A run that is nothing but one authored fraction goes to `MathValue`, so a
 * choice of `1/2` produces byte-identical markup to before. Anything larger —
 * `3/8 + 5/12`, `(2/3) × (9/14)`, `2⅔ × 1½ – (4/5 ÷ 2/3)`, `4 3/8` — is emitted
 * as ONE `<math>` element built by the shared LaTeX tokenizer, so its fractions,
 * operators, and fences all sit at the same mathematical scale.
 */
export function renderMathText(text: string, keyPrefix: string): React.ReactNode[] {
  const atoms = scanMathAtoms(text);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;
  let index = 0;

  const flushTextBefore = (start: number) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
  };

  while (index < atoms.length) {
    const atom = atoms[index];

    // Authored `\(…\)` stays exactly what it was: its own inline equation.
    if (atom.kind === 'latex') {
      flushTextBefore(atom.start);
      parts.push(
        <InlineLatexMath key={`${keyPrefix}-latex-${matchIndex++}`} expression={atom.latex} keyPrefix={keyPrefix} />,
      );
      cursor = atom.end;
      index += 1;
      continue;
    }

    const canStart = atom.kind === 'fraction' || atom.kind === 'vulgar' || atom.kind === 'number' || atom.kind === 'identifier' || atom.kind === 'open';
    const expression = canStart ? parseExpression(atoms, index) : null;
    if (expression && (expression.hasFraction || expression.hasPower)) {
      flushTextBefore(atom.start);
      parts.push(expression.loneFraction
        ? <MathValue key={`${keyPrefix}-fraction-${matchIndex++}`} value={expression.loneFraction.source} />
        : (
          <InlineLatexMath
            key={`${keyPrefix}-expression-${matchIndex++}`}
            expression={expression.latex}
            keyPrefix={`${keyPrefix}-expression-${matchIndex}`}
            testId="math-expression"
          />
        ));
      cursor = atoms[expression.next - 1].end;
      index = expression.next;
      continue;
    }

    index += 1;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length > 0 ? parts : [text];
}

/**
 * Drop-in replacement for `{someText}` in a question stem or choice. Renders a
 * fragment, so the caller's own `whitespace-pre-line` / `leading-*` classes and
 * DOM shape stay exactly as they were.
 */
export const MathText: React.FC<{ text: string; keyPrefix?: string }> = ({ text, keyPrefix = 'math-text' }) => (
  <>{renderMathText(text, keyPrefix)}</>
);
