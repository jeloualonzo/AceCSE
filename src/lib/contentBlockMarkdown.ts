import type { ContentBlock } from '@/types';

/**
 * A Markdown table cell must stay on one line, so internal whitespace is
 * collapsed and pipes escaped. Authored text blocks remain verbatim.
 */
function markdownCell(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim().replaceAll('|', '\\|');
  return collapsed === '' ? '—' : collapsed;
}

/** Serialize one semantic ContentBlock for reviewer/export Markdown. */
export function renderContentBlockMarkdown(block: ContentBlock): string {
  if (block.kind === 'image') {
    const heading = `**${block.caption ?? block.id}** (image)`;
    return `${heading}\n\n![${block.alt}](${block.src})`;
  }

  const heading = `**${block.title ?? block.id}** (${block.kind})`;
  if (block.kind === 'text') return `${heading}\n\n${block.body}`;
  if (block.kind === 'table') {
    const header = `| ${block.columns.map(markdownCell).join(' | ')} |`;
    const rule = `|${block.columns.map(() => '---').join('|')}|`;
    const rows = block.rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`);
    return [heading, '', header, rule, ...rows].join('\n');
  }
  return `${heading}\n\n\`\`\`json\n${JSON.stringify(block.data, null, 2)}\n\`\`\``;
}
