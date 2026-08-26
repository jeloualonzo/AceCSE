import { createElement } from 'react';

interface FractionParts {
  sign: string;
  numerator: string;
  denominator: string;
}

const FRACTION_PATTERN = /^([−-]?)(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/;

function parseFraction(value: string): FractionParts | null {
  const match = value.trim().match(FRACTION_PATTERN);
  if (!match) return null;
  return {
    sign: match[1] ?? '',
    numerator: match[2] ?? '',
    denominator: match[3] ?? '',
  };
}

/**
 * Renders a standalone authored fraction as semantic MathML while leaving all
 * other learner-facing values as their original text. This is intentionally
 * value-level rather than question-specific so sequences and choices share the
 * same fraction presentation in Practice, booklet, and Results.
 */
export const MathValue: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => {
  const fraction = parseFraction(value);
  if (!fraction) return <>{value}</>;

  return createElement(
    'math',
    {
      role: 'math',
      'data-testid': 'fraction-math-value',
      'aria-label': value.replace('-', '−'),
      className: `inline-block align-middle text-[1.2em] ${className}`.trim(),
      xmlns: 'http://www.w3.org/1998/Math/MathML',
    },
    createElement(
      'mrow',
      null,
      fraction.sign && createElement('mo', null, fraction.sign === '-' ? '−' : fraction.sign),
      createElement('mfrac', null, createElement('mn', null, fraction.numerator), createElement('mn', null, fraction.denominator)),
    ),
  );
};
