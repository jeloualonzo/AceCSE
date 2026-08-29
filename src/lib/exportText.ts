/**
 * Character-exact export text: ONE string for generating, counting, chunking,
 * displaying, and copying.
 *
 * ## Why this module exists
 *
 * ChatGPT silently converts a large paste into an `.md` attachment, so review
 * Markdown has to be handed over in chunks small enough to stay inline. That
 * only works if the number the UI shows is the number of characters that
 * actually land on the clipboard. Three things make that non-obvious:
 *
 * 1. **Line endings.** Chromium on Windows expands `\n` to `\r\n` when it writes
 *    `CF_UNICODETEXT`, so the code units sitting on the clipboard are NOT the
 *    ones counted here. That expansion is harmless as long as the destination
 *    collapses each break back to one character again — which is exactly what
 *    the tools this export targets do. Measured 2026-08-23 against Windows
 *    Notepad: `filing-batch-02` normalized to CRLF displayed 8,000 characters
 *    for chunk 1, and Notepad reported 7,678 for the same paste. The difference
 *    is 322 — precisely that chunk's line-break count. Notepad counts a break as
 *    one character.
 *
 *    So this module normalizes line endings ONCE, up front, to LF, and counts
 *    the LF string. The clipboard adds a CR per line on the way out and the
 *    destination drops it again on the way in, leaving the displayed count
 *    intact. `lineEnding: 'CRLF'` stays available for a destination that counts
 *    a break as two, but LF is the default because it matches what was measured.
 * 2. **Counting unit.** `String.prototype.length` counts UTF-16 code units.
 *    For the entire AceCSE corpus that equals the code-point count, because
 *    every non-ASCII character authored so far is BMP (em dash, ×, ₱, −, →, ÷,
 *    ², °, ✓, ≈, curly quotes, é/ñ/á/ó/í/Ú) and therefore one unit each. UTF-8
 *    *bytes* differ (₱ is three) but bytes are not what a paste limit measures.
 *    `length` is the honest unit here, and it is what a clipboard write moves.
 * 3. **One string, not two.** Every count, boundary, and copy below is derived
 *    from `ExportDocument.text` and nothing else. Nothing is re-rendered,
 *    re-normalized, or re-escaped between counting and copying.
 *
 * The chunker never trims, pads, re-encodes, or reflows. `chunks.join('')`
 * reproduces `text` exactly — asserted by {@link exportDocumentIntegrityErrors}
 * and by the test suite.
 */

/**
 * Paste-safe chunk size, in UTF-16 code units of the LF-normalized string. THE
 * one place to change it.
 *
 * 8,000 sits at the low end of the 8,000–8,200 range that survives an inline
 * ChatGPT paste, deliberately not at the top of it: the ceiling is an observed
 * behavior, not a documented contract, so leaving headroom costs one extra
 * chunk on a large batch and buys margin against it shifting.
 *
 * Note what this limit counts: LF characters, the same unit the destination
 * reports. The raw `CF_UNICODETEXT` payload is larger by one CR per line (see
 * {@link characterCountCountingBreaksAsTwo}) — measured across the nine shipped
 * batches, the largest single chunk is 7,996 LF characters carrying 8,488 on the
 * clipboard. That is deliberate: the destination's own count is what decides
 * whether a paste stays inline, and that count is the LF one. If a paste ever
 * converts to an attachment anyway, the payload is the suspect and this constant
 * is the one knob to lower.
 */
export const EXPORT_CHUNK_CHARACTER_LIMIT = 8_000;

export type ExportLineEnding = 'CRLF' | 'LF';

/**
 * LF by default: the clipboard expands each break to CRLF and the destination
 * collapses it again, so the LF count is the count that survives the round trip.
 * Verified against Windows Notepad — see the module doc. Flip to 'CRLF' only for
 * a destination measured to count a line break as two characters.
 */
export const EXPORT_LINE_ENDING: ExportLineEnding = 'LF';

const LINE_ENDING_SEQUENCES: Record<ExportLineEnding, string> = {
  CRLF: '\r\n',
  LF: '\n',
};

const CARRIAGE_RETURN = 13;
const LINE_FEED = 10;
const HIGH_SURROGATE_START = 0xd800;
const HIGH_SURROGATE_END = 0xdbff;
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;

export function lineEndingSequence(lineEnding: ExportLineEnding): string {
  return LINE_ENDING_SEQUENCES[lineEnding];
}

/**
 * Rewrites every CRLF, lone CR, and lone LF to the target sequence.
 *
 * Idempotent, and it touches nothing but line endings — no trimming, no
 * whitespace collapsing, no Unicode normalization. Authored `**bold**` and
 * `*italic*` markers pass through untouched because they are never parsed.
 */
export function normalizeLineEndings(
  text: string,
  lineEnding: ExportLineEnding = EXPORT_LINE_ENDING,
): string {
  const asLf = text.replace(/\r\n|\r|\n/g, '\n');
  return lineEnding === 'LF' ? asLf : asLf.replaceAll('\n', '\r\n');
}

/** Line breaks in `text`, counted after normalization to a single convention. */
export function countLineBreaks(text: string): number {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === LINE_FEED) count += 1;
    else if (code === CARRIAGE_RETURN && text.charCodeAt(index + 1) !== LINE_FEED) count += 1;
  }
  return count;
}

/**
 * Where the chunk starting at `offset` must end.
 *
 * Prefers the last line break inside the window so boundaries fall between
 * lines and each chunk reads on its own. Falls back to a mid-line split only
 * when a single line fills the window, and even then refuses to cut a CRLF
 * pair or a surrogate pair in half — either would make two chunks that no
 * longer reassemble into the original characters.
 */
function nextChunkEnd(text: string, offset: number, limit: number): number {
  if (text.length - offset <= limit) return text.length;
  const hardEnd = offset + limit;

  const lastBreak = text.lastIndexOf('\n', hardEnd - 1);
  if (lastBreak >= offset) return lastBreak + 1;

  const previous = text.charCodeAt(hardEnd - 1);
  const next = text.charCodeAt(hardEnd);
  const splitsCrlf = previous === CARRIAGE_RETURN && next === LINE_FEED;
  const splitsSurrogatePair =
    previous >= HIGH_SURROGATE_START &&
    previous <= HIGH_SURROGATE_END &&
    next >= LOW_SURROGATE_START &&
    next <= LOW_SURROGATE_END;
  const backedOff = hardEnd - 1;
  return (splitsCrlf || splitsSurrogatePair) && backedOff > offset ? backedOff : hardEnd;
}

/**
 * Splits `text` into pieces of at most `limit` code units that concatenate
 * back to `text` exactly. An empty string yields no pieces.
 */
export function splitExportText(
  text: string,
  limit: number = EXPORT_CHUNK_CHARACTER_LIMIT,
): string[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Chunk character limit must be a positive integer, received ${String(limit)}.`);
  }
  const pieces: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const end = nextChunkEnd(text, offset, limit);
    pieces.push(text.slice(offset, end));
    offset = end;
  }
  return pieces;
}

export interface ExportChunk {
  /** One-based, for display: "Chunk 2 of 5". */
  readonly number: number;
  readonly total: number;
  /** The exact substring that gets copied. Never re-processed. */
  readonly text: string;
  /** `text.length` — UTF-16 code units, the same unit the clipboard moves. */
  readonly characterCount: number;
  readonly lineBreakCount: number;
  readonly startOffset: number;
  /** Exclusive. */
  readonly endOffset: number;
}

export interface ExportDocument {
  /**
   * The single source string. The displayed count, every chunk boundary, and
   * every clipboard write derive from this and nothing else.
   */
  readonly text: string;
  /** `text.length`. */
  readonly characterCount: number;
  readonly lineBreakCount: number;
  readonly lineEnding: ExportLineEnding;
  readonly chunkCharacterLimit: number;
  readonly chunks: readonly ExportChunk[];
}

export interface BuildExportDocumentOptions {
  lineEnding?: ExportLineEnding;
  chunkCharacterLimit?: number;
}

/**
 * Normalizes once, then counts and chunks that exact result.
 *
 * The returned `text` is the only string any caller should count, display, or
 * copy. Note what is deliberately absent: the document never embeds its own
 * character count, which would be self-referential and unstable.
 */
export function buildExportDocument(
  rawText: string,
  options: BuildExportDocumentOptions = {},
): ExportDocument {
  const lineEnding = options.lineEnding ?? EXPORT_LINE_ENDING;
  const chunkCharacterLimit = options.chunkCharacterLimit ?? EXPORT_CHUNK_CHARACTER_LIMIT;
  const text = normalizeLineEndings(rawText, lineEnding);
  return assembleExportDocument(
    text,
    splitExportText(text, chunkCharacterLimit),
    lineEnding,
    chunkCharacterLimit,
  );
}

/** Numbers the pieces and measures each one. Shared by both builders. */
function assembleExportDocument(
  text: string,
  pieces: readonly string[],
  lineEnding: ExportLineEnding,
  chunkCharacterLimit: number,
): ExportDocument {
  let startOffset = 0;
  const chunks = pieces.map((piece, index) => {
    const chunk: ExportChunk = {
      number: index + 1,
      total: pieces.length,
      text: piece,
      characterCount: piece.length,
      lineBreakCount: countLineBreaks(piece),
      startOffset,
      endOffset: startOffset + piece.length,
    };
    startOffset = chunk.endOffset;
    return chunk;
  });

  return {
    text,
    characterCount: text.length,
    lineBreakCount: countLineBreaks(text),
    lineEnding,
    chunkCharacterLimit,
    chunks,
  };
}

export interface BuildExportDocumentFromUnitsOptions extends BuildExportDocumentOptions {
  /** Placed between consecutive units, and counted as part of the earlier one. */
  unitSeparator?: string;
  /** Names a unit in the error thrown when it cannot fit a chunk on its own. */
  describeUnit?: (index: number) => string;
}

/**
 * Same counting and copying contract as {@link buildExportDocument}, but the
 * boundaries are chosen so that no unit is ever split across two chunks.
 *
 * Each unit becomes one indivisible segment (the unit plus the separator that
 * follows it, except for the last), and chunks are packed greedily: a segment
 * that would push the chunk past the limit starts the next chunk instead. The
 * segments still concatenate to `text` in order, so `chunks.join('')` reproduces
 * `text` exactly and every {@link exportDocumentIntegrityErrors} check holds.
 *
 * Fails closed rather than quietly truncating: a single unit longer than the
 * limit cannot be represented under this contract, so it throws.
 */
export function buildExportDocumentFromUnits(
  units: readonly string[],
  options: BuildExportDocumentFromUnitsOptions = {},
): ExportDocument {
  const lineEnding = options.lineEnding ?? EXPORT_LINE_ENDING;
  const chunkCharacterLimit = options.chunkCharacterLimit ?? EXPORT_CHUNK_CHARACTER_LIMIT;
  if (!Number.isInteger(chunkCharacterLimit) || chunkCharacterLimit < 1) {
    throw new RangeError(`Chunk character limit must be a positive integer, received ${String(chunkCharacterLimit)}.`);
  }
  const separator = normalizeLineEndings(options.unitSeparator ?? '\n\n', lineEnding);

  // An empty unit contributes nothing at all, separator included — otherwise it
  // would pad the document with a break that belongs to no question.
  const present = units
    .map((unit, index) => ({ index, text: normalizeLineEndings(unit, lineEnding) }))
    .filter((unit) => unit.text.length > 0);
  const segments = present.map((unit, position) => ({
    index: unit.index,
    text: position === present.length - 1 ? unit.text : unit.text + separator,
  }));

  const pieces: string[] = [];
  let current = '';
  for (const segment of segments) {
    if (segment.text.length > chunkCharacterLimit) {
      const name = options.describeUnit?.(segment.index) ?? `unit ${segment.index + 1}`;
      throw new RangeError(
        `Could not chunk this export: ${name} is ${segment.text.length} characters, over the ${chunkCharacterLimit}-character limit, and splitting it would break the question apart.`,
      );
    }
    if (current.length > 0 && current.length + segment.text.length > chunkCharacterLimit) {
      pieces.push(current);
      current = '';
    }
    current += segment.text;
  }
  if (current.length > 0) pieces.push(current);

  return assembleExportDocument(pieces.join(''), pieces, lineEnding, chunkCharacterLimit);
}

/**
 * What a counter that treats a line break as ONE character reports.
 *
 * This is the convention Windows Notepad and the ChatGPT paste target use, and
 * under the default LF line ending it is simply `characterCount` — the number
 * the UI shows and the number the clipboard round trip preserves.
 */
export function characterCountCountingBreaksAsOne(
  target: Pick<ExportDocument, 'characterCount' | 'lineBreakCount' | 'lineEnding'>,
): number {
  return target.lineEnding === 'CRLF'
    ? target.characterCount - target.lineBreakCount
    : target.characterCount;
}

/**
 * What a counter that treats a line break as TWO characters reports — which is
 * the size of the raw `CF_UNICODETEXT` payload the Windows clipboard carries,
 * since Chromium expands every LF to CRLF on the way out.
 *
 * Shown alongside {@link characterCountCountingBreaksAsOne} so the UI never
 * implies one figure is the whole story: the destination reports the first, the
 * clipboard actually moves the second.
 */
export function characterCountCountingBreaksAsTwo(
  target: Pick<ExportDocument, 'characterCount' | 'lineBreakCount' | 'lineEnding'>,
): number {
  return target.lineEnding === 'CRLF'
    ? target.characterCount
    : target.characterCount + target.lineBreakCount;
}

/**
 * Every way the document could fail its own contract. Empty means the chunks
 * reassemble into exactly the counted string.
 *
 * Cheap enough to run before any copy, so a corrupted chunk is reported rather
 * than silently handed to the clipboard.
 */
export function exportDocumentIntegrityErrors(document: ExportDocument): string[] {
  const errors: string[] = [];
  if (document.characterCount !== document.text.length) {
    errors.push(`characterCount ${document.characterCount} does not match text length ${document.text.length}.`);
  }
  const rejoined = document.chunks.map((chunk) => chunk.text).join('');
  if (rejoined !== document.text) {
    errors.push('Chunks do not reassemble into the exported text exactly.');
  }
  const summed = document.chunks.reduce((total, chunk) => total + chunk.characterCount, 0);
  if (summed !== document.characterCount) {
    errors.push(`Chunk characters total ${summed}, expected ${document.characterCount}.`);
  }
  let expectedOffset = 0;
  for (const chunk of document.chunks) {
    if (chunk.characterCount !== chunk.text.length) {
      errors.push(`Chunk ${chunk.number} characterCount does not match its own text length.`);
    }
    if (chunk.characterCount > document.chunkCharacterLimit) {
      errors.push(`Chunk ${chunk.number} is ${chunk.characterCount} characters, over the ${document.chunkCharacterLimit} limit.`);
    }
    if (chunk.characterCount === 0) {
      errors.push(`Chunk ${chunk.number} is empty.`);
    }
    if (chunk.startOffset !== expectedOffset) {
      errors.push(`Chunk ${chunk.number} starts at ${chunk.startOffset}, expected ${expectedOffset}.`);
    }
    expectedOffset = chunk.endOffset;
  }
  if (document.text.length > 0 && expectedOffset !== document.characterCount) {
    errors.push(`Chunks end at ${expectedOffset}, expected ${document.characterCount}.`);
  }
  return errors;
}
