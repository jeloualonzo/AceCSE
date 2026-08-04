import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  PlayCircle,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useAttempts } from '@/hooks/useAttempts';
import { computeStats } from '@/lib/analytics';
import { simulationOptions } from '@/lib/examEngine';
import { loadActiveSession } from '@/lib/sessionStorage';
import { formatDate, formatDuration } from '@/lib/time';
import { useAppContext } from '@/components/shell/AppLayout';
import type { ExamLaunchRequest } from '@/pages/ExamPage';

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}> = ({ icon, label, value, hint }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 truncate">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { examLevel } = useAppContext();
  const { attempts, loading } = useAttempts();
  const stats = useMemo(() => computeStats(attempts), [attempts]);
  const activeSession = useMemo(() => {
    const saved = loadActiveSession();
    return saved && (saved.deadlineAt === null || saved.deadlineAt > Date.now()) ? saved : null;
  }, []);

  const bestSimulation = useMemo(
    () => simulationOptions(examLevel).filter((o) => o.available).pop() ?? null,
    [examLevel]
  );

  const launchSimulation = () => {
    if (!bestSimulation) return;
    const launch: ExamLaunchRequest = {
      kind: 'simulation',
      examLevel,
      questionCount: bestSimulation.questionCount,
    };
    navigate('/app/exam', { state: { launch } });
  };

  const recentAttempts = attempts.slice(0, 5);
  const hasData = attempts.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Preparing for the {examLevel} level examination.
        </p>
      </div>

      {activeSession && (
        <Link
          to="/app/exam"
          className="block bg-slate-900 text-white rounded-xl p-4 sm:p-5 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <PlayCircle className="w-6 h-6 text-emerald-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Resume your in-progress session</p>
                <p className="text-xs text-slate-400 truncate">
                  {activeSession.config.mode === 'simulation' ? 'Simulation' : 'Practice'} ·{' '}
                  {Object.keys(activeSession.answers).length} of{' '}
                  {activeSession.questionIds.length} answered
                  {activeSession.deadlineAt && ' · timer still running'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={launchSimulation}
          disabled={!bestSimulation}
          className="text-left bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl p-5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        >
          <ClipboardList className="w-6 h-6 mb-3" aria-hidden="true" />
          <p className="font-bold text-sm sm:text-base">Start Timed Simulation</p>
          <p className="text-xs text-emerald-100 mt-1">
            {bestSimulation
              ? `${bestSimulation.questionCount} questions · ${formatDuration(bestSimulation.durationSeconds)} · CSC proportions`
              : 'Not enough validated questions yet'}
          </p>
        </button>
        <Link
          to="/app/practice"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <BookOpen className="w-6 h-6 mb-3 text-emerald-600" aria-hidden="true" />
          <p className="font-bold text-sm sm:text-base text-slate-900">Subject Practice</p>
          <p className="text-xs text-slate-500 mt-1">
            Untimed drills with instant explanations, by subject.
          </p>
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400" role="status">
          Loading your progress…
        </div>
      ) : hasData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={<ClipboardList className="w-4.5 h-4.5" aria-hidden="true" />}
              label="Total Attempts"
              value={String(stats.totalAttempts)}
              hint={`${stats.simulationCount} simulations · ${stats.practiceCount} practice`}
            />
            <StatCard
              icon={<Target className="w-4.5 h-4.5" aria-hidden="true" />}
              label="Average Score"
              value={stats.averagePercentage !== null ? `${stats.averagePercentage}%` : '—'}
              hint={stats.bestPercentage !== null ? `Best: ${stats.bestPercentage}%` : undefined}
            />
            <StatCard
              icon={<TrendingUp className="w-4.5 h-4.5" aria-hidden="true" />}
              label="Readiness"
              value={stats.readinessEstimate !== null ? `${stats.readinessEstimate}%` : '—'}
              hint={
                stats.readinessEstimate !== null
                  ? 'Average of recent simulations'
                  : 'Complete a simulation to estimate'
              }
            />
            <StatCard
              icon={<Clock className="w-4.5 h-4.5" aria-hidden="true" />}
              label="Time Practiced"
              value={formatDuration(stats.totalTimeSeconds)}
              hint={`${stats.totalQuestionsAnswered} questions answered`}
            />
          </div>

          {/* Subject mastery — real aggregates */}
          {stats.subjectMastery.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Subject Mastery
              </h2>
              <div className="space-y-3">
                {stats.subjectMastery.map((subject) => (
                  <div key={subject.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-slate-800">{subject.subject}</span>
                      <span className="font-mono font-bold text-slate-600">
                        {subject.correctItems}/{subject.totalItems} ({subject.percentage}%)
                      </span>
                    </div>
                    <div
                      className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={subject.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${subject.subject} mastery`}
                    >
                      <div
                        className={`h-full ${
                          subject.percentage >= 80
                            ? 'bg-emerald-500'
                            : subject.percentage >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${subject.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {stats.weakestSubject && stats.subjectMastery.length > 1 && (
                <p className="text-xs text-slate-500 pt-1">
                  Focus suggestion: <strong>{stats.weakestSubject.subject}</strong> is currently
                  your weakest area at {stats.weakestSubject.percentage}%.
                </p>
              )}
            </div>
          )}

          {/* Recent attempts — real history */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Recent Attempts
              </h2>
              <Link
                to="/app/history"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:underline"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentAttempts.map((attempt) => (
                <li key={attempt.id} className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {attempt.mode === 'simulation' ? 'Timed Simulation' : 'Subject Practice'} ·{' '}
                      {attempt.examLevel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(attempt.completedAt)} · {attempt.questionCount} questions ·{' '}
                      {formatDuration(attempt.durationSeconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-sm text-slate-800">
                      {attempt.percentage.toFixed(1)}%
                    </span>
                    {attempt.mode === 'simulation' &&
                      (attempt.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Passed" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" aria-label="Did not pass" />
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900 mb-1">No attempts yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your scores, subject mastery, and readiness estimate will appear here after your first
            simulation or practice session. Everything shown is computed from your real results —
            nothing is invented.
          </p>
        </div>
      )}
    </div>
  );
};
