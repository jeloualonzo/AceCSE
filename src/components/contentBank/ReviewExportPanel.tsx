import { FileJson, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { createRawJsonExport, createReviewExport } from '@/data/contentBankWorkspace';
import { ExportDocumentPanel, type ExportSource } from '@/components/contentBank/ExportDocumentPanel';
import type { RefinementBatch } from '@/data/refinementBatches';
import type { Question } from '@/types';

/**
 * Batch review & export.
 *
 * Only the two document sources live here — every character count, chunk
 * boundary, Copy Chunk button, and the integrity gate come from
 * {@link ExportDocumentPanel}, which the structures workspace drives the same
 * way. There is exactly one copy/chunk implementation in the app.
 */
export function ReviewExportPanel({
  batch,
  questions,
}: {
  batch: RefinementBatch;
  questions: readonly Question[];
}) {
  const sources = useMemo<readonly ExportSource[]>(
    () => [
      {
        kind: 'markdown',
        label: 'Review Markdown',
        icon: FileText,
        build: () => createReviewExport(batch, questions),
      },
      {
        kind: 'json',
        label: 'Raw JSON',
        icon: FileJson,
        build: () => createRawJsonExport(batch, questions),
      },
    ],
    [batch, questions],
  );

  return <ExportDocumentPanel headingId="review-export-heading" sources={sources} />;
}

export default ReviewExportPanel;
