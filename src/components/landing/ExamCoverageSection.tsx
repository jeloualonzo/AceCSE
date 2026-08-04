import React from 'react';
import { SUBJECT_COVERAGE } from '../../data/landing';
import { Check, ShieldCheck } from 'lucide-react';

export const ExamCoverageSection: React.FC = () => {
  return (
    <section id="coverage" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Complete Civil Service Exam Coverage
          </h2>
          <p className="text-slate-600 mt-3 text-base sm:text-lg">
            Structured subject modules matching official Civil Service Commission scope and item specifications.
          </p>
        </div>

        {/* Level Summary Callout */}
        <div className="max-w-4xl mx-auto mb-10 p-4 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Professional Level: </span>
              <span>170 items, 3 hours 10 minutes, includes Analytical Reasoning</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-4">
            <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></div>
            <div>
              <span className="font-bold text-slate-900">Subprofessional Level: </span>
              <span>165 items, 2 hours 40 minutes, includes Clerical Operations</span>
            </div>
          </div>
        </div>

        {/* Clean Subject Table / List Layout without Card-in-Card nesting */}
        <div className="max-w-5xl mx-auto bg-white rounded-xl border border-slate-300 overflow-hidden divide-y divide-slate-200">
          {SUBJECT_COVERAGE.map((subject) => (
            <div key={subject.id} className="p-6 sm:p-8 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                
                {/* Left: Info */}
                <div className="lg:w-1/2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {subject.code}
                    </span>
                    {subject.levels.map((lvl) => (
                      <span
                        key={lvl}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                          lvl === 'Professional'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {lvl}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                    {subject.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">
                    {subject.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">{subject.itemCount}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">{subject.weight}</span>
                  </div>
                </div>

                {/* Right: Topics cleanly displayed directly */}
                <div className="lg:w-1/2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5">
                    Tested Competencies & Topics
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    {subject.topics.map((topic, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
