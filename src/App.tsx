import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { RedirectWhenAuthed } from '@/components/auth/RedirectWhenAuthed';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AppLayout } from '@/components/shell/AppLayout';
import { AdminLayout } from '@/components/shell/AdminLayout';
import {
  ADMIN_BASE,
  ADMIN_LOGIN_ROUTE,
  CONTENT_BANK_SEGMENT,
  LEARNER_HOME_ROUTE,
} from '@/navigation/appRoutes';
import { CONTENT_BANK_BASE, CONTENT_BANK_BATCH_SEGMENT } from '@/navigation/contentBankRoutes';

/**
 * Route-level code splitting: each surface is its own chunk, so a visitor
 * downloads only what they navigate to. The landing page in particular ships
 * without the app shell, the exam engine, or any question content.
 */
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const SimulationPage = lazy(() =>
  import('@/pages/SimulationPage').then((m) => ({ default: m.SimulationPage }))
);
const PracticePage = lazy(() =>
  import('@/pages/PracticePage').then((m) => ({ default: m.PracticePage }))
);
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ExamPage = lazy(() => import('@/pages/ExamPage').then((m) => ({ default: m.ExamPage })));

/** Admin app chunks — never fetched by a learner, who has no link to them. */
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const ContentBankPage = lazy(() =>
  import('@/pages/ContentBankPage').then((m) => ({ default: m.ContentBankPage }))
);
const ContentBankSubjectPage = lazy(() => import('@/pages/ContentBankSubjectPage'));
const ContentBankFamilyPage = lazy(() => import('@/pages/ContentBankFamilyPage'));
const ContentBankBatchPage = lazy(() => import('@/pages/ContentBankBatchPage'));
const ContentBankReviewPage = lazy(() => import('@/pages/ContentBankReviewPage'));

/**
 * Kept as the long-standing name for the Content Bank entry point. The path
 * itself lives in `src/navigation/contentBankRoutes.ts` with the rest of the
 * Content Bank URLs, so there is exactly one place it is written down.
 */
export const CONTENT_BANK_ROUTE = CONTENT_BANK_BASE;

/** Start each page at the top; preserve scroll only for in-page hash links. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * AceCSE is two applications behind one sign-in.
 *
 * `/app/*` is the learner app: dashboard, simulation, practice, history,
 * settings. `/admin/*` is the admin app, with its own shell, navigation, and
 * dashboard — not the learner shell with extra links. The only crossing between
 * them is deliberate and one-way: an admin can open the learner app to test the
 * real learner experience, and nothing in the learner app points at `/admin`.
 *
 * Both trees guard on their parent route, so a page added to either later cannot
 * ship ungated by omission.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ScrollToTop />
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              {/* Guest-only surfaces: signed-in users go straight to their app. */}
              <Route
                path="/"
                element={
                  <RedirectWhenAuthed>
                    <LandingPage />
                  </RedirectWhenAuthed>
                }
              />
              <Route
                path="/auth"
                element={
                  <RedirectWhenAuthed>
                    <AuthPage />
                  </RedirectWhenAuthed>
                }
              />

              {/*
                Admin sign-in. Guest-only like the others, but its fallback is the
                admin app: someone who signs in here meant to go there. The claim
                still decides what they can reach — `RequireAdmin` below.
              */}
              <Route
                path={ADMIN_LOGIN_ROUTE}
                element={
                  <RedirectWhenAuthed fallback={ADMIN_BASE}>
                    <AdminLoginPage />
                  </RedirectWhenAuthed>
                }
              />

              {/*
                Focus mode: no shell chrome around the exam. One engine, one exam
                UI. It sits outside `AppLayout` on purpose, so nothing on the exam
                surface can read a shell context — a session carries its own level
                and configuration and nothing else.
              */}
              <Route
                path="/app/exam"
                element={
                  <RequireAuth>
                    <ExamPage />
                  </RequireAuth>
                }
              />

              {/* ---- Learner app ---- */}
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to={LEARNER_HOME_ROUTE} replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="simulation" element={<SimulationPage />} />
                <Route path="practice" element={<PracticePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/*
                ---- Admin app ----

                `RequireAdmin` sits on the shell route, so every admin surface —
                including any added later — is gated by construction. It is a UI
                gate over the ID token claim; `firestore.rules` enforces the same
                claim server-side (docs/admin/ADMIN_ACCESS.md).
              */}
              <Route
                path={ADMIN_BASE}
                element={
                  <RequireAdmin signInPath={ADMIN_LOGIN_ROUTE}>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<AdminDashboardPage />} />

                {/*
                  The static `batch` segment is listed before the two-segment
                  subject/family route for readability only — React Router ranks
                  a static segment above a dynamic one regardless of order, which
                  `contentBankRoutes.test.ts` pins down.
                */}
                <Route path={CONTENT_BANK_SEGMENT}>
                  <Route index element={<ContentBankPage />} />
                  <Route
                    path={`${CONTENT_BANK_BATCH_SEGMENT}/:batchId`}
                    element={<ContentBankBatchPage />}
                  />
                  <Route
                    path={`${CONTENT_BANK_BATCH_SEGMENT}/:batchId/review`}
                    element={<ContentBankReviewPage />}
                  />
                  <Route path=":subjectSlug" element={<ContentBankSubjectPage />} />
                  <Route path=":subjectSlug/:familySlug" element={<ContentBankFamilyPage />} />
                </Route>

                {/* An unknown admin path stays in the admin app. */}
                <Route path="*" element={<Navigate to={ADMIN_BASE} replace />} />
              </Route>

              {/* Legacy URL: the Content Bank used to live in the learner tree. */}
              <Route
                path={`/app/${CONTENT_BANK_SEGMENT}/*`}
                element={<Navigate to={CONTENT_BANK_BASE} replace />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
