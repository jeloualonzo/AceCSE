// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { QUESTION_MANIFEST, loadContentCatalog } from '@/data/questionBank';
import { allClassifications } from '@/data/taxonomy';
import { getRefinementBatches } from '@/data/refinementBatches';
import { buildFilingPracticeSession, buildGrammarPilotPracticeSession, buildNumberSeriesPracticeSession, buildSpellingPracticeSession } from '@/lib/examEngine';
import { NAV_ITEMS } from '@/navigation/navConfig';
import { CONTENT_BANK_ROUTE } from '@/App';
import type { Subject } from '@/types';
import {
  buildSubjectDashboardSummaries,
  buildSubjectWorkspaceData,
  getWorkspaceRefinementBatches,
  WORKSPACE_BATCHES_STORAGE_KEY,
} from '@/data/contentBankWorkspace';
import { ContentBankPage, getQAFocusGroups, QA_FOCUS_GROUPS } from './ContentBankPage';
import ContentBankWorkspacePage from './ContentBankWorkspacePage';

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

const INVENTORY_SUBJECTS: Subject[] = [...new Set([
  ...SUBJECTS_BY_LEVEL.Professional,
  ...SUBJECTS_BY_LEVEL.Subprofessional,
])];

function renderContentBank() {
  return render(
    <MemoryRouter initialEntries={[CONTENT_BANK_ROUTE]}>
      <ContentBankPage />
    </MemoryRouter>
  );
}

function renderWorkspace(path = '/app/content-bank/clerical') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/content-bank/:subjectSlug" element={<ContentBankWorkspacePage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => navigateMock.mockReset());

describe('Content Bank subject selector', () => {
  it('renders all current subjects as reusable workspace entry points', () => {
    renderContentBank();

    expect(CONTENT_BANK_ROUTE).toBe('/app/content-bank');
    expect(screen.getByRole('heading', { name: 'Content Bank' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subject Workspaces' })).toBeInTheDocument();
    expect(screen.getByTestId('content-bank-subject-count')).toHaveTextContent('5 subjects');
    expect(screen.getByTestId('content-bank-subject-count')).toHaveTextContent(`${QUESTION_MANIFEST.totalQuestions} active questions`);
    for (const subject of INVENTORY_SUBJECTS) {
      expect(screen.getByTestId(`subject-card-${subject}`)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: new RegExp(`${subject}.*Open Subject Workspace`, 's') })).toHaveAttribute('href', expect.stringContaining('/app/content-bank/'));
    }
    expect(NAV_ITEMS.some((item) => item.path === CONTENT_BANK_ROUTE)).toBe(false);
    expect(screen.queryByRole('heading', { name: 'QA focus groups' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Filter inventory' })).not.toBeInTheDocument();
  });

  it('derives subject cards from active classifications and the separate QA registry', () => {
    const summaries = buildSubjectDashboardSummaries(getWorkspaceRefinementBatches());
    renderContentBank();

    for (const summary of summaries) {
      const card = screen.getByTestId(`subject-card-${summary.subject}`);
      expect(card).toHaveTextContent(`${summary.activeQuestionCount} active questions`);
      expect(card).toHaveTextContent(`${summary.familyCount} families`);
      expect(card).toHaveTextContent(`${summary.frozenQuestionCount === 0 ? 0 : Math.round((summary.frozenQuestionCount / summary.activeQuestionCount) * 100)}% frozen`);
    }
    expect(allClassifications().length).toBe(QUESTION_MANIFEST.totalQuestions);
  });

  it('keeps the existing canonical QA focus predicates and exact-ID Practice builders compatible', async () => {
    const groups = getQAFocusGroups();
    const classifications = allClassifications();
    const expected = new Map([
      ['filing-alphabetizing', classifications.filter((record) => record.subject === 'Clerical Ability' && record.topic === 'Filing & Alphabetizing').map((record) => record.questionId)],
      ['spelling', classifications.filter((record) => record.poolId === 'clerical-spelling' && record.taskFormat === 'shared_spelling_task').map((record) => record.questionId)],
      ['number-series', classifications.filter((record) => record.poolId === 'numerical-number-sequence' && record.taskFormat === 'number_sequence').map((record) => record.questionId)],
      ['grammar-sentence-correction', classifications.filter((record) => record.poolId === 'verbal-grammar-usage' && record.taskFormat === 'shared_grammar_sentence_correction').map((record) => record.questionId)],
    ]);

    expect(QA_FOCUS_GROUPS).toHaveLength(4);
    expect(QA_FOCUS_GROUPS.map((config) => config.id)).toEqual(['grammar-sentence-correction', 'number-series', 'spelling', 'filing-alphabetizing']);
    for (const group of groups) expect(group.questionIds).toEqual(expected.get(group.config.id));

    const builders = [
      ['filing-alphabetizing', buildFilingPracticeSession],
      ['spelling', buildSpellingPracticeSession],
      ['number-series', buildNumberSeriesPracticeSession],
      ['grammar-sentence-correction', buildGrammarPilotPracticeSession],
    ] as const;
    const groupMap = new Map(groups.map((group) => [group.config.id, group]));
    for (const [groupId, build] of builders) {
      const session = await build('Subprofessional');
      expect(new Set(session.questionIds)).toEqual(new Set(groupMap.get(groupId)!.questionIds));
    }
  });

  it('shows recent QA batches newest first without turning the dashboard back into a mixed content browser', () => {
    renderContentBank();
    const expected = getRefinementBatches().slice(0, 5);
    expect([...document.querySelectorAll<HTMLElement>('[data-refinement-batch]')].map((node) => node.dataset.refinementBatch)).toEqual(expected.map((batch) => batch.id));
    expect(screen.getByTestId('refinement-count-grammar-pilot-01')).toHaveTextContent('4 questions');
    expect(screen.getByTestId('refinement-count-grammar-pilot-01')).toHaveTextContent('Verbal Ability');
  });
});

describe('Subject Workspace workflow', () => {
  it('loads only the selected subject and derives progress, state, and family rows', async () => {
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, getWorkspaceRefinementBatches());
    renderWorkspace();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Clerical Ability' })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Subject Progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Next Questions / Question Browser' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Refinement Batch' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-summary')).toHaveTextContent(`${workspace.activeQuestionCount} active questions`);
    expect(screen.getByTestId('workspace-summary')).toHaveTextContent(`${workspace.remainingQuestionIds.length} remaining`);
    expect(screen.getByTestId('visible-question-count')).toHaveTextContent(String(workspace.remainingQuestionIds.length));
    expect(screen.queryByText('Verbal Ability')).not.toBeInTheDocument();
    for (const family of workspace.families.slice(0, 3)) expect(screen.getAllByText(family.family).length).toBeGreaterThan(0);
  });

  it('selects the next N remaining questions and supports select-all remaining', async () => {
    const user = userEvent.setup();
    const catalog = await loadContentCatalog(['Clerical Ability']);
    const workspace = buildSubjectWorkspaceData('Clerical Ability', catalog, getWorkspaceRefinementBatches());
    renderWorkspace();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Clerical Ability' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Select Next N' }));
    expect(screen.getByTestId('selected-question-count')).toHaveTextContent('10');
    expect(screen.getAllByRole('checkbox', { name: /Select cler-/ }).filter((checkbox) => (checkbox as HTMLInputElement).checked)).toHaveLength(10);

    await user.click(screen.getByRole('button', { name: /Select All Remaining/ }));
    expect(screen.getByTestId('selected-question-count')).toHaveTextContent(String(workspace.remainingQuestionIds.length));
  });

  it('creates a valid browser-local QA registry entry from exact selected IDs', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Clerical Ability' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Select Next N' }));
    await user.click(screen.getByRole('button', { name: 'Create Refinement Batch (10)' }));
    await user.clear(screen.getByLabelText('Batch ID'));
    await user.type(screen.getByLabelText('Batch ID'), 'ui-created-batch');
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'UI Created Batch');
    await user.click(screen.getByRole('button', { name: 'Save QA Batch' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI Created Batch', level: 2 })).toBeInTheDocument());
    const localBatches = JSON.parse(localStorage.getItem(WORKSPACE_BATCHES_STORAGE_KEY) ?? '[]') as Array<{ id: string; questionIds: string[] }>;
    expect(localBatches).toHaveLength(1);
    expect(localBatches[0]).toMatchObject({ id: 'ui-created-batch', questionIds: expect.arrayContaining([]) });
    expect(localBatches[0].questionIds).toHaveLength(10);
    expect(screen.getByText(/10\s+questions\s+·\s+created/)).toBeInTheDocument();
  });

  it('copies review Markdown and exact Raw JSON for a selected batch in batch order', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WORKSPACE_BATCHES_STORAGE_KEY, JSON.stringify([{
      id: 'ui-export-batch',
      title: 'UI Export Batch',
      family: 'Filing & Alphabetizing',
      status: 'ready-for-qa',
      createdAt: '2026-08-22T15:00:00+08:00',
      questionIds: ['cler-0056'],
    }]));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderWorkspace('/app/content-bank/clerical?batch=ui-export-batch');

    await waitFor(() => expect(screen.getByRole('heading', { name: 'UI Export Batch', level: 2 })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Copy Review Markdown' }));
    await waitFor(() => expect(screen.getByText('Copied 1 questions as review Markdown.')).toBeInTheDocument());
    const markdown = String(writeText.mock.calls[0]?.[0]);
    expect(markdown).toContain('# UI Export Batch');
    expect(markdown).toContain('### Learner View');
    expect(markdown).toContain('### Authoring View');
    expect(markdown).toContain('cler-0056');

    await user.click(screen.getByRole('button', { name: 'Copy Raw JSON' }));
    await waitFor(() => expect(screen.getByText('Copied 1 questions as JSON.')).toBeInTheDocument());
    const raw = JSON.parse(String(writeText.mock.calls[1]?.[0])) as Array<{ id: string; batchId?: string }>;
    expect(raw.map((item) => item.id)).toEqual(['cler-0056']);
    expect(raw[0]?.batchId).toBeUndefined();
  });
});
