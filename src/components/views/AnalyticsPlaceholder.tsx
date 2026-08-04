import React from 'react';
import { AppCanvas } from '../shell/AppCanvas';
import { Download, Award, CheckCircle2, XCircle, RotateCcw, Clock, Target, Calendar, BarChart3 } from 'lucide-react';

interface AttemptRecord {
  id: string;
  title: string;
  examLevel: 'Professional' | 'Subprofessional';
  date: string;
  duration: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
}

interface AnalyticsProps {
  examLevel: 'Professional' | 'Subprofessional';
  onStartExam?: () => void;
}

export const AnalyticsPlaceholder: React.FC<AnalyticsProps> = ({ examLevel, onStartExam }) => {
  const attempts: AttemptRecord[] = examLevel === 'Professional' 
    ? [
        {
          id: 'att-1',
          title: 'Full-Length CSE Professional Mock #3',
          examLevel: 'Professional',
          date: 'Aug 02, 2026',
          duration: '2h 52m',
          score: 142,
          totalQuestions: 170,
          percentage: 84,
          isPassed: true,
        },
        {
          id: 'att-2',
          title: 'Full-Length CSE Professional Mock #2',
          examLevel: 'Professional',
          date: 'Jul 26, 2026',
          duration: '3h 05m',
          score: 131,
          totalQuestions: 170,
          percentage: 77,
          isPassed: false,
        },
        {
          id: 'att-3',
          title: 'Full-Length CSE Professional Mock #1',
          examLevel: 'Professional',
          date: 'Jul 18, 2026',
          duration: '2h 58m',
          score: 145,
          totalQuestions: 170,
          percentage: 85,
          isPassed: true,
        },
        {
          id: 'att-4',
          title: 'Diagnostic Starter Assessment',
          examLevel: 'Professional',
          date: 'Jul 10, 2026',
          duration: '3h 08m',
          score: 138,
          totalQuestions: 170,
          percentage: 81,
          isPassed: true,
        },
      ]
    : [
        {
          id: 'att-sub-1',
          title: 'Full-Length CSE Subprofessional Mock #2',
          examLevel: 'Subprofessional',
          date: 'Aug 01, 2026',
          duration: '2h 25m',
          score: 139,
          totalQuestions: 165,
          percentage: 84,
          isPassed: true,
        },
        {
          id: 'att-sub-2',
          title: 'Full-Length CSE Subprofessional Mock #1',
          examLevel: 'Subprofessional',
          date: 'Jul 22, 2026',
          duration: '2h 35m',
          score: 128,
          totalQuestions: 165,
          percentage: 78,
          isPassed: false,
        },
      ];

  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.isPassed).length;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const avgPercentage = totalAttempts > 0 ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts) : 0;

  const subjectCompetencies = examLevel === 'Professional'
    ? [
        { name: 'Numerical Reasoning', accuracy: 82, count: '42/50 items' },
        { name: 'Verbal Ability', accuracy: 78, count: '39/50 items' },
        { name: 'Analytical Reasoning', accuracy: 85, count: '34/40 items' },
        { name: 'General Information & Constitution', accuracy: 88, count: '26/30 items' },
      ]
    : [
        { name: 'Numerical Reasoning', accuracy: 80, count: '40/50 items' },
        { name: 'Verbal Ability', accuracy: 82, count: '41/50 items' },
        { name: 'Clerical Ability', accuracy: 86, count: '30/35 items' },
        { name: 'General Information & Constitution', accuracy: 90, count: '27/30 items' },
      ];

  const escapeCsvCell = (val: string | number | boolean): string => {
    const str = String(val ?? '');
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExportCSV = () => {
    const headers = ['Attempt ID', 'Exam Title', 'Exam Level', 'Date', 'Duration', 'Score', 'Total Questions', 'Percentage', 'Result'];
    const rows = attempts.map((a) => [
      escapeCsvCell(a.id),
      escapeCsvCell(a.title),
      escapeCsvCell(a.examLevel),
      escapeCsvCell(a.date),
      escapeCsvCell(a.duration),
      escapeCsvCell(a.score),
      escapeCsvCell(a.totalQuestions),
      escapeCsvCell(`${a.percentage}%`),
      escapeCsvCell(a.isPassed ? 'PASSED' : 'FAILED'),
    ]);

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AceCSE_Exam_History_${examLevel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppCanvas
      title="Exam History & Analytics"
      primaryAction={
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Download className="w-4 h-4" />
          <span>Export Attempt History</span>
        </button>
      }
    >
      <div className="space-y-6 sm:space-y-8 font-sans">
        
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Attempts</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalAttempts}</div>
            <span className="text-[11px] text-slate-500 block">Completed sessions</span>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Rating</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{avgPercentage}%</div>
            <span className="text-[11px] text-emerald-600 font-semibold block">CSC Target: ≥80%</span>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">{passRate}%</div>
            <span className="text-[11px] text-slate-500 block">{passedAttempts} of {totalAttempts} passed</span>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Scope</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">{examLevel}</div>
            <span className="text-[11px] text-slate-500 block">{examLevel === 'Professional' ? '170 items' : '165 items'}</span>
          </div>
        </div>

        {/* Subject Accuracy Diagnostic Breakdown */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Subject Competency Accuracy</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Domain Diagnostics</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {subjectCompetencies.map((subj) => (
              <div key={subj.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-800">{subj.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{subj.count}</span>
                    <span className={`font-mono font-bold text-xs sm:text-sm ${
                      subj.accuracy >= 80 ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {subj.accuracy}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      subj.accuracy >= 80 ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${subj.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attempt History Table / Cards */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Attempt History Log</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500 font-mono">{attempts.length} Recorded Attempts</span>
          </div>

          <div className="space-y-3">
            {attempts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
                No recorded exam attempts yet.
              </div>
            ) : (
              attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">{attempt.title}</h4>
                      {attempt.isPassed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PASSED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3 text-rose-600" /> FAILED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {attempt.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {attempt.duration}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        Score: {attempt.score} / {attempt.totalQuestions} ({attempt.percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <button
                      onClick={onStartExam}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Exam</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </AppCanvas>
  );
};
