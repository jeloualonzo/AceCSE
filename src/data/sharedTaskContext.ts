import { getSharedTaskDefinitionForTaskFormat, taskFormatLabel } from '@/data/taxonomy';
import { normalizeIntendedNewlines } from '@/lib/text';
import type { QuestionGroup } from '@/types';

/**
 * How a shared task definition becomes the directions block a learner reads.
 *
 * This lived inline in `SectionRenderer` and is now shared, because the admin
 * management tooling has to show the EXACT learner-facing representation beside
 * the authored source. Re-deriving it there would have created a second
 * rendering of the same content that could silently drift from the booklet —
 * the one thing a review surface must never do.
 *
 * Nothing here reads or writes anything: the authored source stays
 * source-controlled in `content/taxonomy/taxonomy.json` and
 * `content/groups/<subject>/core-groups.json`. This module only projects it.
 */

/** The rendered directions block: what `GroupRenderer` receives as `sharedContext`. */
export interface SharedTaskContext {
  title: string;
  directions?: string;
  example?: string;
}

/**
 * The subset of a group this resolution needs — a shared task definition may
 * point at a group id via `directionsSource` and inherit its directions/example.
 */
export type SharedDirectionsSource = Pick<QuestionGroup, 'directions' | 'example'>;

/**
 * Joins one definition's `examples[]` into the single string the booklet shows.
 *
 * Spelling stacks input and result as separate blocks because its input is a
 * multi-line choice list; every other task reads as one line, so the two halves
 * are joined with an em dash. Each half is decoded first: authored examples
 * carry literal `\n` sequences that are declared to mean display line breaks.
 *
 * Returns `undefined` when the definition has no `examples` array at all, and
 * `''` when it has one that yields nothing usable — the caller distinguishes
 * those, so a definition with empty examples can still fall back to its
 * `directionsSource` group's example.
 */
export function sharedTaskExampleText(
  definition: Record<string, unknown> | undefined,
  taskFormat: string,
): string | undefined {
  if (!Array.isArray(definition?.examples)) return undefined;
  return definition.examples
    .filter((example): example is Record<string, unknown> => Boolean(example) && typeof example === 'object')
    .map((example) =>
      [example.input, example.result]
        .filter((part): part is string => typeof part === 'string')
        .map((part) => normalizeIntendedNewlines(part, 'decode-escaped-newlines'))
        .join(taskFormat === 'shared_spelling_task' ? '\n\n' : ' — '),
    )
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Whether a task context actually renders a directions header.
 *
 * A title alone is not enough — `GroupRenderer` shows the header only when
 * there are directions, an example, or content blocks. The admin workspace
 * reports this per structure, so it must be the same predicate the booklet uses
 * rather than a second reading of the same rule.
 */
export function hasSharedTaskContent(
  context: { directions?: string; example?: string } | undefined,
  contentBlockCount = 0,
): boolean {
  return Boolean(context?.directions || context?.example || contentBlockCount);
}

export interface ResolveSharedTaskContextInput {
  /** Canonical skill label, used only for the title fallback. */
  questionType: string;
  taskFormat: string;
  /** Group lookup, so a `directionsSource` reference can be followed. */
  getGroup: (groupId: string) => SharedDirectionsSource | undefined;
}

/**
 * The learner-facing directions block for a pool of one task format.
 *
 * Resolution order per field, unchanged from the booklet:
 *  - `title`: the definition's own title, else a label derived from the task format.
 *  - `directions`: the definition's own directions, else the `directionsSource` group's.
 *  - `example`: the definition's joined examples, else the `directionsSource` group's.
 *
 * A task format with no shared definition at all still yields a title, which is
 * why the return type is not optional — the booklet always has a heading.
 */
export function resolveSharedTaskContext({
  questionType,
  taskFormat,
  getGroup,
}: ResolveSharedTaskContextInput): SharedTaskContext {
  const definition = getSharedTaskDefinitionForTaskFormat(taskFormat)?.[1];
  const directionsSource =
    definition && typeof definition.directionsSource === 'string'
      ? getGroup(definition.directionsSource)
      : undefined;
  const examples = sharedTaskExampleText(definition, taskFormat);
  return {
    title: typeof definition?.title === 'string' ? definition.title : taskFormatLabel(questionType, taskFormat),
    directions: typeof definition?.directions === 'string' ? definition.directions : directionsSource?.directions,
    example: examples || directionsSource?.example,
  };
}
