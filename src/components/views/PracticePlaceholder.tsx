import React from 'react';
import { AppCanvas } from '../shell/AppCanvas';
import { Play, Award, Target, CheckCircle2, FileText, Calculator, BookOpen, Brain, ShieldAlert, Sparkles, FolderCheck, Clock } from 'lucide-react';

interface ViewProps {
  onStartExam: () => void;
  examLevel: 'Professional' | 'Subprofessional';
}

export const PracticePlaceholder: React.FC<ViewProps> = ({ onStartExam, examLevel }) => {
  const isPro = examLevel === 'Professional';

  const practiceModules = isPro
    ? [
        {
          id: 'full-mock',
          title: 'Full-Length Professional Mock Exam',
          type: 'Full Simulation',
          typeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          items: '170 Items',
          duration: '3h 10m',
          description: 'Comprehensive timed simulation replicating exact CSC Professional exam subject distribution, timer pressure, and 80.00% passing threshold.',
          icon: Award,
          isFeatured: true,
        },
        {
          id: 'numerical',
          title: 'Numerical Reasoning Drill',
          type: 'Category Drill',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '50 Items',
          duration: '45 mins',
          description: 'Practice basic operations, word problems, number series, data interpretation, and statistical reasoning.',
          icon: Calculator,
          isFeatured: false,
        },
        {
          id: 'verbal',
          title: 'Verbal Ability & Grammar',
          type: 'Category Drill',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '50 Items',
          duration: '45 mins',
          description: 'Vocabulary, paragraph organization, reading comprehension, error identification, and correct usage.',
          icon: BookOpen,
          isFeatured: false,
        },
        {
          id: 'analytical',
          title: 'Analytical Reasoning',
          type: 'Category Drill',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '40 Items',
          duration: '40 mins',
          description: 'Logic puzzles, statement assumptions, venn diagrams, deductive reasoning, and data sufficiency.',
          icon: Brain,
          isFeatured: false,
        },
        {
          id: 'gen-info',
          title: 'General Information & Laws',
          type: 'Specialized Subject',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '30 Items',
          duration: '30 mins',
          description: '1987 Philippine Constitution, RA 6713 Code of Ethics, Peace & Human Rights, and Environmental Protection.',
          icon: ShieldAlert,
          isFeatured: false,
        },
      ]
    : [
        {
          id: 'full-mock-sub',
          title: 'Full-Length Subprofessional Mock Exam',
          type: 'Full Simulation',
          typeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          items: '165 Items',
          duration: '2h 30m',
          description: 'Comprehensive timed simulation replicating exact CSC Subprofessional exam subject distribution, timer pressure, and 80.00% passing threshold.',
          icon: Award,
          isFeatured: true,
        },
        {
          id: 'numerical-sub',
          title: 'Numerical Reasoning Drill',
          type: 'Category Drill',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '50 Items',
          duration: '45 mins',
          description: 'Basic mathematical operations, fractions, percentages, word problems, and series completion.',
          icon: Calculator,
          isFeatured: false,
        },
        {
          id: 'verbal-sub',
          title: 'Verbal Ability & Grammar',
          type: 'Category Drill',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '50 Items',
          duration: '45 mins',
          description: 'Spelling, vocabulary, correct grammar usage, sentence completion, and basic reading comprehension.',
          icon: BookOpen,
          isFeatured: false,
        },
        {
          id: 'clerical',
          title: 'Clerical Ability & Operations',
          type: 'Category Drill',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '35 Items',
          duration: '35 mins',
          description: 'Alphabetizing, numerical filing, office procedures, document processing, and coding accuracy.',
          icon: FolderCheck,
          isFeatured: false,
        },
        {
          id: 'gen-info-sub',
          title: 'General Information & Laws',
          type: 'Specialized Subject',
          typeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          items: '30 Items',
          duration: '30 mins',
          description: '1987 Philippine Constitution, RA 6713 Code of Ethics, Peace & Human Rights, and Environmental Laws.',
          icon: ShieldAlert,
          isFeatured: false,
        },
      ];

  return (
    <AppCanvas
      title="Practice & Exam Center"
      primaryAction={
        <button
          onClick={onStartExam}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Launch Full Exam Simulator</span>
        </button>
      }
    >
      <div className="space-y-6 sm:space-y-8 font-sans">
        
        {/* Exam Requirements & Guidelines Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">CSC {examLevel} Exam Format Overview</h3>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Target: ≥80.00% Score
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-slate-300">
            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white block">Total Items</span>
                <span>{isPro ? '170 Multiple Choice' : '165 Multiple Choice'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white block">Passing Standard</span>
                <span>80.00% General Rating</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white block">Instant Feedback</span>
                <span>Detailed Item Rationale</span>
              </div>
            </div>
          </div>
        </div>

        {/* Practice & Drill Modules Grid */}
        <div className="space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Available Practice Modules ({examLevel} Scope)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {practiceModules.map((mod) => {
              const IconComp = mod.icon;
              return (
                <div
                  key={mod.id}
                  className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    mod.isFeatured
                      ? 'bg-emerald-950/5 border-emerald-200/80 hover:border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${mod.typeColor}`}>
                        {mod.type}
                      </span>
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          {mod.items}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {mod.duration}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        mod.isFeatured ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-snug">{mod.title}</h4>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <button
                    onClick={onStartExam}
                    className={`w-full py-2.5 px-4 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer text-center inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      mod.isFeatured
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Practice Session</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AppCanvas>
  );
};
