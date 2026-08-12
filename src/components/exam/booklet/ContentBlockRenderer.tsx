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

/**
 * Renders one item from a group's `contentBlocks` — a table, dataset,
 * image, or plain text stimulus shared by every question in the group.
 * Reads the actual `ContentBlock` discriminated union from `@/types`
 * rather than inventing variants.
 */
export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  switch (block.kind) {
    case 'text':
      return (
        <div className="space-y-1.5">
          {blockTitle(block.title)}
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
            {block.body}
          </div>
        </div>
      );

    case 'table':
      return (
        <div className="space-y-1.5">
          {blockTitle(block.title)}
          {/* Horizontal scroll is contained to the table itself, never the page. */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800/80">
                <tr>
                  {block.columns.map((column, index) => (
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
                {block.rows.map((row, rowIndex) => (
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
      return (
        <div className="space-y-1.5">
          {blockTitle(block.title)}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800/80">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="text-left font-semibold px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-slate-200 dark:border-slate-800">
                    {columns.map((column) => (
                      <td key={column} className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
