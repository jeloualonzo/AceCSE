// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { StructuredExplanation } from '@/types';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';

const explanation: StructuredExplanation = {
  blocks: [
    { type: 'heading', text: 'Solution' },
    { type: 'answer', text: 'Correct Answer: E — 48', variant: 'correct' },
    { type: 'paragraph', label: 'Why', text: 'Each term is doubled.' },
    { type: 'pattern', expression: '3 → 6 → 12 → 24 → 48' },
    { type: 'math', expression: '6 - 3 = 3\n12 - 6 = 6' },
    { type: 'solution', expression: '24 × 2 = 48' },
    { type: 'answer', text: '48', variant: 'final' },
    { type: 'rule', text: 'A geometric sequence has a constant multiplication ratio.' },
    { type: 'common_trap', text: 'Use the repeated multiplication pattern.' },
  ],
};

describe('StructuredExplanationRenderer V2', () => {
  it('renders semantic headings, answer, why, pattern, solution, rule, and common trap content', () => {
    const { container } = render(<StructuredExplanationRenderer explanation={explanation} theme="light" />);
    const root = screen.getByTestId('structured-explanation');

    expect(screen.getByRole('heading', { level: 4, name: 'Solution' })).toBeInTheDocument();
    expect(screen.getByText('Correct Answer: E — 48')).toBeInTheDocument();
    expect(screen.getByText('Why')).toBeInTheDocument();
    expect(screen.getByText('Each term is doubled.')).toBeInTheDocument();
    expect(screen.getByText('Pattern')).toBeInTheDocument();
    expect(screen.getByText('Solution', { selector: 'h5' })).toBeInTheDocument();
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByText('Common Trap')).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'Pattern: 3 → 6 → 12 → 24 → 48' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'Solution: 24 × 2 = 48' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'Mathematical expression: 6 − 3 = 3; 12 − 6 = 6' })).toBeInTheDocument();
    expect(Array.from(root.querySelectorAll('.font-mono.font-bold')).some((node) => node.textContent === '48')).toBe(true);
    expect(root.querySelector('.border')).toBeNull();
    expect(root.querySelector('.rounded-lg')).toBeNull();
    expect(root.textContent).not.toContain('Step 1');
    expect(root.textContent).not.toContain('Step 2');
    expect(root.textContent).not.toContain('Step 3');
    expect(root.textContent).not.toContain('**');
    expect(root.textContent).not.toContain('```');
    expect(root.textContent).not.toContain('\\(');
    expect(root.textContent).not.toContain('\\)');
    expect(root.textContent).not.toContain('{"blocks"');
    expect(container.querySelector('[data-testid="structured-explanation"]')).toBe(root);
  });

  it('keeps long math expressions inside a horizontally safe scroll container', () => {
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{ blocks: [{ type: 'solution', expression: '123456789 + 987654321 = 1111111110' }] }}
      />
    );

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });
});
