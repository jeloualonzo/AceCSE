import type { StructuredExplanation, StructuredExplanationBlock } from '@/types';

const BLOCK_TYPES = new Set<StructuredExplanationBlock['type']>([
  'heading',
  'paragraph',
  'math',
  'pattern',
  'solution',
  'correct_answer',
  'answer',
  'rule',
  'common_trap',
  'step',
  'alternative_solution',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBlock(value: unknown): value is StructuredExplanationBlock {
  if (typeof value !== 'object' || value === null) return false;
  const block = value as Record<string, unknown>;
  if (typeof block.type !== 'string' || !BLOCK_TYPES.has(block.type as StructuredExplanationBlock['type'])) {
    return false;
  }

  switch (block.type) {
    case 'heading':
    case 'rule':
    case 'common_trap':
      return isNonEmptyString(block.text);
    case 'paragraph':
      return isNonEmptyString(block.text) && (block.label === undefined || isNonEmptyString(block.label));
    case 'math':
    case 'pattern':
    case 'solution':
      return isNonEmptyString(block.expression)
        && (block.label === undefined || isNonEmptyString(block.label));
    case 'correct_answer':
      return isNonEmptyString(block.text);
    case 'answer':
      return isNonEmptyString(block.text)
        && (block.variant === undefined || block.variant === 'final');
    case 'step':
    case 'alternative_solution':
      return isNonEmptyString(block.title)
        && Array.isArray(block.blocks)
        && block.blocks.length > 0
        && block.blocks.every(isBlock);
    default:
      return false;
  }
}

/** Runtime guard used before the structured renderer takes precedence. */
export function isValidStructuredExplanation(value: unknown): value is StructuredExplanation {
  if (typeof value !== 'object' || value === null) return false;
  const explanation = value as Record<string, unknown>;
  return Array.isArray(explanation.blocks)
    && explanation.blocks.length > 0
    && explanation.blocks.every(isBlock);
}

/** Invalid or absent pilot data returns undefined so legacy prose can render. */
export function getStructuredExplanation(value: unknown): StructuredExplanation | undefined {
  return isValidStructuredExplanation(value) ? value : undefined;
}
