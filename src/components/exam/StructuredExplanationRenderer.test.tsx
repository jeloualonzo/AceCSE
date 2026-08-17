// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { StructuredExplanation } from '@/types';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';

const explanation: StructuredExplanation = {
  blocks: [
    { type: 'heading', text: 'Solution' },
    {
      type: 'step',
      title: 'Find the common difference.',
      blocks: [{ type: 'math', expression: '9 - 4 = 5\n14 - 9 = 5\n19 - 14 = 5' }],
    },
    {
      type: 'step',
      title: 'Continue the pattern.',
      blocks: [
        { type: 'paragraph', text: 'The sequence increases by 5 each time.' },
        { type: 'math', expression: '19 + 5 = 24' },
      ],
    },
    { type: 'answer', text: '24' },
  ],
};

describe('StructuredExplanationRenderer', () => {
  it('renders heading, numbered steps, paragraph, math, and restrained answer emphasis', () => {
    const { container } = render(<StructuredExplanationRenderer explanation={explanation} theme="light" />);

    expect(screen.getByRole('heading', { level: 4, name: 'Solution' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Find the common difference.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Continue the pattern.' })).toBeInTheDocument();
    expect(screen.getAllByText('Step 2')).toHaveLength(1);
    expect(screen.getByText('The sequence increases by 5 each time.')).toBeInTheDocument();
    expect(screen.getAllByRole('math')).toHaveLength(2);
    expect(screen.getByRole('math', { name: '9 − 4 = 5; 14 − 9 = 5; 19 − 14 = 5' })).toBeInTheDocument();
    expect(screen.getByText('Answer:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).not.toContain('```');
    expect(container.textContent).not.toContain('\\(');
    expect(container.textContent).not.toContain('\\)');
  });

  it('keeps long math expressions inside a horizontally safe scroll container', () => {
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{ blocks: [{ type: 'math', expression: '123456789 + 987654321 = 1111111110' }] }}
      />
    );

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });
});
