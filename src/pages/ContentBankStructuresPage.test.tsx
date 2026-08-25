// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EXPORT_CHUNK_CHARACTER_LIMIT } from '@/lib/exportText';
import { ADMIN_NAV_ITEMS } from '@/navigation/adminNavConfig';
import { NAV_ITEMS } from '@/navigation/navConfig';
import {
  CONTENT_BANK_BASE,
  CONTENT_BANK_BATCH_SEGMENT,
  CONTENT_BANK_STRUCTURES_SEGMENT,
  contentBankStructuresPath,
  contentBankSubjectPath,
} from '@/navigation/contentBankRoutes';
import ContentBankBatchPage from './ContentBankBatchPage';
import ContentBankFamilyPage from './ContentBankFamilyPage';
import ContentBankStructuresPage from './ContentBankStructuresPage';
import ContentBankSubjectPage from './ContentBankSubjectPage';

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null }),
}));

/**
 * Firestore is refused for the whole file, on purpose.
 *
 * The structures workspace must not need a database at all — it reads
 * source-controlled files. Refusing the store proves the screen still renders
 * completely, and pins the Subject page (which does load batches) to localStorage.
 */
vi.mock('@/services/refinementBatchStore', () => {
  const refused = async () => {
    throw new Error('Missing or insufficient permissions.');
  };
  return {
    fetchRefinementBatches: refused,
    createRefinementBatch: refused,
    updateRefinementBatchStatus: refused,
    seedRefinementBatches: refused,
  };
});

/**
 * `waitFor`'s own 1s default is too short for a lazy catalog chunk import, so the
 * waits below carry an explicit budget. The tests themselves keep Vitest's
 * default 5s timeout — none of them needs longer, and raising it would only hide
 * a future regression in how long a subject takes to load.
 */
const CATALOG_LOAD = 10_000;

/**
 * The real Content Bank route table from `src/App.tsx`, minus `RequireAdmin`.
 *
 * `structures/:subjectSlug` and `:subjectSlug/:familySlug` are both two segments
 * deep under the base, so mounting them together is what pins React Router's
 * ranking: a wrong preference would send `/structures/clerical` to the Family
 * Workspace with subjectSlug `structures`.
 */
function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={CONTENT_BANK_BASE}>
          {/*
            Stands in for the real `ContentBankPage` index route: this file only
            needs to observe that a bad slug lands here, not re-test the dashboard.
          */}
          <Route index element={<p>Content Bank index</p>} />
          <Route path={`${CONTENT_BANK_BATCH_SEGMENT}/:batchId`} element={<ContentBankBatchPage />} />
          <Route
            path={`${CONTENT_BANK_STRUCTURES_SEGMENT}/:subjectSlug`}
            element={<ContentBankStructuresPage />}
          />
          <Route path=":subjectSlug" element={<ContentBankSubjectPage />} />
          <Route path=":subjectSlug/:familySlug" element={<ContentBankFamilyPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function loaded(subject: string) {
  return waitFor(
    () => expect(screen.getByRole('heading', { name: `${subject} Structures`, level: 1 })).toBeInTheDocument(),
    { timeout: CATALOG_LOAD },
  );
}

function exportPanel() {
  return screen.getByRole('region', { name: 'Review & Export' });
}

/** The "Total characters" figure, as the number the UI is actually showing. */
function displayedTotal(): number {
  return Number(exportPanel().querySelector('dd')!.textContent!.replaceAll(',', ''));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Structures workspace routing', () => {
  it('wins the two-segment match against the subject/family route', async () => {
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    expect(contentBankStructuresPath('Clerical Ability')).toBe('/admin/content-bank/structures/clerical');
    // The Family Workspace would have rendered its own heading instead.
    expect(screen.queryByRole('heading', { name: /Family/ })).not.toBeInTheDocument();
  });

  it('sends an unknown subject slug back to the Content Bank', () => {
    renderRoute(`${CONTENT_BANK_BASE}/${CONTENT_BANK_STRUCTURES_SEGMENT}/not-a-subject`);
    expect(screen.getByText('Content Bank index')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('is reachable from the Subject Workspace and from nowhere in learner navigation', async () => {
    renderRoute(contentBankSubjectPath('Clerical Ability'));
    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Clerical Ability', level: 1 })).toBeInTheDocument(),
      { timeout: CATALOG_LOAD },
    );

    expect(screen.getByRole('link', { name: /Groups, directions & instructions/ })).toHaveAttribute(
      'href',
      contentBankStructuresPath('Clerical Ability'),
    );
    // Admin-only, like every other Content Bank surface.
    const structuresPath = contentBankStructuresPath('Clerical Ability');
    expect(NAV_ITEMS.some((item) => structuresPath.startsWith(item.path))).toBe(false);
    expect(ADMIN_NAV_ITEMS.some((item) => structuresPath.startsWith(item.path))).toBe(true);
  });
});

describe('Structures workspace — management foundation marking', () => {
  it('says plainly that it is read-only and names both authored sources', async () => {
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    expect(screen.getByText('Read-only tooling')).toBeInTheDocument();
    expect(screen.getByText(/Management foundation/)).toBeInTheDocument();
    expect(screen.getAllByText('content/groups/clerical/core-groups.json').length).toBeGreaterThan(0);
    expect(screen.getByText('content/taxonomy/taxonomy.json → sharedTaskDefinitions')).toBeInTheDocument();
    expect(
      screen.getByText(/nothing here writes to those files, to Firestore, or to any other store/),
    ).toBeInTheDocument();
  });

  it('offers no editing control — only selection, preview, and copy', async () => {
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    // No text entry of any kind: the only inputs are selection checkboxes.
    for (const input of document.querySelectorAll('input')) {
      expect(input).toHaveAttribute('type', 'checkbox');
    }
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.querySelector('[contenteditable]')).toBeNull();
    for (const button of screen.getAllByRole('button')) {
      expect(button.textContent ?? '').not.toMatch(/save|publish|delete|freeze|edit|create/i);
    }
  });

  it('renders honestly for a subject with no groups file at all', async () => {
    renderRoute(contentBankStructuresPath('General Information'));
    await loaded('General Information');

    expect(screen.getAllByText('No groups file').length).toBeGreaterThan(0);
    expect(screen.getByText(/no groups file for this subject/)).toBeInTheDocument();
    expect(
      screen.getByText('No authored groups or shared task definitions exist for General Information.'),
    ).toBeInTheDocument();
    // Nothing to export, and it says so rather than showing a zero-length export.
    expect(screen.queryByRole('region', { name: 'Review & Export' })).not.toBeInTheDocument();
    expect(screen.getByText('Select at least one structure to review and export it.')).toBeInTheDocument();
  });
});

describe('Structures workspace — selection drives the export', () => {
  it('starts with every structure selected and exports all of them', async () => {
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(1);
    expect(checkboxes.every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText(String(checkboxes.length))).toBeInTheDocument();
    expect(displayedTotal()).toBeGreaterThan(0);
  });

  it('shrinks the export when a structure is deselected, and restores it', async () => {
    const user = userEvent.setup();
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    const all = displayedTotal();
    const first = screen.getAllByRole('checkbox')[0];
    await user.click(first);

    await waitFor(() => expect(displayedTotal()).toBeLessThan(all));
    const reduced = displayedTotal();

    await user.click(screen.getAllByRole('checkbox')[0]);
    await waitFor(() => expect(displayedTotal()).toBe(all));
    expect(reduced).toBeLessThan(all);
  });

  it('refuses to export nothing, and recovers with Select all', async () => {
    const user = userEvent.setup();
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() =>
      expect(screen.getByText('Select at least one structure to review and export it.')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('region', { name: 'Review & Export' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    await waitFor(() => expect(displayedTotal()).toBeGreaterThan(0));
  });
});

describe('Structures workspace — review representation', () => {
  it('shows the authored source and the learner-facing text behind Show', async () => {
    const user = userEvent.setup();
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    const structures = screen.getByRole('region', { name: 'Structures' });
    const row = within(structures).getAllByRole('listitem')[0];
    const show = within(row).getByRole('button', { name: 'Show' });
    expect(show).toHaveAttribute('aria-expanded', 'false');

    await user.click(show);

    expect(within(row).getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(row).getByText('Learner-facing representation')).toBeInTheDocument();
    expect(within(row).getByText(/^Authored source — content\//)).toBeInTheDocument();
    // The authored record is shown as its own JSON, not as prose about it.
    const source = row.querySelector('pre')!.textContent ?? '';
    expect(JSON.parse(source)).toMatchObject({ subject: 'Clerical Ability' });
    // Normalization-only fields are not part of the source file.
    expect(JSON.parse(source)).not.toHaveProperty('questions');

    await user.click(within(row).getByRole('button', { name: 'Hide' }));
    expect(within(row).queryByText('Learner-facing representation')).not.toBeInTheDocument();
  });
});

describe('Structures workspace — export reuses the verified copy contract', () => {
  it('copies the exact chunk it displayed, byte for byte, and reports the same count', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    // Verbal has the most authored groups, so this is the real multi-chunk case.
    renderRoute(contentBankStructuresPath('Verbal Ability'));
    await loaded('Verbal Ability');

    const total = displayedTotal();
    const chunkLabels = screen.getAllByText(/^Chunk \d+ of \d+$/);
    expect(chunkLabels.length).toBeGreaterThan(1);
    const chunkCounts = screen
      .getAllByText(/^[\d,]+ characters$/)
      .map((node) => Number(node.textContent!.replace(' characters', '').replaceAll(',', '')));
    expect(chunkCounts).toHaveLength(chunkLabels.length);
    expect(chunkCounts.every((count) => count <= EXPORT_CHUNK_CHARACTER_LIMIT)).toBe(true);
    expect(chunkCounts.reduce((sum, count) => sum + count, 0)).toBe(total);

    const copyButtons = screen.getAllByRole('button', { name: 'Copy Chunk' });
    for (const button of copyButtons) await user.click(button);

    const copied = writeText.mock.calls.map((call) => String(call[0]));
    expect(copied.map((text) => text.length)).toEqual(chunkCounts);
    const reassembled = copied.join('');
    expect(reassembled).toHaveLength(total);
    expect(reassembled).not.toContain('\r');
    expect(reassembled.startsWith('# Verbal Ability — Content Structures')).toBe(true);
    // The whole-document copy is that same string, not a re-render of it.
    await user.click(screen.getByRole('button', { name: /^Copy whole Review Markdown/ }));
    expect(String(writeText.mock.calls.at(-1)?.[0])).toBe(reassembled);
  });

  it('switches to the authored source without reimplementing the panel', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderRoute(contentBankStructuresPath('Clerical Ability'));
    await loaded('Clerical Ability');

    await user.click(screen.getByRole('button', { name: 'Authored Source', pressed: false }));
    await user.click(screen.getByRole('button', { name: /^Copy whole Authored Source/ }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Whole Authored Source copied —'));
    const copied = String(writeText.mock.calls[0][0]);
    expect(copied).toHaveLength(displayedTotal());
    const parsed = JSON.parse(copied) as Array<Record<string, unknown>>;
    // Source stays source: no status, no batch, no reviewer.
    for (const entry of parsed) {
      expect(Object.keys(entry).sort()).toEqual(['key', 'kind', 'source', 'sourceFile']);
    }
  });
});
