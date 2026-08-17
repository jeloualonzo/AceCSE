import type {
  StructuredExplanation,
  StructuredExplanationBlock,
  StructuredExplanationLeafBlock,
} from '@/types';

const LEAF_TYPES = new Set<StructuredExplanationLeafBlock['type']>([
  'paragraph',
  'math',
  'answer',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLeafBlock(value: unknown): value is StructuredExplanationLeafBlock {
  if (typeof value !== 'object' || value === null) return false;
  const block = value as Record<string, unknown>;
  return (
    typeof block.type === 'string' &&
    LEAF_TYPES.has(block.type as StructuredExplanationLeafBlock['type']) &&
    isNonEmptyString(block.text ?? block.expression)
  );
}

function isBlock(value: unknown): value is StructuredExplanationBlock {
  if (isLeafBlock(value)) return true;
  if (typeof value !== 'object' || value === null) return false;
  const block = value as Record<string, unknown>;
  if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'answer') {
    return isNonEmptyString(block.text);
  }
  if (block.type === 'math') return isNonEmptyString(block.expression);
  if (block.type !== 'step' || !isNonEmptyString(block.title) || !Array.isArray(block.blocks)) return false;
  return block.blocks.length > 0 && block.blocks.every(isLeafBlock);
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
export function getStructuredExplanation(
  value: StructuredExplanation | unknown
): StructuredExplanation | undefined {
  return isValidStructuredExplanation(value) ? value : undefined;
}
