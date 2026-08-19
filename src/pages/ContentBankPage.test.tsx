// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { QUESTION_MANIFEST } from '@/data/questionBank';
import { allClassifications } from '@/data/taxonomy';
import { buildFilingPracticeSession, buildGrammarPilotPracticeSession, buildNumberSeriesPracticeSession, buildSpellingPracticeSession } from '@/lib/examEngine';
import { NAV_ITEMS } from '@/navigation/navConfig';
import { CONTENT_BANK_ROUTE } from '@/App';
import type { Subject } from '@/types';
import { ContentBankPage, getQAFocusGroups, QA_FOCUS_GROUPS } from './ContentBankPage';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/shell/AppLayout', () => ({
  useAppContext: () => ({
    examLevel: 'Subprofessional',
    setExamLevel: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(() => cleanup());
beforeEach(() => navigateMock.mockReset());

const INVENTORY_SUBJECTS: Subject[] = [...new Set([
  ...SUBJECTS_BY_LEVEL.Professional,
  ...SUBJECTS_BY_LEVEL.Subprofessional,
])];

function subjectManifestCount(subject: Subject): number {
  const supply = QUESTION_MANIFEST.subjects[subject];
  return supply ? supply.professional + supply.subprofessional + supply.both : 0;
}

describe('Content Bank / QA Practice page', () => {
  it('renders the internal inventory route component and canonical totals', () => {
    render(<ContentBankPage />);

    expect(CONTENT_BANK_ROUTE).toBe('/app/content-bank');
    expect(screen.getByRole('heading', { name: 'Content Bank' })).toBeInTheDocument();
    expect(screen.getByTestId('content-bank-total')).toHaveTextContent(String(QUESTION_MANIFEST.totalQuestions));
    expect(QUESTION_MANIFEST.totalQuestions).toBe(
      INVENTORY_SUBJECTS.reduce((sum, subject) => sum + subjectManifestCount(subject), 0)
    );
  });

  it('shows canonical per-subject totals and keeps the route out of learner navigation', () => {
    render(<ContentBankPage />);

    for (const subject of INVENTORY_SUBJECTS) {
      expect(screen.getByTestId(`subject-total-${subject}`)).toHaveTextContent(String(subjectManifestCount(subject)));
    }
    expect(NAV_ITEMS.some((item) => item.path === CONTENT_BANK_ROUTE)).toBe(false);
  });

  it('renders inventory summary before QA focus and uses explicit workflow priority', () => {
    const { container } = render(<ContentBankPage />);
    const summary = container.querySelector('[aria-labelledby="inventory-summary-heading"]')!;
    const qaFocus = container.querySelector('[aria-labelledby="qa-focus-heading"]')!;
    expect(summary.compareDocumentPosition(qaFocus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const renderedOrder = [...container.querySelectorAll<HTMLElement>('[data-qa-group]')]
      .map((card) => card.dataset.qaGroup);
    expect(renderedOrder).toEqual([
      'grammar-sentence-correction',
      'number-series',
      'spelling',
      'filing-alphabetizing',
    ]);
  });

  it('derives the four QA groups from canonical classification membership', () => {
    const groups = getQAFocusGroups();
    const classifications = allClassifications();
    const expected = new Map([
      ['filing-alphabetizing', classifications.filter((record) => record.subject === 'Clerical Ability' && record.topic === 'Filing & Alphabetizing').map((record) => record.questionId)],
      ['spelling', classifications.filter((record) => record.poolId === 'clerical-spelling' && record.taskFormat === 'shared_spelling_task').map((record) => record.questionId)],
      ['number-series', classifications.filter((record) => record.poolId === 'numerical-number-sequence' && record.taskFormat === 'number_sequence').map((record) => record.questionId)],
      ['grammar-sentence-correction', classifications.filter((record) => record.poolId === 'verbal-grammar-usage' && record.taskFormat === 'shared_grammar_sentence_correction').map((record) => record.questionId)],
    ]);

    expect(QA_FOCUS_GROUPS).toHaveLength(4);
    expect(QA_FOCUS_GROUPS.map((config) => config.sortOrder)).toEqual([1, 2, 3, 4]);
    expect(QA_FOCUS_GROUPS.map((config) => config.id)).toEqual([
      'grammar-sentence-correction',
      'number-series',
      'spelling',
      'filing-alphabetizing',
    ]);
    for (const group of groups) {
      expect(group.questionIds).toEqual(expected.get(group.config.id));
      expect(group.count).toBe(group.questionIds.length);
    }

    const reordered = [...QA_FOCUS_GROUPS].reverse().map((config, index) => ({
      ...config,
      sortOrder: index + 1,
    }));
    expect(getQAFocusGroups(reordered).map((group) => group.config.id)).toEqual([
      'filing-alphabetizing',
      'spelling',
      'number-series',
      'grammar-sentence-correction',
    ]);

    render(<ContentBankPage />);
    expect(screen.getByTestId('qa-count-filing-alphabetizing')).toHaveTextContent('26 questions');
    expect(screen.getByTestId('qa-count-spelling')).toHaveTextContent('14 questions');
    expect(screen.getByTestId('qa-count-number-series')).toHaveTextContent('11 questions');
    expect(screen.getByTestId('qa-count-grammar-sentence-correction')).toHaveTextContent('4 questions');
  });

  it('launches each QA group through the real Practice route with its canonical task format', async () => {
    const user = userEvent.setup();
    render(<ContentBankPage />);

    for (const group of getQAFocusGroups()) {
      navigateMock.mockReset();
      await user.click(screen.getByRole('button', { name: `Practice ${group.config.label}` }));
      expect(navigateMock).toHaveBeenCalledWith('/app/exam', {
        state: {
          launch: {
            kind: 'practice',
            examLevel: 'Subprofessional',
            questionCount: 0,
            subjects: [group.config.subject],
            taskFormat: group.config.taskFormat,
          },
        },
      });
    }
  });

  it('keeps every selected QA Practice session restricted to the canonical group members', async () => {
    const builders = [
      ['filing-alphabetizing', buildFilingPracticeSession],
      ['spelling', buildSpellingPracticeSession],
      ['number-series', buildNumberSeriesPracticeSession],
      ['grammar-sentence-correction', buildGrammarPilotPracticeSession],
    ] as const;

    const groups = new Map(getQAFocusGroups().map((group) => [group.config.id, group]));
    for (const [groupId, build] of builders) {
      const group = groups.get(groupId)!;
      const session = await build('Subprofessional');
      expect(new Set(session.questionIds)).toEqual(new Set(group.questionIds));
      expect(session.items).toHaveLength(1);
      const [item] = session.items ?? [];
      expect(item).toMatchObject({
        kind: 'pool',
        poolId: group.config.poolId,
        taskFormat: group.config.taskFormat,
      });
      if (item?.kind === 'pool') {
        expect(new Set(item.questionIds)).toEqual(new Set(group.questionIds));
      }
    }
  });
});
