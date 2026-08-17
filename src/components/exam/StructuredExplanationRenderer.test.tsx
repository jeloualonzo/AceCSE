// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { StructuredExplanation } from '@/types';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';

const explanation: StructuredExplanation = {
  blocks: [
    { type: 'heading', text: 'Solution' },
    { type: 'correct_answer', text: 'E — 48' },
    { type: 'paragraph', label: 'What to Notice', text: 'Check how each term changes to the next.' },
    { type: 'pattern', expression: '3 × 2 = 6\n6 × 2 = 12\n12 × 2 = 24' },
    { type: 'paragraph', text: 'The same operation is repeated: ×2.' },
    { type: 'solution', expression: '24 × 2 = 48' },
    { type: 'answer', text: '48', variant: 'final' },
    { type: 'rule', text: 'Geometric sequence: consecutive terms have a constant multiplication ratio.' },
    { type: 'common_trap', text: 'Optional future content.' },
    { type: 'math', expression: '5 − 2 = 3\n9 − 5 = 4' },
  ],
};

describe('StructuredExplanationRenderer V3', () => {
  it('renders the approved semantic hierarchy and math without inventing steps or nested cards', () => {
    const { container } = render(<StructuredExplanationRenderer explanation={explanation} theme="light" />);
    const root = screen.getByTestId('structured-explanation');

    expect(screen.getByRole('heading', { level: 4, name: 'Solution' })).toBeInTheDocument();
    expect(screen.getByText('Correct Answer:')).toBeInTheDocument();
    expect(screen.getByText('E — 48')).toBeInTheDocument();
    expect(screen.getByText('What to Notice')).toBeInTheDocument();
    expect(screen.getByText('Check how each term changes to the next.')).toBeInTheDocument();
    expect(screen.getByText('Pattern')).toBeInTheDocument();
    expect(screen.getByText('Apply the Pattern')).toBeInTheDocument();
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByText('Common Trap')).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'Pattern: 3 × 2 = 6; 6 × 2 = 12; 12 × 2 = 24' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'Apply the Pattern: 24 × 2 = 48' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: '5 − 2 = 3; 9 − 5 = 4' })).toBeInTheDocument();
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
    expect(container.querySelectorAll('[data-testid="structured-explanation"]')).toHaveLength(1);
  });

  it('keeps long expressions inside a horizontally safe scroll container', () => {
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{ blocks: [{ type: 'solution', expression: '123456789 + 987654321 = 1111111110' }] }}
      />
    );

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });
});
