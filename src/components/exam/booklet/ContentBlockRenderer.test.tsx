// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentBlockRenderer, parsePipeDelimitedTable } from './ContentBlockRenderer';

const tableText = 'Code | Position | Level\nA | 1 | Entry\nB | 2 | Senior';

afterEach(() => cleanup());

describe('ContentBlockRenderer semantic table cleanup', () => {
  it('parses an unambiguous multi-line pipe table into semantic table markup', () => {
    expect(parsePipeDelimitedTable(tableText)).toEqual({
      columns: ['Code', 'Position', 'Level'],
      rows: [
        ['A', '1', 'Entry'],
        ['B', '2', 'Senior'],
      ],
    });

    render(
      <ContentBlockRenderer
        block={{ kind: 'text', id: 'legacy-table', body: tableText }}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('cell', { name: 'Entry' })).toBeInTheDocument();
    expect(screen.getByRole('table').textContent).not.toContain('|');
  });

  it('keeps ordinary one-line pipe prose as text', () => {
    render(
      <ContentBlockRenderer
        block={{ kind: 'text', id: 'ordinary-prose', body: 'Choose A | B when both conditions apply.' }}
      />
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Choose A | B when both conditions apply.')).toBeInTheDocument();
  });
});
