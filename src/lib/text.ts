export type NewlinePolicy = 'preserve' | 'decode-escaped-newlines';

/**
 * Normalize text only when its producer explicitly declares that literal
 * escape sequences represent display line breaks. Ordinary content stays
 * byte-for-byte unchanged under the default policy.
 */
export function normalizeIntendedNewlines(value: string, policy: NewlinePolicy = 'preserve'): string {
  if (policy === 'preserve') return value;
  return value
    .replaceAll('\\r\\n', '\n')
    .replaceAll('\\n', '\n')
    .replaceAll('\\r', '\n');
}
