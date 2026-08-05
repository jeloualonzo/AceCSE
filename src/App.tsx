import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RedirectWhenAuthed } from '@/components/auth/RedirectWhenAuthed';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AppLayout } from '@/components/shell/AppLayout';

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

/** Start each page at the top; preserve scroll only for in-page hash links. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ScrollToTop />
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              {/* Guest-only surfaces: signed-in users go straight to the app. */}
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

              {/* Focus mode: no shell chrome around the exam. */}
              <Route
                path="/app/exam"
                element={
                  <RequireAuth>
                    <ExamPage />
                  </RequireAuth>
                }
              />

              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="simulation" element={<SimulationPage />} />
                <Route path="practice" element={<PracticePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
