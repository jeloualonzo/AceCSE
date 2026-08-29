import { describe, expect, it } from 'vitest';
import {
  buildExportDocument,
  buildExportDocumentFromUnits,
  characterCountCountingBreaksAsOne,
  characterCountCountingBreaksAsTwo,
  countLineBreaks,
  EXPORT_CHUNK_CHARACTER_LIMIT,
  EXPORT_LINE_ENDING,
  exportDocumentIntegrityErrors,
  lineEndingSequence,
  normalizeLineEndings,
  splitExportText,
} from './exportText';

/**
 * The characters that actually appear in the AceCSE corpus, plus the ones a
 * future batch could plausibly introduce. Every one is a single UTF-16 code
 * unit, which is why `.length` is the honest counting unit.
 */
const CORPUS_CHARACTERS = [
  ['ASCII', 'The quick brown fox jumps over the lazy dog. 0123456789'],
  ['accented letters', 'Ang mga salitáng Ñoño, José, Ilocáno, at Bulacán ay tamà.'],
  ['peso sign', 'Ang halaga ay ₱1,250.75 at ₱980.00 kada buwan.'],
  ['curly quotes', 'She said “file it under B,” then ‘left’ quietly.'],
  ['em and en dashes', 'Rule — always alphabetize surnames – then given names.'],
  ['math symbols', '12 × 4 = 48, 96 ÷ 8 = 12, −5 < 0, 3² = 9, ≈ 0.5, ≠ 1, π'],
  ['arrows and marks', 'Step 1 → Step 2 → Step 3 ✓ at 30°'],
  ['authored rich text', 'Notice **bold** and *italic* markers stay literal.'],
] as const;

const ASTRAL = '🇵🇭'; // 🇵🇭 — two surrogate pairs, four code units.

function repeatToLength(unit: string, target: number): string {
  return unit.repeat(Math.ceil(target / unit.length)).slice(0, target);
}

/**
 * A review document shaped and sized like a real one: the measured corpus runs
 * about 2,700–3,100 characters per question across metadata, choices, learner
 * view, and authoring view, so each section here lands in that range.
 */
function syntheticReviewMarkdown(questionCount: number): string {
  const sections = Array.from({ length: questionCount }, (_, index) => {
    const id = `cler-${String(index + 1).padStart(4, '0')}`;
    return [
      `## ${index + 1}. ${id}`,
      '',
      '### Metadata',
      '',
      '| Field | Value |',
      '|---|---|',
      `| ID | ${id} |`,
      '| Subject | Clerical Ability |',
      '| Exam level | Both |',
      '| Topic / family | Filing & Alphabetizing |',
      '| Subtopic | Alphabetic Indexing Rules |',
      '| Difficulty | Medium |',
      '| Correct option | B |',
      '| Task format | shared_filing_task |',
      '| Pool | clerical-filing |',
      '| Tags | filing, alphabetizing, indexing |',
      '| Reference | CSC Alphabetic Filing Standards, Rule 3 |',
      '| Explanation source | structured |',
      '',
      '### Question',
      '',
      `Which of the following names should be filed first? Ang halaga ng transaksiyón ay ₱${index + 1},250.75 — tandaan itó habang inaayos ang mga pangalan sa tamang pagkakasunod-sunod.`,
      '',
      '### Choices',
      '',
      '- **A.** Santos, Maria Cristina',
      '- **B.** Santos, María Cristína',
      '- **C.** Santos-Reyes, Maria',
      '- **D.** Santos Reyes, Maria',
      '',
      '### Correct Answer',
      '',
      '**B.** Santos, María Cristína',
      '',
      '### Learner View',
      '',
      '**Correct Answer:** B — Santos, María Cristína',
      '',
      '**What to Notice**',
      '',
      'Alphabetic filing compares names unit by unit — *surname first*, then given name, then middle name. Diacritical marks are **disregarded entirely**: “María” files exactly as “Maria”, so the accent never breaks a tie. What decides this item is the punctuation in the surname unit, not the accent.',
      '',
      '**Rule**',
      '',
      'A hyphenated surname is treated as **one indexing unit** with the hyphen ignored, so “Santos-Reyes” indexes as “SantosReyes”. A surname written as two separate words is treated as **two units**, so “Santos Reyes” indexes as “Santos” then “Reyes”. Because nothing files before a shorter identical unit, “Santos” alone precedes both.',
      '',
      '**Common Trap**',
      '',
      'Examinees often assume the accented form files later because it “looks different”, or that the hyphen sorts before a space. Neither is true — *nothing before something* governs, and the accent is invisible to the comparison.',
      '',
      '**Apply the Rule**',
      '',
      '```text',
      'A. Santos, Maria Cristina    → SANTOS | MARIA | CRISTINA',
      'B. Santos, María Cristína    → SANTOS | MARIA | CRISTINA',
      'C. Santos-Reyes, Maria       → SANTOSREYES | MARIA',
      'D. Santos Reyes, Maria       → SANTOS | REYES | MARIA',
      '```',
      '',
      '**Answer:** A and B index identically; B is the authored key for this item.',
      '',
      '### Authoring View',
      '',
      '- type: correct_answer',
      '  text: B — Santos, María Cristína',
      '- type: paragraph',
      '  label: What to Notice',
      '  text: |',
      '    Alphabetic filing compares names unit by unit — *surname first*, then',
      '    given name, then middle name. Diacritical marks are **disregarded**.',
      '- type: rule',
      '  text: |',
      '    A hyphenated surname is treated as one indexing unit with the hyphen',
      '    ignored. A surname written as two words is treated as two units.',
      '- type: common_trap',
      '  text: |',
      '    Examinees assume the accented form files later, or that a hyphen sorts',
      '    before a space. Neither is true.',
      '- type: solution',
      '  expression: |',
      '    SANTOS | MARIA | CRISTINA  ×  SANTOSREYES | MARIA',
      '- type: answer',
      '  variant: final',
      '  text: A and B index identically; B is the authored key.',
    ].join('\n');
  });
  return `# Filing & Alphabetizing — Batch 9\n\n- Batch ID: filing-batch-09\n- Family: Filing & Alphabetizing\n- Status: Ready for QA\n- Question count: ${questionCount}\n\n${sections.join('\n\n---\n\n')}\n`;
}

describe('export line-ending normalization', () => {
  it('defaults to LF, the convention the destination counts a break as', () => {
    // Chromium rewrites LF to CRLF when it writes CF_UNICODETEXT, but the
    // destination collapses each break back to one character. Measured against
    // Windows Notepad: a CRLF chunk displaying 8,000 pasted as 7,678 — exactly
    // 8,000 minus its 322 breaks. Counting LF is what survives the round trip.
    expect(EXPORT_LINE_ENDING).toBe('LF');
    expect(lineEndingSequence('LF')).toBe('\n');
    expect(lineEndingSequence('CRLF')).toBe('\r\n');
  });

  it('converts every newline convention to the target and is idempotent', () => {
    const mixed = 'alpha\nbravo\r\ncharlie\rdelta';
    expect(normalizeLineEndings(mixed, 'CRLF')).toBe('alpha\r\nbravo\r\ncharlie\r\ndelta');
    expect(normalizeLineEndings(mixed, 'LF')).toBe('alpha\nbravo\ncharlie\ndelta');
    const once = normalizeLineEndings(mixed, 'CRLF');
    expect(normalizeLineEndings(once, 'CRLF')).toBe(once);
    expect(normalizeLineEndings(normalizeLineEndings(once, 'LF'), 'CRLF')).toBe(once);
  });

  it('changes nothing except line endings', () => {
    for (const [, sample] of CORPUS_CHARACTERS) {
      expect(normalizeLineEndings(sample, 'CRLF')).toBe(sample);
      expect(normalizeLineEndings(sample, 'LF')).toBe(sample);
    }
    // No trimming, no whitespace collapsing, no Unicode normalization.
    const padded = '  leading and trailing   \n\n\n  spaces kept  ';
    expect(normalizeLineEndings(padded, 'LF')).toBe(padded);
    expect(normalizeLineEndings(ASTRAL, 'CRLF')).toBe(ASTRAL);
  });

  it('counts line breaks under either convention', () => {
    expect(countLineBreaks('a\r\nb\r\nc')).toBe(2);
    expect(countLineBreaks('a\nb\nc')).toBe(2);
    expect(countLineBreaks('a\rb')).toBe(1);
    expect(countLineBreaks('no breaks')).toBe(0);
    expect(countLineBreaks('trailing\r\n')).toBe(1);
  });
});

describe('export character counting', () => {
  it('counts UTF-16 code units, which equals code points for every corpus character', () => {
    for (const [label, sample] of CORPUS_CHARACTERS) {
      const codePoints = [...sample].length;
      expect(sample.length, `${label} must be free of astral characters`).toBe(codePoints);
      const document = buildExportDocument(sample);
      expect(document.characterCount).toBe(sample.length);
      expect(document.characterCount).toBe(document.text.length);
    }
  });

  it('reports the exact length of the string that gets copied, not the byte length', () => {
    const peso = 'Ang halaga ay ₱1,250.75';
    const document = buildExportDocument(peso);
    expect(document.characterCount).toBe(peso.length);
    // ₱ is three UTF-8 bytes; bytes are not what a paste limit measures.
    expect(new TextEncoder().encode(peso).length).toBeGreaterThan(document.characterCount);
  });

  it('counts one character per line break under the default LF ending', () => {
    const document = buildExportDocument('alpha\r\nbravo\rcharlie');
    expect(document.text).toBe('alpha\nbravo\ncharlie');
    expect(document.lineEnding).toBe('LF');
    expect(document.characterCount).toBe(19);
    expect(document.lineBreakCount).toBe(2);
    // What the destination reports is the count itself — no adjustment needed.
    expect(characterCountCountingBreaksAsOne(document)).toBe(19);
    // What the Windows clipboard actually carries, one CR added per line.
    expect(characterCountCountingBreaksAsTwo(document)).toBe(21);
    expect(normalizeLineEndings(document.text, 'CRLF')).toHaveLength(21);
  });

  it('includes both code units of every CRLF when CRLF is asked for explicitly', () => {
    const document = buildExportDocument('alpha\nbravo\ncharlie', { lineEnding: 'CRLF' });
    expect(document.text).toBe('alpha\r\nbravo\r\ncharlie');
    expect(document.characterCount).toBe(21);
    expect(document.lineBreakCount).toBe(2);
    // The figure a tool that counts a break as one character would show.
    expect(characterCountCountingBreaksAsOne(document)).toBe(19);
    expect(characterCountCountingBreaksAsTwo(document)).toBe(21);
  });

  it('acknowledges astral characters cost two code units each', () => {
    const document = buildExportDocument(`Flag ${ASTRAL}`);
    expect(document.characterCount).toBe(5 + 4);
    expect([...document.text].length).toBe(5 + 2);
  });
});

describe('export chunking', () => {
  it('defaults to a single configurable limit at the safe end of the range', () => {
    expect(EXPORT_CHUNK_CHARACTER_LIMIT).toBe(8_000);
    expect(EXPORT_CHUNK_CHARACTER_LIMIT).toBeGreaterThanOrEqual(8_000);
    expect(EXPORT_CHUNK_CHARACTER_LIMIT).toBeLessThanOrEqual(8_200);
  });

  it('reassembles into exactly the original string for every corpus sample', () => {
    for (const [label, sample] of CORPUS_CHARACTERS) {
      const body = repeatToLength(`${sample}\n`, 30_000);
      for (const limit of [7, 64, 997, 8_000]) {
        const document = buildExportDocument(body, { chunkCharacterLimit: limit });
        expect(exportDocumentIntegrityErrors(document), `${label} @ ${limit}`).toEqual([]);
        expect(document.chunks.map((chunk) => chunk.text).join('')).toBe(document.text);
        expect(document.chunks.reduce((total, chunk) => total + chunk.characterCount, 0)).toBe(document.characterCount);
        expect(document.chunks.every((chunk) => chunk.characterCount <= limit)).toBe(true);
      }
    }
  });

  it('holds the invariants exactly at, below, and above a boundary', () => {
    const limit = 100;
    for (const length of [1, limit - 1, limit, limit + 1, limit * 2, limit * 2 + 1]) {
      const body = repeatToLength('abcdefghij', length);
      const document = buildExportDocument(body, { chunkCharacterLimit: limit, lineEnding: 'LF' });
      expect(exportDocumentIntegrityErrors(document), `length ${length}`).toEqual([]);
      expect(document.characterCount).toBe(length);
      expect(document.chunks).toHaveLength(Math.ceil(length / limit));
    }
  });

  it('prefers line boundaries so each chunk reads on its own', () => {
    const document = buildExportDocument('aaaa\nbbbb\ncccc\ndddd\n', { chunkCharacterLimit: 12, lineEnding: 'LF' });
    expect(document.chunks.map((chunk) => chunk.text)).toEqual(['aaaa\nbbbb\n', 'cccc\ndddd\n']);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
  });

  it('never splits a CRLF pair or a surrogate pair in half', () => {
    // A single line longer than the limit forces the mid-line fallback.
    const crlf = buildExportDocument('abcdefgh\nijklmnop', { chunkCharacterLimit: 9, lineEnding: 'CRLF' });
    expect(exportDocumentIntegrityErrors(crlf)).toEqual([]);
    for (const chunk of crlf.chunks) {
      expect(chunk.text.endsWith('\r')).toBe(false);
      expect(chunk.text.startsWith('\n')).toBe(false);
    }

    const astral = buildExportDocument(ASTRAL.repeat(50), { chunkCharacterLimit: 7, lineEnding: 'LF' });
    expect(exportDocumentIntegrityErrors(astral)).toEqual([]);
    expect(astral.chunks.map((chunk) => chunk.text).join('')).toBe(ASTRAL.repeat(50));
    for (const chunk of astral.chunks) {
      // A lone surrogate half round-trips to U+FFFD; if none exists, no pair was cut.
      expect(chunk.text).not.toMatch(/[\uD800-\uDBFF]$/);
      expect(chunk.text).not.toMatch(/^[\uDC00-\uDFFF]/);
    }
  });

  it('hard-splits a line that cannot fit rather than exceeding the limit', () => {
    const document = buildExportDocument('x'.repeat(25), { chunkCharacterLimit: 10, lineEnding: 'LF' });
    expect(document.chunks.map((chunk) => chunk.characterCount)).toEqual([10, 10, 5]);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
  });

  it('numbers chunks for display and tracks contiguous offsets', () => {
    const document = buildExportDocument('aa\nbb\ncc\ndd\n', { chunkCharacterLimit: 6, lineEnding: 'LF' });
    expect(document.chunks.map((chunk) => [chunk.number, chunk.total])).toEqual([[1, 2], [2, 2]]);
    expect(document.chunks.map((chunk) => [chunk.startOffset, chunk.endOffset])).toEqual([[0, 6], [6, 12]]);
    expect(document.text.slice(document.chunks[1].startOffset, document.chunks[1].endOffset)).toBe(document.chunks[1].text);
  });

  it('treats an empty document as zero chunks rather than one empty chunk', () => {
    const document = buildExportDocument('');
    expect(document.characterCount).toBe(0);
    expect(document.chunks).toEqual([]);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
  });

  it('rejects a nonsensical limit instead of producing an unusable split', () => {
    expect(() => splitExportText('abc', 0)).toThrow(RangeError);
    expect(() => splitExportText('abc', -5)).toThrow(RangeError);
    expect(() => splitExportText('abc', 1.5)).toThrow(RangeError);
    expect(splitExportText('abc', 1)).toEqual(['a', 'b', 'c']);
  });

  it('splits a batch the size of the largest real one into inspectable chunks', () => {
    // filing-batch-02 measures ~44,700 characters as LF today; enriched metadata
    // pushes it higher, so this covers the shape at scale.
    const document = buildExportDocument(syntheticReviewMarkdown(14));
    expect(document.characterCount).toBeGreaterThan(30_000);
    expect(document.chunks.length).toBeGreaterThan(4);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
    expect(document.chunks.map((chunk) => chunk.text).join('')).toBe(document.text);
    // Authored formatting survives verbatim.
    expect(document.text).toContain('**disregarded entirely**');
    expect(document.text).toContain('*surname first*');
    expect(document.text).toContain('₱');
    expect(document.text).toContain('—');
    expect(document.text).toContain('“María”');
    // Pure LF: not one CR anywhere, so the counted string is the LF string.
    expect(document.text).toContain('\n');
    expect(document.text).not.toContain('\r');
    expect(document.text).toBe(normalizeLineEndings(document.text, 'LF'));
  });

  it('reports, for every chunk, the length of the exact LF string it hands over', () => {
    const document = buildExportDocument(syntheticReviewMarkdown(14));
    expect(document.lineEnding).toBe('LF');

    for (const chunk of document.chunks) {
      // The displayed number is this substring's own length — nothing derived.
      expect(chunk.characterCount).toBe(chunk.text.length);
      expect(chunk.characterCount).toBe([...chunk.text].length);
      expect(chunk.characterCount).toBeLessThanOrEqual(document.chunkCharacterLimit);
      expect(chunk.text).not.toContain('\r');
      expect(chunk.text).toBe(normalizeLineEndings(chunk.text, 'LF'));
      expect(chunk.lineBreakCount).toBe(countLineBreaks(chunk.text));
      // Under LF the destination's count and the displayed count are the same.
      expect(characterCountCountingBreaksAsOne({ ...chunk, lineEnding: document.lineEnding }))
        .toBe(chunk.characterCount);
      expect(document.text.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
    }

    // Reassembly is exact, not merely equal in length.
    const reassembled = document.chunks.map((chunk) => chunk.text).join('');
    expect(reassembled).toBe(document.text);
    expect(reassembled).toHaveLength(document.characterCount);
    expect(document.chunks.reduce((total, chunk) => total + chunk.characterCount, 0)).toBe(document.characterCount);
    expect(document.chunks.reduce((total, chunk) => total + chunk.lineBreakCount, 0)).toBe(document.lineBreakCount);
  });

  it('keeps chunk counts truthful after the clipboard round trip a paste performs', () => {
    // Simulates the full path: LF string → Chromium writes CRLF → destination
    // collapses each break back to one character. What comes out the far end
    // must be the number the UI displayed.
    const document = buildExportDocument(syntheticReviewMarkdown(6));
    for (const chunk of document.chunks) {
      const onClipboard = normalizeLineEndings(chunk.text, 'CRLF');
      expect(onClipboard.length).toBe(chunk.characterCount + chunk.lineBreakCount);
      const asPasted = normalizeLineEndings(onClipboard, 'LF');
      expect(asPasted).toBe(chunk.text);
      expect(asPasted).toHaveLength(chunk.characterCount);
    }
    expect(characterCountCountingBreaksAsTwo(document)).toBe(normalizeLineEndings(document.text, 'CRLF').length);
  });

  it('keeps every chunk inside the limit across many document sizes', () => {
    for (let questionCount = 1; questionCount <= 20; questionCount += 1) {
      const document = buildExportDocument(syntheticReviewMarkdown(questionCount));
      expect(exportDocumentIntegrityErrors(document), `questionCount ${questionCount}`).toEqual([]);
      expect(document.chunks.every((chunk) => chunk.characterCount <= EXPORT_CHUNK_CHARACTER_LIMIT)).toBe(true);
    }
  });
});

describe('unit-aware export chunking', () => {
  /** Three questions, each shaped like a Question Set entry. */
  const UNITS = [
    'What is 4.25 × 3.6?\n\nA. 15.3\nB. 14.7\nC. 15.9\nD. 16.2\nE. 15.0\n\nCorrect Answer: A. 15.3',
    'Which name files first?\n\nA. Santos\nB. Santos-Reyes\nC. Santos Reyes\nD. Santoso\nE. Santo\n\nCorrect Answer: E. Santo',
    'Ang halaga ay ₱1,250 — ilan ang kada buwan?\n\nA. ₱100\nB. ₱250\nC. ₱500\nD. ₱750\nE. ₱1,000\n\nCorrect Answer: B. ₱250',
  ];

  it('joins units with one blank line and keeps the same document contract', () => {
    const document = buildExportDocumentFromUnits(UNITS);
    expect(document.text).toBe(UNITS.join('\n\n'));
    expect(document.characterCount).toBe(document.text.length);
    expect(document.chunkCharacterLimit).toBe(EXPORT_CHUNK_CHARACTER_LIMIT);
    expect(document.lineEnding).toBe('LF');
    expect(document.chunks).toHaveLength(1);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
    // No trailing separator, and nothing added after the last unit.
    expect(document.text.endsWith('Correct Answer: B. ₱250')).toBe(true);
  });

  it('starts a new chunk rather than splitting a unit, at every limit down to the largest unit', () => {
    const largest = Math.max(...UNITS.map((unit) => unit.length + 2));
    for (let limit = largest; limit <= 400; limit += 1) {
      const document = buildExportDocumentFromUnits(UNITS, { chunkCharacterLimit: limit });
      expect(exportDocumentIntegrityErrors(document), `limit ${limit}`).toEqual([]);
      expect(document.text, `limit ${limit}`).toBe(UNITS.join('\n\n'));
      expect(document.chunks.map((chunk) => chunk.text).join('')).toBe(document.text);
      // Every unit sits whole inside exactly one chunk.
      for (const unit of UNITS) {
        expect(document.chunks.filter((chunk) => chunk.text.includes(unit)), `limit ${limit}`).toHaveLength(1);
      }
    }
  });

  it('packs greedily: as many whole units per chunk as the limit allows', () => {
    const segments = UNITS.map((unit, index) => (index === UNITS.length - 1 ? unit : `${unit}\n\n`));
    const twoFit = segments[0].length + segments[1].length;

    const perChunk = buildExportDocumentFromUnits(UNITS, { chunkCharacterLimit: twoFit - 1 });
    expect(perChunk.chunks).toHaveLength(3);

    const paired = buildExportDocumentFromUnits(UNITS, { chunkCharacterLimit: twoFit });
    expect(paired.chunks).toHaveLength(2);
    expect(paired.chunks[0].text).toBe(segments[0] + segments[1]);
    expect(paired.chunks[1].text).toBe(segments[2]);
    expect(exportDocumentIntegrityErrors(paired)).toEqual([]);
  });

  it('refuses to emit a document at all when one unit cannot fit a chunk', () => {
    expect(() => buildExportDocumentFromUnits(UNITS, { chunkCharacterLimit: 40 }))
      .toThrow(RangeError);
    expect(() => buildExportDocumentFromUnits(UNITS, {
      chunkCharacterLimit: 40,
      describeUnit: (index) => `question q-${index + 1}`,
    })).toThrow('question q-1 is 87 characters, over the 40-character limit');
    expect(() => buildExportDocumentFromUnits(UNITS, { chunkCharacterLimit: 0 })).toThrow(RangeError);
  });

  it('normalizes line endings once, per unit, exactly as the text builder does', () => {
    const document = buildExportDocumentFromUnits(['alpha\r\nbravo', 'charlie\rdelta']);
    expect(document.text).toBe('alpha\nbravo\n\ncharlie\ndelta');
    expect(document.text).not.toContain('\r');
    expect(document.lineBreakCount).toBe(countLineBreaks(document.text));

    const crlf = buildExportDocumentFromUnits(['alpha\nbravo', 'charlie'], { lineEnding: 'CRLF' });
    expect(crlf.text).toBe('alpha\r\nbravo\r\n\r\ncharlie');
    expect(exportDocumentIntegrityErrors(crlf)).toEqual([]);
  });

  it('accepts a custom separator and skips empty units without emitting empty chunks', () => {
    const document = buildExportDocumentFromUnits(['one', 'two'], { unitSeparator: '\n---\n' });
    expect(document.text).toBe('one\n---\ntwo');

    const sparse = buildExportDocumentFromUnits(['', 'only', '']);
    expect(sparse.text).toBe('only');
    expect(sparse.chunks).toHaveLength(1);
    expect(exportDocumentIntegrityErrors(sparse)).toEqual([]);

    const empty = buildExportDocumentFromUnits([]);
    expect(empty.characterCount).toBe(0);
    expect(empty.chunks).toEqual([]);
    expect(exportDocumentIntegrityErrors(empty)).toEqual([]);
  });

  it('keeps a real-sized set of questions inside the default limit, every unit whole', () => {
    // Each stem carries its own index, so "this unit appears in exactly one
    // chunk" is a real assertion rather than a coincidence of repeated text.
    const many = Array.from({ length: 120 }, (_, index) =>
      UNITS[index % UNITS.length].replace('?', ` (item ${index})?`));
    expect(new Set(many).size).toBe(many.length);
    const document = buildExportDocumentFromUnits(many);
    expect(document.characterCount).toBeGreaterThan(10_000);
    expect(document.chunks.length).toBeGreaterThan(1);
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);
    expect(document.chunks.every((chunk) => chunk.characterCount <= EXPORT_CHUNK_CHARACTER_LIMIT)).toBe(true);
    for (const unit of many) {
      expect(document.chunks.filter((chunk) => chunk.text.includes(unit))).toHaveLength(1);
    }
  });
});

describe('export document integrity checks', () => {
  it('detects a tampered chunk instead of trusting it', () => {
    const document = buildExportDocument('alpha\nbravo\ncharlie\n', { chunkCharacterLimit: 8 });
    expect(exportDocumentIntegrityErrors(document)).toEqual([]);

    const tampered = {
      ...document,
      chunks: document.chunks.map((chunk, index) =>
        index === 0 ? { ...chunk, text: chunk.text.trimEnd() } : chunk),
    };
    const errors = exportDocumentIntegrityErrors(tampered);
    expect(errors.some((error) => error.includes('reassemble'))).toBe(true);
  });

  it('detects a miscounted document', () => {
    const document = buildExportDocument('alpha');
    const errors = exportDocumentIntegrityErrors({ ...document, characterCount: 4 });
    expect(errors.some((error) => error.includes('does not match text length'))).toBe(true);
  });

  it('detects an oversized chunk', () => {
    const document = buildExportDocument('alpha bravo charlie', { chunkCharacterLimit: 20 });
    const errors = exportDocumentIntegrityErrors({ ...document, chunkCharacterLimit: 5 });
    expect(errors.some((error) => error.includes('over the 5 limit'))).toBe(true);
  });
});
