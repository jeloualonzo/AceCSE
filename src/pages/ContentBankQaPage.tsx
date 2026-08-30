import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { BookletExamLayout } from '@/components/shell/BookletExamLayout';
import { ResultsScreen } from '@/components/exam/ResultsScreen';
import { SubmitConfirmDialog } from '@/components/exam/SubmitConfirmDialog';
import { ContentBankBreadcrumbs } from '@/components/contentBank/ContentBankBreadcrumbs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePassiveTiming } from '@/hooks/usePassiveTiming';
import { gradeSession } from '@/lib/grading';
import { formatElapsedMs } from '@/lib/time';
import { CONTENT_BANK_BASE } from '@/navigation/contentBankRoutes';
import {
  QA_FIXTURES,
  buildQaFixtureCatalog,
  buildQaFixtureSession,
  getQaFixture,
  type QaFixture,
} from '@/dev/qaFixtures';
import type { ActiveFocus, Attempt, OptionId } from '@/types';

/**
 * Development QA fixture workspace.
 *
 * The point of this page is that it renders NOTHING of its own below the
 * control strip. A rendering problem that only shows up in the real learner
 * layout — the `√0.0081` that drew correctly inside an explanation and as a
 * bare Unicode glyph in the stem — is invisible in a bespoke preview card, so
 * there is no preview card here. The fixture is handed to the same
 * `BookletExamLayout` that `ExamPage` renders for Practice and the same
 * `ResultsScreen` it renders for results, which carry the real `QuestionCard`,
 * `ExplanationPanel`, `StructuredExplanationRenderer`, and `MathText` with
 * them. If something looks wrong here, it looks wrong to a learner.
 *
 * Nothing about the fixture is special-cased in any of those components. The
 * only thing this page adds is the labeled indicator above the learner surface.
 *
 * Not learner data: the session and the graded attempt live in component state
 * for as long as the page is mounted. This module imports no persistence
 * function at all — no `saveAttempt`, no `saveActiveSession`, no Firestore, no
 * localStorage — and the session carries `internalReview` for the same reason
 * a Content Bank review run does.
 *
 * The workspace is generic. Fixtures come from `src/dev/qaFixtures.ts` and
 * describe themselves with a category (math, tables, images, charts, graphs,
 * geometry, other); this page reads the metadata and never the category.
 */

type QaView = 'practice' | 'results';

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-semibold text-slate-900 dark:text-white ${mono ? 'break-all font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: QaView;
  onChange: (next: QaView) => void;
}) {
  const options: { id: QaView; label: string }[] = [
    { id: 'practice', label: 'Practice' },
    { id: 'results', label: 'Results' },
  ];
  return (
    <div
      role="group"
      aria-label="Development QA view"
      className="inline-flex gap-1 rounded-lg border border-slate-300 p-1 dark:border-slate-700"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={view === option.id}
          onClick={() => onChange(option.id)}
          className={`inline-flex min-h-11 items-center rounded-lg px-4 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            view === option.id
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FixtureWorkspace({
  fixture,
  onSelectFixture,
}: {
  fixture: QaFixture;
  onSelectFixture: (fixtureId: string) => void;
}) {
  const navigate = useNavigate();
  const catalog = useMemo(() => buildQaFixtureCatalog(fixture), [fixture]);
  const [session, setSession] = useState(() => buildQaFixtureSession(fixture, Date.now()));
  const [view, setView] = useState<QaView>('practice');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [activeFocus, setActiveFocus] = useState<ActiveFocus>(null);

  // The real Practice stopwatch, with no `onPersist` — it counts, it saves nothing.
  const timing = usePassiveTiming({
    sessionKey: session.id,
    activeFocus,
    enabled: view === 'practice',
    showStopwatch: true,
  });

  const handleSelectOption = useCallback((questionId: string, optionId: OptionId) => {
    setSession((previous) => ({
      ...previous,
      answers: { ...previous.answers, [questionId]: optionId },
    }));
  }, []);

  /** Graded in memory, from the same pure grader the learner run uses. */
  const showResults = useCallback(() => {
    setAttempt(gradeSession(session, catalog.questions));
    setIsSubmitOpen(false);
    setView('results');
  }, [catalog.questions, session]);

  const restart = useCallback(() => {
    setSession(buildQaFixtureSession(fixture, Date.now()));
    setAttempt(null);
    setActiveFocus(null);
    setView('practice');
  }, [fixture]);

  const changeView = useCallback(
    (next: QaView) => {
      if (next === 'results') {
        showResults();
        return;
      }
      setIsSubmitOpen(false);
      setView('practice');
    },
    [showResults],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <ContentBankBreadcrumbs
        trail={[{ label: 'Content Bank', to: CONTENT_BANK_BASE }, { label: 'Development QA' }]}
      />

      {/*
        The development QA indicator. It is deliberately the only thing on this
        page that is not a learner component, and it sits outside the learner
        surface below rather than inside it.
      */}
      <header
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        data-testid="qa-indicator"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <FlaskConical className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Development QA
          </h1>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">
            Not recorded
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {fixture.category}
          </span>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <Field label="Fixture" value={fixture.id} mono />
          <Field label="Source" value={fixture.sourcePath} mono />
          <Field label="Questions" value={String(fixture.questions.length)} />
        </dl>

        <p className="mt-4 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
          {fixture.description}
        </p>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
          This run is graded in memory only. It is not an attempt: nothing here writes to your
          history, your analytics, Firestore, or local storage.
        </p>

        {QA_FIXTURES.length > 1 && (
          <div
            role="group"
            aria-label="Fixture"
            className="mt-4 flex flex-wrap gap-2"
          >
            {QA_FIXTURES.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === fixture.id}
                onClick={() => onSelectFixture(candidate.id)}
                className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  candidate.id === fixture.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {candidate.title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ViewToggle view={view} onChange={changeView} />
          <button
            type="button"
            onClick={restart}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset answers
          </button>
        </div>
      </header>

      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Real learner {view === 'practice' ? 'Practice' : 'Results'} UI below — unmodified
      </p>

      {/*
        `BookletExamLayout` is `fixed inset-0` because Practice really is a
        full-viewport focus mode. `transform-gpu` (a `translateZ(0)`) makes this
        wrapper the containing block for that fixed positioning, so the real
        layout renders at its real size inside the workspace instead of covering
        the admin shell and this page's own indicator. The learner component is
        untouched; only the box it resolves against changes.
      */}
      <div
        data-testid="qa-learner-surface"
        className="relative isolate h-[calc(100vh-6rem)] min-h-[36rem] transform-gpu overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-700"
      >
        {view === 'practice' ? (
          <BookletExamLayout
            key={session.id}
            examLevel={session.config.examLevel}
            timeRemainingFormatted={formatElapsedMs(timing.elapsedMs)}
            onExitExam={() => navigate(CONTENT_BANK_BASE)}
            onSubmitExam={() => setIsSubmitOpen(true)}
            exitLabel="Exit Practice"
            session={session}
            getGroup={catalog.getGroup}
            questionIndex={catalog.questions}
            onSelectOption={handleSelectOption}
            onActiveFocusChange={setActiveFocus}
          />
        ) : attempt ? (
          <ResultsScreen
            attempt={attempt}
            questionIndex={catalog.questions}
            onRetake={restart}
            onReturnToDashboard={() => navigate(CONTENT_BANK_BASE)}
          />
        ) : null}
      </div>

      {isSubmitOpen && (
        <SubmitConfirmDialog
          isPractice
          totalQuestions={session.questionIds.length}
          answeredCount={Object.keys(session.answers).length}
          onCancel={() => setIsSubmitOpen(false)}
          onConfirm={showResults}
        />
      )}
    </div>
  );
}

export default function ContentBankQaPage() {
  const [fixtureId, setFixtureId] = useState(() => QA_FIXTURES[0]?.id ?? '');
  useDocumentTitle('Development QA — Content Bank');
  const fixture = getQaFixture(fixtureId);

  if (!fixture) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p role="status" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          No QA fixtures are registered.
        </p>
      </div>
    );
  }

  return <FixtureWorkspace key={fixture.id} fixture={fixture} onSelectFixture={setFixtureId} />;
}
