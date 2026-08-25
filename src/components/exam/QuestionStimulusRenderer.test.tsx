// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { loadContentCatalog } from '@/data/questionBank';
import { QuestionStimulusRenderer } from './QuestionStimulusRenderer';

afterEach(() => cleanup());

describe('QuestionStimulusRenderer semantic Clerical tables', () => {
  it('renders cler-0042 position and region data as two readable semantic tables', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question = catalog.questions.get('cler-0042')!;
    render(<QuestionStimulusRenderer question={question} />);

    const positionTable = screen.getByRole('table', { name: 'Position Level Codes' });
    const regionTable = screen.getByRole('table', { name: 'Region Codes' });
    expect(within(positionTable).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Code', 'Position Level']);
    expect(within(positionTable).getAllByRole('row')).toHaveLength(6);
    expect(within(positionTable).getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(within(positionTable).getByRole('cell', { name: 'Clerk II' })).toBeInTheDocument();
    expect(within(regionTable).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Code', 'Region']);
    expect(within(regionTable).getAllByRole('row')).toHaveLength(7);
    expect(within(regionTable).getByRole('cell', { name: 'F' })).toBeInTheDocument();
    expect(within(regionTable).getByRole('cell', { name: 'NCR' })).toBeInTheDocument();
    expect(screen.getByText('Region codes are appended as a letter suffix:')).toBeInTheDocument();
    expect(screen.getAllByRole('table').every((table) => !table.textContent?.includes('|'))).toBe(true);
  });

  it('renders cler-0044 department and document-type data without changing the lookup values', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question = catalog.questions.get('cler-0044')!;
    render(<QuestionStimulusRenderer question={question} />);

    const departmentTable = screen.getByRole('table', { name: 'Department Codes' });
    const documentTypeTable = screen.getByRole('table', { name: 'Document Type Codes' });
    expect(within(departmentTable).getAllByRole('row')).toHaveLength(6);
    expect(within(departmentTable).getByRole('cell', { name: 'LG' })).toBeInTheDocument();
    expect(within(departmentTable).getByRole('cell', { name: 'Legal' })).toBeInTheDocument();
    expect(within(documentTypeTable).getAllByRole('row')).toHaveLength(6);
    expect(within(documentTypeTable).getByRole('cell', { name: '05' })).toBeInTheDocument();
    expect(within(documentTypeTable).getByRole('cell', { name: 'Contract' })).toBeInTheDocument();
    expect(screen.getByText('Example: FN-03 = Finance Department Report.')).toBeInTheDocument();
    expect(screen.getAllByRole('table').every((table) => !table.textContent?.includes('|'))).toBe(true);
  });

  it('renders cler-0045 format and month tables with exact order and zero-padding values', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const question = catalog.questions.get('cler-0045')!;
    render(<QuestionStimulusRenderer question={question} />);

    const formatTable = screen.getByRole('table', { name: 'Format Details' });
    const monthTable = screen.getByRole('table', { name: 'Month Codes' });
    expect(within(formatTable).getAllByRole('row')).toHaveLength(5);
    expect(within(formatTable).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Year', 'Last 2 digits',
      'Month Code', '2 digits',
      'Day', '2 digits, zero-padded when necessary',
      'Series Number', '3 digits, zero-padded when necessary; sequential, starting at 001 each year',
    ]);
    expect(within(monthTable).getAllByRole('row')).toHaveLength(13);
    expect(within(monthTable).getAllByRole('cell').slice(0, 6).map((cell) => cell.textContent)).toEqual(['Jan', '01', 'Feb', '02', 'Mar', '03']);
    expect(within(monthTable).getAllByRole('cell').slice(-4).map((cell) => cell.textContent)).toEqual(['Nov', '11', 'Dec', '12']);
    expect(screen.getByText(/Code order: Year \(last 2 digits\) — Month Code — Day — Series Number\./)).toBeInTheDocument();
    expect(screen.getByText('Example: A letter sent on March 15, 2025, as the 23rd document of the year is coded: 25-03-15-023')).toBeInTheDocument();
    expect(screen.getAllByRole('table').every((table) => !table.textContent?.includes('|'))).toBe(true);
  });
});
