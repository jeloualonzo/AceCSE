import React from 'react';
import { AppCanvas } from '../shell/AppCanvas';
import { Save, User, Shield, Bell, Check } from 'lucide-react';

interface ViewProps {
  examLevel: 'Professional' | 'Subprofessional';
  onToggleExamLevel: (level: 'Professional' | 'Subprofessional') => void;
}

export const SettingsPlaceholder: React.FC<ViewProps> = ({
  examLevel,
  onToggleExamLevel,
}) => {
  return (
    <AppCanvas
      title="Settings"
      primaryAction={
        <button className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs">
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Exam Level Preference */}
        <div className="p-6 bg-white rounded-xl border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Civil Service Examination Level
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            Select the examination level you are preparing for to adjust default question pools and syllabus rules.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onToggleExamLevel('Professional')}
              className={`p-4 rounded-lg border text-left cursor-pointer transition-colors ${
                examLevel === 'Professional'
                  ? 'bg-emerald-50/60 border-emerald-500 text-slate-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Professional Level
                </span>
                {examLevel === 'Professional' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-slate-500">
                170 Items (3h 10m duration) — For 4-year degree graduates & eligibility.
              </p>
            </button>

            <button
              onClick={() => onToggleExamLevel('Subprofessional')}
              className={`p-4 rounded-lg border text-left cursor-pointer transition-colors ${
                examLevel === 'Subprofessional'
                  ? 'bg-emerald-50/60 border-emerald-500 text-slate-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Subprofessional Level
                </span>
                {examLevel === 'Subprofessional' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-slate-500">
                165 Items (2h 40m duration) — Includes Clerical Operations focus.
              </p>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="p-6 bg-white rounded-xl border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            Account Profile
          </h3>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                readOnly
                value="Jelou Alonzo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                readOnly
                value="alonzojelou06@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>
      </div>
    </AppCanvas>
  );
};
