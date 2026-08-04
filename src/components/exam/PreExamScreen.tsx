import React, { useState } from 'react';
import { Play, ArrowLeft, Clock, FileText, Target, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export interface PreExamScreenProps {
  examLevel: 'Professional' | 'Subprofessional';
  examTitle?: string;
  totalQuestions?: number;
  timeLimitMinutes?: number;
  onStartExam: () => void;
  onBackToDashboard: () => void;
}

export const PreExamScreen: React.FC<PreExamScreenProps> = ({
  examLevel,
  examTitle = `Civil Service Examination — ${examLevel} Scope`,
  totalQuestions = examLevel === 'Professional' ? 170 : 165,
  timeLimitMinutes = examLevel === 'Professional' ? 190 : 160,
  onStartExam,
  onBackToDashboard,
}) => {
  const [isCoverageOpen, setIsCoverageOpen] = useState(false);

  const hours = Math.floor(timeLimitMinutes / 60);
  const minutes = timeLimitMinutes % 60;
  const timeFormatted = `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;

  const sections = examLevel === 'Professional' ? [
    { title: 'Numerical Reasoning', items: 40, desc: 'Basic operations, word problems, ratios, percentages, and data interpretation.' },
    { title: 'Analytical Reasoning', items: 40, desc: 'Word association, identifying assumptions, logic problems, and venn diagrams.' },
    { title: 'Verbal Ability', items: 60, desc: 'Grammar, vocabulary, paragraph organization, reading comprehension, and spelling.' },
    { title: 'General Info & Constitution', items: 30, desc: '1987 Philippine Constitution, R.A. 6713, peace and human rights, environmental issues.' },
  ] : [
    { title: 'Numerical Reasoning', items: 35, desc: 'Basic math operations, word problems, percentages, and numerical sequences.' },
    { title: 'Clerical Operations', items: 40, desc: 'Filing procedures, alphabetical sorting, coding, and office proofreading.' },
    { title: 'Verbal Ability', items: 60, desc: 'Grammar, vocabulary, paragraph organization, and reading comprehension.' },
    { title: 'General Info & Constitution', items: 30, desc: '1987 Philippine Constitution, R.A. 6713, and civil service ethics.' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      
      {/* Top Back Navigation */}
      <div className="mb-6">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100/80 -ml-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Pre-Exam Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Header & Essential Metrics */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50/80 to-white">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{examLevel} Level</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Official Syllabus Match
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {examTitle}
          </h1>

          {/* Four Primary Exam Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-200/80">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Exam Scope</span>
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">{examLevel}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Questions</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{totalQuestions} Items</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Time Limit</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{timeFormatted}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                <Target className="w-4 h-4 shrink-0" />
                <span>Passing Score</span>
              </div>
              <p className="text-sm font-bold text-slate-900">80.00%</p>
            </div>
          </div>
        </div>

        {/* Collapsible Syllabus Section */}
        <div className="border-t border-b border-slate-200/80">
          <button
            onClick={() => setIsCoverageOpen(!isCoverageOpen)}
            className="w-full px-6 sm:px-8 py-4 bg-slate-50/50 hover:bg-slate-100/70 transition-colors flex items-center justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-expanded={isCoverageOpen}
            aria-controls="exam-coverage-panel"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                View Exam Subject Coverage ({sections.length} Competencies)
              </span>
            </div>
            {isCoverageOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {isCoverageOpen && (
            <div id="exam-coverage-panel" className="p-6 sm:p-8 bg-white border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sections.map((sec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-slate-900">{sec.title}</h3>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        {sec.items} items
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {sec.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rules & Checklist Section */}
        <div className="p-6 sm:p-8 bg-white">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Exam Checklist & Rules
          </h2>

          <div className="space-y-3.5 text-xs sm:text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-900">Continuous Timer:</strong> Timer runs continuously upon starting. If you exit or navigate away, your progress is automatically saved.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-900">No Right-Minus-Wrong Penalty:</strong> Incorrect answers carry no deduction. Always attempt every question before time expires.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-900">Automatic Submission:</strong> Automatic submission occurs as soon as the time limit expires.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-900">Real-Time Auto-Save:</strong> Your answer selections and flagged items are continuously saved in real time.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-900">Instant Answer Key & Solutions:</strong> Diagnostic score results and step-by-step solution breakdowns are presented immediately upon completion.
              </span>
            </div>
          </div>

          {/* Primary Action Row */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={onBackToDashboard}
              className="w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Cancel & Exit
            </button>
            <button
              onClick={onStartExam}
              className="w-full sm:w-auto px-8 py-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <Play className="w-4 h-4 fill-white shrink-0" />
              <span>Start Exam</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

