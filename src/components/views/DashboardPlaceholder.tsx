import React from 'react';
import { AppCanvas } from '../shell/AppCanvas';
import { Play, TrendingUp, BookOpen, Target, ArrowRight, CheckCircle2, AlertCircle, BarChart3, Clock, Calendar } from 'lucide-react';

interface ViewProps {
  onStartExam: () => void;
  examLevel: 'Professional' | 'Subprofessional';
  onNavigateTab?: (tab: 'dashboard' | 'practice' | 'history' | 'settings') => void;
}

export const DashboardPlaceholder: React.FC<ViewProps> = ({ onStartExam, examLevel }) => {
  const categories = examLevel === 'Professional' 
    ? [
        { name: 'Numerical Ability', score: 68, status: 'Needs Focus', items: '30 questions', color: 'bg-amber-500' },
        { name: 'Verbal Ability', score: 88, status: 'Strong', items: '40 questions', color: 'bg-emerald-500' },
        { name: 'Analytical Ability', score: 84, status: 'Strong', items: '25 questions', color: 'bg-emerald-500' },
        { name: 'General Info & Constitution', score: 75, status: 'Moderate', items: '20 questions', color: 'bg-blue-500' },
      ]
    : [
        { name: 'Numerical Ability', score: 68, status: 'Needs Focus', items: '30 questions', color: 'bg-amber-500' },
        { name: 'Verbal Ability', score: 88, status: 'Strong', items: '40 questions', color: 'bg-emerald-500' },
        { name: 'Clerical Ability', score: 82, status: 'Strong', items: '25 questions', color: 'bg-emerald-500' },
        { name: 'General Info & Constitution', score: 75, status: 'Moderate', items: '20 questions', color: 'bg-blue-500' },
      ];

  const recentAttempts = [
    {
      id: 'attempt-12',
      title: 'Full-Length Mock Exam #12',
      date: 'Aug 02, 2026',
      score: 82,
      passed: true,
      timeSpent: '2h 45m',
    },
    {
      id: 'attempt-11',
      title: 'Numerical Reasoning Focused Drill',
      date: 'Jul 31, 2026',
      score: 66,
      passed: false,
      timeSpent: '42m',
    },
    {
      id: 'attempt-10',
      title: 'Verbal Ability Focused Drill',
      date: 'Jul 29, 2026',
      score: 90,
      passed: true,
      timeSpent: '35m',
    },
  ];

  return (
    <AppCanvas
      title="Dashboard"
      primaryAction={
        <button
          onClick={onStartExam}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Start Practice Exam</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Readiness Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Overall Accuracy</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">78.4%</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Passing threshold: <span className="font-semibold text-slate-700">80.0%</span>
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Exams Completed</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">12</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Target: <span className="font-semibold text-slate-700">20 Full Mock Exams</span>
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Readiness Rating</span>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">81.5%</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              On track for CSE passing standard
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Target Exam Scope</span>
              <Target className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{examLevel}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Civil Service Examination Schedule
            </p>
          </div>
        </div>

        {/* Recommended Next Step Banner */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 uppercase tracking-wider">
              Recommended Next Action
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-2">
              Numerical Reasoning Practice Drill (15 Items)
            </h3>
            <p className="text-xs text-slate-600">
              Target your lowest scoring domain (68%). Practice word problems, percentage ratios, and sequence series.
            </p>
          </div>
          <button
            onClick={onStartExam}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <span>Launch Focused Drill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Competency Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Category Competency Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Diagnostic proficiency levels for {examLevel} Level competencies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {categories.map((cat) => (
              <div key={cat.name} className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{cat.items}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        cat.status === 'Needs Focus'
                          ? 'bg-amber-100 text-amber-800'
                          : cat.status === 'Moderate'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {cat.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Accuracy</span>
                    <span>{cat.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full transition-all duration-300`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Exam Attempt History */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Exam History</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Last 3 completed simulations and practice drills.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3">
                  {attempt.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{attempt.title}</p>
                    <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {attempt.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {attempt.timeSpent}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-sm">{attempt.score}%</span>
                    <span
                      className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        attempt.passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {attempt.passed ? 'PASSED' : 'BELOW 80%'}
                    </span>
                  </div>
                  <button
                    onClick={onStartExam}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppCanvas>
  );
};

