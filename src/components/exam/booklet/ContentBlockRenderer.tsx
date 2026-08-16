import React from 'react';
import type { ContentBlock } from '@/types';

export interface ContentBlockRendererProps {
  block: ContentBlock;
}

const blockTitle = (title: string | undefined) =>
  title ? (
    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {title}
    </h4>
  ) : null;

interface TableShape {
  columns: string[];
  rows: string[][];
}

/**
 * Some legacy shared stimuli predate `ContentBlock.kind === 'table'` and are
 * stored as a clearly tabular multi-line string. Decode only that unambiguous
 * shape; a one-line pipe in ordinary prose remains ordinary text.
 */
export function parsePipeDelimitedTable(body: string): TableShape | null {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const rows = lines.map((line) => {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();
    return cells;
  });
  const width = rows[0]?.length ?? 0;
  if (width < 2 || rows.some((row) => row.length !== width)) return null;
  if (rows.slice(1).some((row) => row.every((cell) => /^:?-{3,}:?$/.test(cell)))) {
    rows.splice(1, 1);
  }
  if (rows.length < 2) return null;
  return { columns: rows[0], rows: rows.slice(1) };
}

const SemanticTable: React.FC<TableShape> = ({ columns, rows }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
    <table className="min-w-full text-sm" data-semantic-table="true">
      <thead className="bg-slate-100 dark:bg-slate-800/80">
        <tr>
          {columns.map((column, index) => (
            <th
              key={index}
              scope="col"
              className="text-left font-semibold px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-t border-slate-200 dark:border-slate-800">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Renders one item from a group's `contentBlocks` — a table, dataset,
 * image, or plain text stimulus shared by every question in the group.
 * Reads the actual `ContentBlock` discriminated union from `@/types`
 * rather than inventing variants.
 */
export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  switch (block.kind) {
    case 'text': {
      const pipeTable = parsePipeDelimitedTable(block.body);
      if (pipeTable) {
        return (
          <div className="space-y-1.5">
            {blockTitle(block.title)}
            <SemanticTable {...pipeTable} />
          </div>
        );
      }
      return (
        <div className="space-y-1.5">
          {blockTitle(block.title)}
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
            {block.body}
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div className="space-y-1.5">
          {blockTitle(block.title)}
          <SemanticTable columns={block.columns} rows={block.rows} />
        </div>
      );

    case 'image':
      return (
        <figure className="space-y-1.5">
          <img
            src={block.src}
            alt={block.alt}
            className="rounded-lg border border-slate-200 dark:border-slate-800 max-w-full"
          />
          {block.caption && (
            <figcaption className="text-xs text-slate-500 dark:text-slate-400">{block.caption}</figcaption>
          )}
        </figure>
      );

    case 'dataset': {
      const columns = block.data.length > 0 ? Object.keys(block.data[0]) : [];
      const rows = block.data.map((row) => columns.map((column) => String(row[column])));
      return (
        <div className="space-y-1.5">
          {blockTitle(block.title)}
          <SemanticTable columns={columns} rows={rows} />
        </div>
      );
    }

    default:
      return null;
  }
};
