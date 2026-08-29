import { AlertTriangle, Check, Copy, Eye, EyeOff } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { exportDocumentIntegrityErrors, type ExportDocument } from '@/lib/exportText';

/**
 * One selectable representation of the same underlying content.
 *
 * `build` is called by the panel rather than the caller so that the string used
 * for counting, chunking, display, and every clipboard write is one string
 * produced once — the property the whole export surface rests on.
 */
export interface ExportSource {
  /** Stable key for the format toggle. */
  kind: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  /** Throws to fail closed: a partial export must never be offered. */
  build: () => ExportDocument;
}

export interface ExportDocumentPanelProps {
  headingId: string;
  heading?: string;
  /**
   * The available representations. Pass a stable (memoized) array — the panel
   * rebuilds whenever this identity changes, which is correct but wasteful.
   */
  sources: readonly ExportSource[];
  /** Optional scope/provenance notice rendered above the figures. */
  notice?: ReactNode;
  /**
   * Whole-document totals (characters, chunk count, line breaks). Off where the
   * per-chunk figures already carry every number a reviewer acts on.
   */
  showFigures?: boolean;
}

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
 * Character-exact review and export surface, for any content that can be
 * projected into an {@link ExportDocument}.
 *
 * The chunk sizes shown here are measured from the same `ExportDocument.text`
 * that the Copy buttons write, so the displayed count and the copied count are
 * the same string measured once. Copying is refused outright if the document
 * fails its own integrity check, rather than handing over a chunk that would
 * not reassemble.
 *
 * This is the ONLY implementation of counting, chunk display, Copy Chunk, and
 * the integrity gate. Batch review and the structures workspace both drive it
 * with their own `sources`; neither reimplements any of it.
 */
export function ExportDocumentPanel({
  headingId,
  heading = 'Review & Export',
  sources,
  notice,
  showFigures = true,
}: ExportDocumentPanelProps) {
  const [kind, setKind] = useState<string>(() => sources[0]?.kind ?? '');
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(() => new Set());
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const active = sources.find((source) => source.kind === kind) ?? sources[0];

  const built = useMemo(() => {
    if (!active) return { document: null, error: 'No export format is available.' as string | null };
    try {
      return { document: active.build(), error: null as string | null };
    } catch (error) {
      // Fail closed: an unresolved reference must never yield a partial export.
      return {
        document: null,
        error: error instanceof Error ? error.message : 'Could not build this export.',
      };
    }
  }, [active]);

  const integrityErrors = useMemo(
    () => (built.document ? exportDocumentIntegrityErrors(built.document) : []),
    [built.document],
  );

  function switchKind(next: string) {
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
  const kindLabel = active?.label ?? 'export';

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={headingId} className="text-base font-extrabold text-slate-900 dark:text-white">{heading}</h2>
        <div role="group" aria-label="Export format" className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
          {sources.map(({ kind: candidate, label, icon: Icon }) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={active?.kind === candidate}
              onClick={() => switchKind(candidate)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                active?.kind === candidate
                  ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>

      {notice}

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
          {showFigures && (
            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 dark:border-slate-700 dark:bg-slate-950">
              <Figure label="Total characters" value={formatCount(document.characterCount)} />
              <Figure label="Chunks" value={formatCount(document.chunks.length)} hint={`${formatCount(document.chunkCharacterLimit)} max each`} />
              <Figure label="Line breaks" value={formatCount(document.lineBreakCount)} />
            </dl>
          )}

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

export default ExportDocumentPanel;
