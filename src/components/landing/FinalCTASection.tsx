import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface FinalCTASectionProps {
  onStartPracticing: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onStartPracticing }) => {
  return (
    <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-2xl p-8 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden shadow-lg border border-slate-800">
          
          <div className="max-w-2xl mx-auto relative z-10">
            
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">
              Ready to Ace your Civil Service Exam?
            </h2>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
              Start practicing today with full-length timed mock exams, comprehensive step-by-step rationales, and category performance analytics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={onStartPracticing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Professional & Subprofessional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant Answer Feedback</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% Free Practice Mode</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
