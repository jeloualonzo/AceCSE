import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Braces, Eye, EyeOff, FileText, Loader2 } from 'lucide-react';
import { subjectFromSlug } from '@/data/contentBankWorkspace';
import {
  buildSubjectStructures,
  createStructureReviewExport,
  createStructureSourceJsonExport,
  orderStructureSelection,
  structureKindLabel,
  type ContentStructure,
  type SubjectStructureData,
} from '@/data/contentStructures';
import { useContentCatalog } from '@/hooks/useContentCatalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ContentBankBreadcrumbs } from '@/components/contentBank/ContentBankBreadcrumbs';
import { ExportDocumentPanel, type ExportSource } from '@/components/contentBank/ExportDocumentPanel';
import { CONTENT_BANK_BASE, contentBankSubjectPath } from '@/navigation/contentBankRoutes';
import type { Subject } from '@/types';

/**
 * Structures workspace — groups, directions, and shared task instructions.
 *
 * READ-ONLY on purpose. This is the management foundation: it establishes the
 * route, the normalized view, the review representation, and the export path so
 * editing can be added later without rebuilding any of it. Nothing here writes
 * to Firestore or to disk, and no structure content is duplicated anywhere —
 * every field shown is read from the source-controlled files it names.
 *
 * The learner-facing column comes from the SAME resolver the booklet uses
 * (`resolveSharedTaskContext`), so this screen cannot drift from what an
 * examinee actually reads.
 */

function StatFigure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function KindBadge({ structure }: { structure: ContentStructure }) {
  const group = structure.kind === 'group';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        group
          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
          : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
      }`}
    >
      {structureKindLabel(structure.kind)}
    </span>
  );
}

/**
 * One structure: explicit selection checkbox, facts, and an expandable review
 * showing the authored source and the learner-facing projection side by side.
 */
function StructureRow({
  structure,
  selected,
  onToggleSelected,
}: {
  structure: ContentStructure;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const previewId = `structure-preview-${structure.key}`;
  const checkboxId = `structure-select-${structure.key}`;

  return (
    <li className="border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
        />
        <label htmlFor={checkboxId} className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {structure.key}
        </label>
        <KindBadge structure={structure} />
        <span className="text-xs text-slate-600 dark:text-slate-300">{structure.title ?? 'No title'}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {structure.questionIds.length} question{structure.questionIds.length === 1 ? '' : 's'}
        </span>
        {!structure.rendersHeader && (
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">No directions header</span>
        )}
        {structure.unresolvedQuestionIds.length > 0 && (
          <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">
            {structure.unresolvedQuestionIds.length} unresolved ID
            {structure.unresolvedQuestionIds.length === 1 ? '' : 's'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={previewId}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {open ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <div id={previewId} className="mt-3 space-y-3">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg bg-slate-50 p-3 text-[11px] sm:grid-cols-2 dark:bg-slate-950">
            {structure.metadata.map(([field, value]) => (
              <div key={field} className="flex gap-2">
                <dt className="shrink-0 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{field}</dt>
                <dd className="min-w-0 break-words text-slate-800 dark:text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Learner-facing representation
            </h4>
            {structure.rendersHeader ? (
              <div className="mt-1 space-y-2 rounded-lg border-l-2 border-emerald-500 bg-white px-3 py-2 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {structure.title && <p className="font-bold uppercase tracking-wide">{structure.title}</p>}
                {structure.directions && <p className="whitespace-pre-line font-semibold">{structure.directions}</p>}
                {structure.example && <p className="whitespace-pre-line">{structure.example}</p>}
                {structure.contentBlocks.map((block) => (
                  <p key={block.id} className="whitespace-pre-line">
                    {block.kind === 'text' ? block.body : `[${block.kind} block ${block.id}]`}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Nothing renders above the questions: this structure has no directions, example, or passage.
              </p>
            )}
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Authored source — {structure.sourceFile}
            </h4>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre rounded-lg bg-slate-950 px-3 py-2 font-mono text-[11px] leading-5 text-slate-200">
              {JSON.stringify(structure.source, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

function StructuresWorkspace({ subject }: { subject: Subject }) {
  const { catalog, error, loading } = useContentCatalog([subject]);
  const [selection, setSelection] = useState<ReadonlySet<string> | null>(null);

  useDocumentTitle(`Structures — ${subject}`);

  const data: SubjectStructureData | null = useMemo(
    () => (catalog ? buildSubjectStructures(subject, catalog) : null),
    [catalog, subject],
  );

  // Everything is selected until the admin narrows it, so the export on screen
  // always describes the whole subject rather than an empty set.
  const selected = useMemo(
    () => selection ?? new Set(data?.all.map((structure) => structure.key) ?? []),
    [selection, data],
  );

  const chosen = useMemo(() => (data ? orderStructureSelection(data, selected) : []), [data, selected]);

  const sources = useMemo<readonly ExportSource[]>(
    () => [
      {
        kind: 'markdown',
        label: 'Review Markdown',
        icon: FileText,
        build: () => createStructureReviewExport(subject, chosen, data ?? undefined),
      },
      {
        kind: 'source',
        label: 'Authored Source',
        icon: Braces,
        build: () => createStructureSourceJsonExport(chosen),
      },
    ],
    [subject, chosen, data],
  );

  function toggle(key: string) {
    setSelection(() => {
      const next = new Set(selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading {subject} structures…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <ContentBankBreadcrumbs
        trail={[
          { label: 'Content Bank', to: CONTENT_BANK_BASE },
          { label: subject, to: contentBankSubjectPath(subject) },
          { label: 'Structures' },
        ]}
      />

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{subject} Structures</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Read-only tooling
          </span>
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <StatFigure label="Authored groups" value={String(data?.groups.length ?? 0)} />
          <StatFigure label="Shared task definitions" value={String(data?.sharedTasks.length ?? 0)} />
          <StatFigure label="Selected for export" value={String(chosen.length)} />
          <StatFigure
            label="Group source"
            value={data?.groupSourceFiles.length ? data.groupSourceFiles.join(', ') : 'No groups file'}
          />
        </dl>
        <Link
          to={contentBankSubjectPath(subject)}
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to {subject}
        </Link>
      </header>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <p className="font-bold text-slate-900 dark:text-white">
          Management foundation — reviewing and exporting only.
        </p>
        <p className="mt-1">
          Groups, directions, and passages are authored in{' '}
          <span className="font-mono">
            {data?.groupSourceFiles.length ? data.groupSourceFiles.join(', ') : 'no groups file for this subject'}
          </span>
          ; shared task instructions are authored in{' '}
          <span className="font-mono">content/taxonomy/taxonomy.json → sharedTaskDefinitions</span>. Editing from this
          screen is not built yet, and nothing here writes to those files, to Firestore, or to any other store. Change
          the source files in the repository to change what a learner sees.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {data && data.droppedGroupCount > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <strong>{data.droppedGroupCount}</strong> group{data.droppedGroupCount === 1 ? '' : 's'} referenced by the
          classification manifest could not be resolved into the active catalog, so{' '}
          {data.droppedGroupCount === 1 ? 'it is' : 'they are'} missing from the list below.
        </p>
      )}

      <section aria-labelledby="structures-heading" className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <h2 id="structures-heading" className="text-base font-extrabold text-slate-900 dark:text-white">
            Structures
          </h2>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setSelection(new Set(data?.all.map((structure) => structure.key) ?? []))}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelection(new Set())}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Clear
            </button>
          </div>
        </div>
        {data && data.all.length > 0 ? (
          <ul className="border-t border-slate-100 dark:border-slate-800">
            {data.all.map((structure) => (
              <StructureRow
                key={structure.key}
                structure={structure}
                selected={selected.has(structure.key)}
                onToggleSelected={() => toggle(structure.key)}
              />
            ))}
          </ul>
        ) : (
          <p className="border-t border-slate-100 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No authored groups or shared task definitions exist for {subject}.
          </p>
        )}
      </section>

      {chosen.length > 0 ? (
        <ExportDocumentPanel headingId="structures-export-heading" sources={sources} />
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Select at least one structure to review and export it.
        </p>
      )}
    </div>
  );
}

export default function ContentBankStructuresPage() {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const subject = subjectSlug ? subjectFromSlug(subjectSlug) : undefined;
  if (!subject) return <Navigate to={CONTENT_BANK_BASE} replace />;
  return <StructuresWorkspace key={subject} subject={subject} />;
}
