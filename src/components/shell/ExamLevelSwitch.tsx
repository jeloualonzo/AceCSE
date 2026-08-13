import React from 'react';
import type { ExamLevel } from '@/types';

const LEVELS: ExamLevel[] = ['Subprofessional', 'Professional'];

/**
 * Per-activity examination-level selector. Both levels are ALWAYS visible
 * and clickable — the app has no hidden/global "active level" anymore; the
 * stored preference is only a last-used convenience that this switch reads
 * and updates. An already-running session is never affected: the session's
 * own examLevel stays authoritative once it starts.
 */
export const ExamLevelSwitch: React.FC<{
  value: ExamLevel;
  onChange: (level: ExamLevel) => void;
}> = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Examination level for this activity"
    className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-0.5"
  >
    {LEVELS.map((level) => {
      const isActive = value === level;
      return (
        <button
          key={level}
          role="radio"
          aria-checked={isActive}
          onClick={() => onChange(level)}
          className={`px-3 py-1.5 min-h-[36px] rounded-md text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            isActive
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {level}
        </button>
      );
    })}
  </div>
);
