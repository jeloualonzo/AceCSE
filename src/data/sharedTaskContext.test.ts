import { describe, expect, it } from 'vitest';
import {
  hasSharedTaskContent,
  resolveSharedTaskContext,
  sharedTaskExampleText,
} from './sharedTaskContext';
import { CANONICAL_TAXONOMY } from './taxonomy';

/**
 * `resolveSharedTaskContext` is the ONE derivation of a shared task's
 * learner-facing directions block. The booklet's `SectionRenderer` calls it for
 * every pool node, and the admin structures workspace calls it to show what a
 * learner reads. These tests pin the behavior both depend on — if it changed for
 * one surface it would have to change for both, which is the point.
 */

const noGroups = () => undefined;

describe('resolveSharedTaskContext', () => {
  it('prefers the definition’s own title and directions', () => {
    const context = resolveSharedTaskContext({
      questionType: 'Filing',
      taskFormat: 'shared_filing_task',
      getGroup: noGroups,
    });
    const definition = CANONICAL_TAXONOMY.sharedTaskDefinitions.filing_default;

    expect(context.title).toBe(definition.title);
    expect(context.directions).toBe(definition.directions);
  });

  it('falls back to a readable label when a definition carries no title', () => {
    // `letter_series_default` is a bare stub: task format, subject, schema only.
    const stub = CANONICAL_TAXONOMY.sharedTaskDefinitions.letter_series_default;
    expect(stub).toBeDefined();
    expect(stub.title).toBeUndefined();
    expect(stub.directions).toBeUndefined();

    const context = resolveSharedTaskContext({
      questionType: 'Letter Series',
      taskFormat: 'shared_letter_series_task',
      getGroup: noGroups,
    });

    // A label, never invented directions — the absence stays visible.
    expect(context.title).toBeTruthy();
    expect(context.directions).toBeUndefined();
    expect(context.example).toBeUndefined();
  });

  it('lets a definition’s own fields win over the group it delegates to', () => {
    // `filing_default` carries both its own directions/examples AND a
    // `directionsSource`, so it is exactly the precedence case: the group is
    // consulted, and its text must not override the authored definition.
    const definition = CANONICAL_TAXONOMY.sharedTaskDefinitions.filing_default;
    expect(definition.directionsSource).toBe('grp-filing-01');
    expect(definition.directions).toBeTruthy();

    const asked: string[] = [];
    const context = resolveSharedTaskContext({
      questionType: 'Filing',
      taskFormat: 'shared_filing_task',
      getGroup: (groupId) => {
        asked.push(groupId);
        return { directions: 'GROUP DIRECTIONS', example: 'GROUP EXAMPLE' };
      },
    });

    expect(asked).toEqual(['grp-filing-01']);
    expect(context.directions).toBe(definition.directions);
    expect(context.directions).not.toBe('GROUP DIRECTIONS');
    expect(context.example).not.toBe('GROUP EXAMPLE');
  });

  it('falls back to the delegated group when the definition authors neither field', () => {
    // No shipped definition delegates today, so this pins the fallback with a
    // task format that has no definition at all: the group must still be reached
    // only when the definition names it, which it cannot here.
    const context = resolveSharedTaskContext({
      questionType: 'Unknown Type',
      taskFormat: 'not_a_shared_task_format',
      getGroup: () => ({ directions: 'GROUP DIRECTIONS', example: 'GROUP EXAMPLE' }),
    });

    // Nothing invented, and no group consulted without a `directionsSource`.
    expect(context.directions).toBeUndefined();
    expect(context.example).toBeUndefined();
    expect(context.title).toBeTruthy();
  });

  it('never returns an escaped newline where a display break was authored', () => {
    for (const [, definition] of Object.entries(CANONICAL_TAXONOMY.sharedTaskDefinitions)) {
      const context = resolveSharedTaskContext({
        questionType: 'Any',
        taskFormat: String(definition.taskFormat ?? ''),
        getGroup: noGroups,
      });
      expect(context.example ?? '').not.toContain('\\n');
    }
  });
});

describe('sharedTaskExampleText', () => {
  it('joins an input and its result on one line by default', () => {
    const text = sharedTaskExampleText(
      { examples: [{ input: 'Santos, Ana', result: 'A' }] },
      'shared_filing_task',
    );
    expect(text).toBe('Santos, Ana — A');
  });

  it('stacks a spelling example, whose two parts are read as separate lines', () => {
    const text = sharedTaskExampleText(
      { examples: [{ input: 'recieve', result: 'receive' }] },
      'shared_spelling_task',
    );
    expect(text).toBe('recieve\n\nreceive');
  });

  it('decodes an authored escaped newline into a real break', () => {
    const text = sharedTaskExampleText(
      { examples: [{ input: 'A\\nB', result: 'C' }] },
      'shared_filing_task',
    );
    expect(text).toContain('\n');
    expect(text).not.toContain('\\n');
  });

  it('returns undefined rather than an empty string when there are no examples', () => {
    expect(sharedTaskExampleText(undefined, 'shared_filing_task')).toBeUndefined();
    expect(sharedTaskExampleText({}, 'shared_filing_task')).toBeUndefined();
  });

  it('skips a malformed example instead of throwing', () => {
    const text = sharedTaskExampleText(
      { examples: [null, { input: 'Kept' }, { result: 'Also kept' }] },
      'shared_filing_task',
    );
    expect(text).toBe('Kept\n\nAlso kept');
  });
});

/**
 * `GroupRenderer` shows the directions header only when there is something to
 * put under it. The structures workspace marks a structure "No directions
 * header" using this same predicate, so the marking cannot disagree with what
 * the booklet does.
 */
describe('hasSharedTaskContent', () => {
  it('is false for a title-only context', () => {
    expect(hasSharedTaskContent({})).toBe(false);
    expect(hasSharedTaskContent(undefined)).toBe(false);
  });

  it('is true for directions, an example, or a content block alone', () => {
    expect(hasSharedTaskContent({ directions: 'Do this.' })).toBe(true);
    expect(hasSharedTaskContent({ example: 'Like so.' })).toBe(true);
    expect(hasSharedTaskContent({}, 1)).toBe(true);
  });

  it('treats empty strings as absent, not as content', () => {
    expect(hasSharedTaskContent({ directions: '', example: '' }, 0)).toBe(false);
  });
});
