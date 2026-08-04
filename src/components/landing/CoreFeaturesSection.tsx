import React from 'react';
import { CORE_FEATURES } from '../../data/landing';
import { Clock, BookOpen, BarChart3, CheckCircle2 } from 'lucide-react';

export const CoreFeaturesSection: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Clock':
        return <Clock className="w-6 h-6 text-emerald-600" />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6 text-emerald-600" />;
      case 'BarChart3':
        return <BarChart3 className="w-6 h-6 text-emerald-600" />;
      default:
        return <Clock className="w-6 h-6 text-emerald-600" />;
    }
  };

  return (
    <section id="features" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built specifically for CSE success.
          </h2>
          <p className="text-slate-600 mt-3 text-base sm:text-lg">
            Everything you need to master the Civil Service Exam without fluff, filler, or unnecessary distractions.
          </p>
        </div>

        {/* 3 Grid Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {CORE_FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs"
            >
              <div>
                {/* Icon Badge */}
                <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6">
                  {getIcon(feature.iconName)}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs font-semibold text-emerald-800 mb-4">
                  {feature.subtitle}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {feature.description}
                </p>
              </div>

              {/* Bullet highlights */}
              <div className="pt-6 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                {feature.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
