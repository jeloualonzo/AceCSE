import { AlertTriangle, Check, Copy, Eye, EyeOff, FileJson, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  createRawJsonExport,
  createReviewExport,
} from '@/data/contentBankWorkspace';
import type { RefinementBatch } from '@/data/refinementBatches';
import {
  characterCountCountingBreaksAsTwo,
  exportDocumentIntegrityErrors,
  type ExportDocument,
} from '@/lib/exportText';
import type { Question } from '@/types';

type ExportKind = 'markdown' | 'json';

const EXPORT_KINDS: ReadonlyArray<{ kind: ExportKind; label: string; icon: typeof FileText }> = [
  { kind: 'markdown', label: 'Review Markdown', icon: FileText },
  { kind: 'json', label: 'Raw JSON', icon: FileJson },
];

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Copies exactly the string it is given.
 *
 * The count reported back is measured from that same string, so the number the
 * user sees is by construction the number of characters written.
 */
async function copyExactText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard access is unavailable in this browser. Use Show and select the text manually.');
  }
  await navigator.clipboard.writeText(text);
}

function StatusMessage({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  if (tone === 'error') {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
    );
  }
  return (
    <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value}</dd>
      {hint && <dd className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</dd>}
    </div>
  );
}

function ChunkRow({
  chunk,
  revealed,
  onToggle,
  onCopy,
}: {
  chunk: ExportDocument['chunks'][number];
  revealed: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const previewId = `export-chunk-${chunk.number}`;
  return (
    <li className="border-b border-slate-100 px-3 py-3 last:border-b-0 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Chunk {chunk.number} of {chunk.total}
        </span>
        <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCount(chunk.characterCount)} characters</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatCount(chunk.lineBreakCount)} line breaks</span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />Copy Chunk
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={revealed}
            aria-controls={previewId}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            {revealed ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {revealed && (
        <pre
          id={previewId}
          className="mt-3 max-h-96 overflow-auto whitespace-pre rounded-lg border-l-2 border-emerald-500 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-5 text-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >{chunk.text}</pre>
      )}
    </li>
  );
}

/**
 * Character-exact review and export surface.
 *
 * The chunk sizes shown here are measured from the same `ExportDocument.text`
 * that the Copy buttons write, so the displayed count and the copied count are
 * the same string measured once. Copying is refused outright if the document
 * fails its own integrity check, rather than handing over a chunk that would
 * not reassemble.
 */
export function ReviewExportPanel({
  batch,
  questions,
}: {
  batch: RefinementBatch;
  questions: readonly Question[];
}) {
  const [kind, setKind] = useState<ExportKind>('markdown');
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(() => new Set());
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const built = useMemo(() => {
    try {
      const document = kind === 'markdown'
        ? createReviewExport(batch, questions)
        : createRawJsonExport(batch, questions);
      return { document, error: null as string | null };
    } catch (error) {
      // Fail closed: an unresolved question ID must never yield a partial export.
      return {
        document: null,
        error: error instanceof Error ? error.message : 'Could not build this export.',
      };
    }
  }, [batch, questions, kind]);

  const integrityErrors = useMemo(
    () => (built.document ? exportDocumentIntegrityErrors(built.document) : []),
    [built.document],
  );

  function switchKind(next: ExportKind) {
    setKind(next);
    setRevealed(new Set());
    setStatus(null);
  }

  function toggleChunk(number: number) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  async function copy(text: string, label: string) {
    if (integrityErrors.length > 0) {
      setStatus({ tone: 'error', message: 'Integrity check failed — nothing was copied. See the errors above.' });
      return;
    }
    try {
      await copyExactText(text);
      setStatus({ tone: 'success', message: `${label} copied — ${formatCount(text.length)} characters.` });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Copy failed and nothing was written to the clipboard.',
      });
    }
  }

  const document = built.document;
  const kindLabel = kind === 'markdown' ? 'Review Markdown' : 'Raw JSON';

  return (
    <section aria-labelledby="review-export-heading" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="review-export-heading" className="text-base font-extrabold text-slate-900 dark:text-white">Review &amp; Export</h2>
        <div role="group" aria-label="Export format" className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
          {EXPORT_KINDS.map(({ kind: candidate, label, icon: Icon }) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={kind === candidate}
              onClick={() => switchKind(candidate)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                kind === candidate
                  ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>

      {built.error && <StatusMessage tone="error" message={built.error} />}

      {integrityErrors.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-bold">This export failed its integrity check. Copying is disabled.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {integrityErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {document && (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-950">
            <Figure label="Total characters" value={formatCount(document.characterCount)} />
            <Figure label="Chunks" value={formatCount(document.chunks.length)} hint={`${formatCount(document.chunkCharacterLimit)} max each`} />
            <Figure label="Line breaks" value={formatCount(document.lineBreakCount)} hint={document.lineEnding === 'CRLF' ? 'CRLF, 2 characters each' : 'LF, 1 character each'} />
            <Figure
              label="On the clipboard"
              value={formatCount(characterCountCountingBreaksAsTwo(document))}
              hint="Windows adds a CR per line"
            />
          </dl>

          <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Counted as {document.lineEnding}, one character per line break — the convention Notepad and the paste target
            report. Windows expands each break to CRLF on the clipboard and the destination collapses it again, so the
            total above is what you will see after pasting. Copy with the buttons below; hand-selecting from a preview
            copies the browser&apos;s own rendering, which may not match these counts.
          </p>

          {status && <StatusMessage tone={status.tone} message={status.message} />}

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <ul>
              {document.chunks.map((chunk) => (
                <ChunkRow
                  key={chunk.number}
                  chunk={chunk}
                  revealed={revealed.has(chunk.number)}
                  onToggle={() => toggleChunk(chunk.number)}
                  onCopy={() => void copy(chunk.text, `Chunk ${chunk.number} of ${chunk.total}`)}
                />
              ))}
            </ul>
            {document.chunks.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">This export is empty.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy(document.text, `Whole ${kindLabel}`)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />Copy whole {kindLabel} ({formatCount(document.characterCount)})
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default ReviewExportPanel;
