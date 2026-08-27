import type {
  StructuredExplanation,
  StructuredExplanationBlock,
  StructuredExplanationDistractorSectionBlock,
} from '@/types';

const BLOCK_TYPES = new Set<StructuredExplanationBlock['type']>([
  'heading',
  'paragraph',
  'distractor_section',
  'math',
  'pattern',
  'solution',
  'correct_answer',
  'answer',
  'rule',
  'common_trap',
  'step',
  'alternative_solution',
  'collapsible',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDistractorSection(value: unknown): value is StructuredExplanationDistractorSectionBlock {
  if (typeof value !== 'object' || value === null) return false;
  const section = value as Record<string, unknown>;
  return isNonEmptyString(section.title)
    && Array.isArray(section.blocks)
    && section.blocks.length > 0
    && section.blocks.every((child) => (
      typeof child === 'object'
      && child !== null
      && (child as Record<string, unknown>).type === 'paragraph'
      && isNonEmptyString((child as Record<string, unknown>).text)
      && !Object.hasOwn(child, 'label')
    ));
}

function isBlock(value: unknown): value is StructuredExplanationBlock {
  if (typeof value !== 'object' || value === null) return false;
  const block = value as Record<string, unknown>;
  if (typeof block.type !== 'string' || !BLOCK_TYPES.has(block.type as StructuredExplanationBlock['type'])) {
    return false;
  }

  switch (block.type) {
    case 'heading':
      return isNonEmptyString(block.text) && block.text.trim() !== 'Solution';
    case 'rule':
    case 'common_trap':
      return isNonEmptyString(block.text);
    case 'paragraph':
      return isNonEmptyString(block.text) && (block.label === undefined || isNonEmptyString(block.label));
    case 'collapsible':
      return isNonEmptyString(block.title) && isNonEmptyString(block.content);
    case 'distractor_section':
      return isDistractorSection(block);
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
