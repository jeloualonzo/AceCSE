import React from 'react';
import { ArrowRight, Shield, Clock, BookOpen } from 'lucide-react';

interface HeroSectionProps {
  onStartPracticing: () => void;
  onTryQuestion: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartPracticing,
  onTryQuestion,
}) => {
  return (
    <section className="bg-white pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border border-slate-200/80 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Philippine Civil Service Examination Simulator
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
            Prepare for the Civil Service Exam with realistic practice.
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            AceCSE provides full-length timed mock exams, comprehensive step-by-step explanations, and performance diagnostics for both Professional and Subprofessional levels.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
            <button
              onClick={onStartPracticing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base px-6 py-3.5 rounded-lg transition-colors shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onTryQuestion}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-base px-6 py-3.5 rounded-lg border border-slate-300 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span>Try a Sample Question</span>
            </button>
          </div>

          {/* Trust Indicators - Clean Inline List */}
          <div className="pt-8 border-t border-slate-200 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm text-slate-700 font-medium">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Professional & Subprofessional</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Timed Practice Exams</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Detailed Explanations</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
