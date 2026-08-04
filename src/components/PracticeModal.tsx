import React, { useState } from 'react';
import { X, Clock, Zap, Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (level: 'Professional' | 'Subprofessional', mode: 'simulation' | 'practice', subject?: string) => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({ isOpen, onClose, onLaunch }) => {
  const [level, setLevel] = useState<'Professional' | 'Subprofessional'>('Professional');
  const [mode, setMode] = useState<'simulation' | 'practice'>('simulation');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-300 shadow-xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base tracking-wide text-white">
              Start Practice Session
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Step 1: Level Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Select Examination Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLevel('Professional')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  level === 'Professional'
                    ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-sm mb-0.5">Professional Level</div>
                <div className="text-xs text-slate-500">170 Items (3h 10m) — Includes Analytical</div>
              </button>

              <button
                onClick={() => setLevel('Subprofessional')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  level === 'Subprofessional'
                    ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-sm mb-0.5">Subprofessional Level</div>
                <div className="text-xs text-slate-500">165 Items (2h 30m) — Includes Clerical</div>
              </button>
            </div>
          </div>

          {/* Step 2: Mode Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              2. Select Practice Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('simulation')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  mode === 'simulation'
                    ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm mb-0.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Timed Simulation</span>
                </div>
                <div className="text-xs text-slate-500">Official timer, full item grid, submission score</div>
              </button>

              <button
                onClick={() => setMode('practice')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  mode === 'practice'
                    ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm mb-0.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Untimed Practice</span>
                </div>
                <div className="text-xs text-slate-500">Instant answer reveal & step-by-step rationales</div>
              </button>
            </div>
          </div>

          {/* Step 3: Subject Scope */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              3. Subject Focus
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
            >
              <option value="all">Full Exam (All Subjects)</option>
              <option value="numerical">Numerical Ability Only</option>
              <option value="verbal">Verbal Ability Only</option>
              <option value="analytical">Analytical / Clerical Ability Only</option>
              <option value="geninfo">General Information & Laws Only</option>
            </select>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onLaunch(level, mode, selectedSubject)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <span>Launch Exam Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
