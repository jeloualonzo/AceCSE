// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmitConfirmDialog } from './SubmitConfirmDialog';

afterEach(() => cleanup());

describe('SubmitConfirmDialog', () => {
  it('explains non-punitive early Practice submission and exposes learning-oriented actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <SubmitConfirmDialog
        isPractice
        totalQuestions={20}
        answeredCount={12}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('heading', { name: 'Submit Practice?' })).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/Unanswered practice items are not counted as incorrect/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Practicing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Practice' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Keep Practicing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Practice' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps Simulation confirmation wording separate', () => {
    render(
      <SubmitConfirmDialog
        isPractice={false}
        totalQuestions={150}
        answeredCount={149}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Submit Exam?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Working' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm & Submit' })).toBeInTheDocument();
    expect(screen.queryByText(/not counted as incorrect/i)).not.toBeInTheDocument();
  });
});
