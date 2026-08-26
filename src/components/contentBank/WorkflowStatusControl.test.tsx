// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RefinementBatch, RefinementBatchStatus } from '@/data/refinementBatches';
import { REFINEMENT_STATUS_SEQUENCE } from '@/data/refinementBatches';
import { WorkflowStatusControl } from './WorkflowStatusControl';

afterEach(() => cleanup());

const batch: RefinementBatch = {
  id: 'grammar-pilot-01',
  title: 'Grammar & Usage — Pilot 1',
  family: 'Grammar & Usage',
  status: 'ready-for-qa',
  createdAt: '2026-08-20T12:00:00+08:00',
  questionIds: ['verb-0001'],
};

describe('WorkflowStatusControl', () => {
  it('renders all known statuses in one controlled selector and no transition buttons', () => {
    render(<WorkflowStatusControl batch={batch} onTransition={vi.fn(async () => true)} />);

    const selector = screen.getByRole('combobox', { name: 'Batch status' });
    expect(selector).toHaveValue('ready-for-qa');
    expect(selector.querySelectorAll('option')).toHaveLength(REFINEMENT_STATUS_SEQUENCE.length);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('skips same-status writes, disables while saving, and restores the controlled value after failure', async () => {
    const user = userEvent.setup();
    let resolveTransition!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolve) => {
      resolveTransition = resolve;
    });
    const onTransition = vi.fn(async (_batch: RefinementBatch, _status: RefinementBatchStatus) => pending);

    render(<WorkflowStatusControl batch={batch} onTransition={onTransition} />);
    const selector = screen.getByRole('combobox', { name: 'Batch status' });

    await user.selectOptions(selector, 'ready-for-qa');
    expect(onTransition).not.toHaveBeenCalled();

    await user.selectOptions(selector, 'frozen');
    expect(onTransition).toHaveBeenCalledWith(batch, 'frozen');
    expect(selector).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving status as Frozen');

    resolveTransition(false);
    await waitFor(() => expect(selector).not.toBeDisabled());
    expect(selector).toHaveValue('ready-for-qa');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save this status. Please try again.');

    await user.selectOptions(selector, 'ready-for-qa');
    expect(onTransition).toHaveBeenCalledTimes(1);
  });

  it('honors an externally disabled state', () => {
    render(<WorkflowStatusControl batch={batch} disabled onTransition={vi.fn(async () => true)} />);
    expect(screen.getByRole('combobox', { name: 'Batch status' })).toBeDisabled();
  });
});
