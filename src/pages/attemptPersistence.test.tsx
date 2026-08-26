// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { EXAM_ROUTE } from '@/navigation/appRoutes';
import { contentBankPracticePath } from '@/lib/contentBankPractice';
import type { ContentBankPracticeLaunch } from '@/lib/contentBankPractice';
import { ExamPage, type ExamLaunchRequest } from './ExamPage';

const saveAttemptMock = vi.hoisted(() =>
  vi.fn((_uid: string, _attempt: unknown) => Promise.resolve())
);

vi.mock('@/services/attempts', () => ({
  saveAttempt: (uid: string, attempt: unknown) => saveAttemptMock(uid, attempt),
  subscribeToAttempts: () => () => undefined,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'learner-uid', displayName: null, email: null, isAnonymous: false },
    initializing: false,
    signingOut: false,
    hasPasswordProvider: false,
    isAdmin: false,
    adminResolved: true,
  }),
}));

/** Two real Clerical Ability items, so the run is short and deterministic. */
const QUESTION_IDS = ['cler-0020', 'cler-0021'];
const SLOW = 20_000;

function launchOf(internalReview: boolean): ExamLaunchRequest {
  return {
    kind: 'practice',
    examLevel: 'Subprofessional',
    questionCount: QUESTION_IDS.length,
    questionIds: [...QUESTION_IDS],
    ...(internalReview ? { internalReview: true } : {}),
  };
}

function renderExam(launch: ExamLaunchRequest) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[{ pathname: EXAM_ROUTE, state: { launch } }]}>
        <Routes>
          <Route path={EXAM_ROUTE} element={<ExamPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function renderExamFromUrl(launch: ContentBankPracticeLaunch) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[contentBankPracticePath(launch)]}>
        <Routes>
          <Route path={EXAM_ROUTE} element={<ExamPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

/** Runs the session to its results screen: answer nothing, submit, confirm. */
async function submitSession(user: ReturnType<typeof userEvent.setup>) {
  // The booklet renders the submit control twice (desktop header + mobile
  // footer); either one opens the same modal.
  const submit = await waitFor(
    () => screen.getAllByRole('button', { name: /^Submit practice\./i })[0],
    { timeout: SLOW }
  );
  await user.click(submit);
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Submit Practice' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

beforeEach(() => {
  saveAttemptMock.mockClear();
  // jsdom implements neither of these, and the booklet scrolls the current
  // item into view on mount — an unstubbed throw inside that passive effect
  // unmounts the whole tree.
  Element.prototype.scrollIntoView = vi.fn();
  // @ts-expect-error -- minimal IntersectionObserver stand-in for jsdom
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // ThemeProvider resolves 'system' through matchMedia, which jsdom lacks.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/**
 * The surviving half of the deleted tester machinery.
 *
 * `internalReview` is the only flag that suppresses an attempt write, it is set
 * only by the Content Bank Batch Workspace, and it must never leak into an
 * ordinary learner run. Both directions are asserted here, because a test for
 * only the suppression would still pass if persistence broke entirely.
 */
describe('attempt persistence', () => {
  it('records a normal learner practice run', async () => {
    const user = userEvent.setup();
    renderExam(launchOf(false));

    await submitSession(user);

    await waitFor(() => expect(saveAttemptMock).toHaveBeenCalledTimes(1));
    const [uid, attempt] = saveAttemptMock.mock.calls[0];
    expect(uid).toBe('learner-uid');
    const recorded = attempt as { examLevel: string; mode: string };
    expect(recorded.mode).toBe('practice');
    expect(recorded.examLevel).toBe('Subprofessional');
  }, SLOW);

  it('accepts a new-tab Content Bank URL handoff and never writes the internal review to attempt history', async () => {
    const user = userEvent.setup();
    renderExamFromUrl(launchOf(true) as ContentBankPracticeLaunch);

    await submitSession(user);

    await waitFor(
      () =>
        expect(
          screen.getByRole('heading', {
            name: 'Civil Service Examination — Subprofessional Level',
            level: 1,
          })
        ).toBeInTheDocument(),
      { timeout: SLOW }
    );
    expect(saveAttemptMock).not.toHaveBeenCalled();
  }, SLOW);

  it('grades an internal review run but never writes it to attempt history', async () => {
    const user = userEvent.setup();
    renderExam(launchOf(true));

    await submitSession(user);

    // Graded and reviewable — the results screen is reached either way.
    await waitFor(
      () =>
        expect(
          screen.getByRole('heading', {
            name: 'Civil Service Examination — Subprofessional Level',
            level: 1,
          })
        ).toBeInTheDocument(),
      { timeout: SLOW }
    );
    expect(saveAttemptMock).not.toHaveBeenCalled();
  }, SLOW);
});
