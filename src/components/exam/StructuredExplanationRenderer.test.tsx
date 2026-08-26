// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { StructuredExplanation } from '@/types';
import { StructuredExplanationRenderer } from './StructuredExplanationRenderer';

afterEach(() => cleanup());

const explanation: StructuredExplanation = {
  blocks: [
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

describe('StructuredExplanationRenderer Batch 2', () => {
  it('renders the approved semantic hierarchy and math without inventing steps or nested cards', () => {
    const { container } = render(<StructuredExplanationRenderer explanation={explanation} theme="light" />);
    const root = screen.getByTestId('structured-explanation');

    expect(screen.queryByRole('heading', { name: 'Solution' })).not.toBeInTheDocument();
    const sectionHeadings = Array.from(root.querySelectorAll('[data-section-heading="true"]'));
    expect(sectionHeadings).toHaveLength(5);
    expect(sectionHeadings.every((heading) => heading.tagName === 'H5')).toBe(true);
    expect(new Set(sectionHeadings.map((heading) => heading.className))).toHaveLength(1);
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

  it('renders reusable inline bold and italic markers without exposing raw markup', () => {
    render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [
            { type: 'paragraph', label: 'What to Notice', text: 'Use **double c** with *access*.' },
            { type: 'rule', text: '*Personnel* means employees, not *personal* belongings.' },
          ],
        }}
        theme="light"
      />
    );

    const root = screen.getByTestId('structured-explanation');
    expect(root.querySelectorAll('strong')).toHaveLength(1);
    expect(root.querySelector('strong')).toHaveTextContent('double c');
    expect(root.querySelectorAll('em')).toHaveLength(3);
    expect(root.querySelector('em')).toHaveTextContent('access');
    expect(root.textContent).toContain('Use double c with access.');
    expect(root.textContent).not.toContain('**');
    expect(root.textContent).not.toContain('*access*');
  });

  it('renders LaTeX display expressions inside a Rationale paragraph as mathematical markup', () => {
    render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [{
            type: 'paragraph',
            label: 'Rationale',
            text: 'The difference is **5**:\n\n\\[\n9-4=5,\\quad 14-9=5,\\quad 19-14=5\n\\]\n\nContinuing:\n\n\\[\n19+5=24\n\\]',
          }],
        }}
        theme="light"
      />
    );

    const root = screen.getByTestId('structured-explanation');
    const displays = screen.getAllByTestId('structured-latex-math');
    expect(displays).toHaveLength(2);
    expect(displays[0]).toHaveAttribute('role', 'math');
    expect(displays[0]).toHaveAttribute('aria-label', '9-4=5, 14-9=5, 19-14=5');
    expect(displays[0].querySelectorAll('mn').length).toBeGreaterThan(0);
    expect(displays[0].querySelectorAll('mo').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('math')).toHaveLength(2);
    expect(root.textContent).toContain('The difference is 5:');
    expect(root.textContent).toContain('Continuing:');
    expect(root.textContent).not.toContain('\\[');
    expect(root.textContent).not.toContain('\\]');
  });

  it('keeps long expressions inside a horizontally safe scroll container', () => {
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{ blocks: [{ type: 'solution', expression: '123456789 + 987654321 = 1111111110' }] }}
      />
    );

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });

  it('renders labeled interleaved subsequences as distinct Pattern sections', () => {
    render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [
            { type: 'pattern', label: 'Odd positions', expression: '3 → 4 → 5 → 6\n+1, +1, +1' },
            { type: 'pattern', label: 'Even positions', expression: '7 → 10 → 13 → ___\n+3, +3, +3' },
          ],
        }}
      />
    );

    const root = screen.getByTestId('structured-explanation');
    expect(within(root).getByText('Pattern — Odd positions')).toBeInTheDocument();
    expect(within(root).getByText('Pattern — Even positions')).toBeInTheDocument();
    expect(within(root).getByRole('math', { name: 'Pattern, Odd positions: 3 → 4 → 5 → 6; +1, +1, +1' })).toBeInTheDocument();
    expect(within(root).getByRole('math', { name: 'Pattern, Even positions: 7 → 10 → 13 → ___; +3, +3, +3' })).toBeInTheDocument();
    expect(root.querySelectorAll('[role="math"]')).toHaveLength(2);
  });

  it('renders Batch 4 fraction and Unicode-minus math safely inside one explanation card', () => {
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [
                        { type: 'correct_answer', text: 'A — 1/5' },
            { type: 'pattern', expression: '2/4 → 1/2\n2/6 → 1/3\n2/8 → 1/4\n2/10 → ___' },
            { type: 'solution', expression: '2/10 ÷ 2 = 1/5' },
            { type: 'answer', text: '1/5', variant: 'final' },
            { type: 'pattern', label: 'Signs', expression: '+, −, +, −, +' },
            { type: 'solution', expression: '55 + 89 = 144\n−144' },
            { type: 'answer', text: '−144', variant: 'final' },
          ],
        }}
      />
    );

    const root = screen.getByTestId('structured-explanation');
    const fractionPattern = within(root).getByRole('math', { name: 'Pattern: 2/4 → 1/2; 2/6 → 1/3; 2/8 → 1/4; 2/10 → ___' });
    const fractionSolution = within(root).getByRole('math', { name: 'Apply the Pattern: 2/10 ÷ 2 = 1/5' });
    expect(fractionPattern).toBeInTheDocument();
    expect(fractionSolution).toBeInTheDocument();
    expect(fractionPattern).toHaveTextContent('2/4 → 1/2');
    expect(fractionPattern).not.toHaveTextContent('2 ÷ 4');
    expect(fractionPattern).toHaveTextContent('1/2');
    expect(fractionPattern).not.toHaveTextContent('1 ÷ 2');
    expect(fractionSolution).toHaveTextContent('2/10 ÷ 2 = 1/5');
    expect(fractionSolution).not.toHaveTextContent('2 ÷ 10 ÷ 2 = 1 ÷ 5');
    expect(within(root).getByRole('math', { name: 'Pattern, Signs: +, −, +, −, +' })).toBeInTheDocument();
    expect(within(root).getByRole('math', { name: 'Apply the Pattern: 55 + 89 = 144; −144' })).toBeInTheDocument();
    expect(root.textContent).not.toContain('Step 1');
    expect(root.textContent).not.toContain('Why A is wrong');
    expect(root.querySelector('.rounded-lg')).toBeNull();
    expect(root.querySelector('.border')).toBeNull();
    expect(container.querySelectorAll('[data-testid="structured-explanation"]')).toHaveLength(1);
  });

  it('renders separate distractor paragraphs and stacked Apply the Rule steps without nested cards', () => {
    render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [
                        { type: 'step', title: 'Apply the Rule', blocks: [
              { type: 'paragraph', text: 'First compare the entries.' },
              { type: 'paragraph', text: 'Then identify the differing position.' },
            ] },
            { type: 'distractor_section', title: 'Why the other choices fail', blocks: [
              { type: 'paragraph', text: 'Choice **A** reverses the required order.' },
              { type: 'paragraph', text: 'Choice **B** uses the wrong code.' },
              { type: 'paragraph', text: 'Choice **C** omits a required field.' },
            ] },
          ],
        }}
        theme="light"
      />
    );

    const root = screen.getByTestId('structured-explanation');
    const distractorSection = within(root).getByTestId('structured-distractor-section');
    expect(within(distractorSection).getByText('Why the other choices fail')).toBeInTheDocument();
    expect(within(root).getAllByText('Why the other choices fail')).toHaveLength(1);
    const paragraphText = [...distractorSection.querySelectorAll('p')].map((paragraph) => paragraph.textContent?.replace(/\s+/g, ' ').trim());
    expect(paragraphText).toContain('Choice A reverses the required order.');
    expect(paragraphText).toContain('Choice B uses the wrong code.');
    expect(paragraphText).toContain('Choice C omits a required field.');
    const applyHeading = within(root).getByRole('heading', { level: 5, name: 'Apply the Rule' });
    const applySection = applyHeading.closest('section');
    expect(applySection).not.toBeNull();
    expect(within(applySection as HTMLElement).getByText('First compare the entries.')).toBeInTheDocument();
    expect(within(applySection as HTMLElement).getByText('Then identify the differing position.')).toBeInTheDocument();
    expect(root.querySelector('.rounded-lg')).toBeNull();
    expect(root.querySelector('.border')).toBeNull();
  });

  it('renders Filing Order as stacked numbered entries with shared inline rich text', () => {
    render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [
                        { type: 'paragraph', label: 'Filing Order', text: '**1.** *Abad, Bernardo S.*\n**2.** *Abad, Fernando C.*\n**3.** *Abad, Fernando M.*\n**4.** *Abadilla, Teresa G.*' },
          ],
        }}
        theme="light"
      />
    );

    const root = screen.getByTestId('structured-explanation');
    const orderParagraph = Array.from(root.querySelectorAll('p')).find((node) => node.textContent?.includes('Abad, Bernardo S.'));
    expect(orderParagraph).toBeDefined();
    expect(orderParagraph).toHaveClass('whitespace-pre-line');
    expect(orderParagraph).toHaveTextContent('1. Abad, Bernardo S.');
    expect(orderParagraph).toHaveTextContent('2. Abad, Fernando C.');
    expect(orderParagraph).toHaveTextContent('3. Abad, Fernando M.');
    expect(orderParagraph).toHaveTextContent('4. Abadilla, Teresa G.');
    expect(orderParagraph?.textContent).not.toContain('→');
    expect(orderParagraph?.querySelectorAll('strong')).toHaveLength(4);
    expect(orderParagraph?.querySelectorAll('em')).toHaveLength(4);
  });

  it('keeps Alternative Method collapsed by default and expands vertically inside the same card', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StructuredExplanationRenderer
        explanation={{
          blocks: [
                        { type: 'correct_answer', text: 'A — 36' },
            { type: 'solution', expression: '25 + 11 = 36' },
            {
              type: 'alternative_solution',
              title: 'Alternative Method',
              blocks: [
                { type: 'paragraph', text: 'Recognize the perfect squares.' },
                { type: 'math', expression: '1²\n2²\n3²\n4²\n5²' },
                { type: 'paragraph', text: 'The next term is:' },
                { type: 'math', expression: '6² = 36' },
                { type: 'answer', text: '36', variant: 'final' },
              ],
            },
          ],
        }}
      />
    );

    const root = screen.getByTestId('structured-explanation');
    const control = screen.getByRole('button', { name: /Alternative Method/ });
    const content = screen.getByTestId('structured-alternative-content');

    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveAttribute('hidden');
    expect(within(root).queryByText('Recognize the perfect squares.')).not.toBeVisible();
    expect(root.querySelector('.rounded-lg')).toBeNull();
    expect(root.querySelector('.grid')).toBeNull();
    expect(container.querySelectorAll('[data-testid="structured-explanation"]')).toHaveLength(1);

    await user.tab();
    expect(control).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(content).not.toHaveAttribute('hidden');
    expect(within(content).getByText('Recognize the perfect squares.')).toBeVisible();
    expect(within(content).getByRole('math', { name: '6² = 36' })).toBeVisible();

    await user.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveAttribute('hidden');
  });
});
