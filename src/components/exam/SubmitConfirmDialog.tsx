import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface SubmitConfirmDialogProps {
  isPractice: boolean;
  totalQuestions: number;
  answeredCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SubmitConfirmDialog: React.FC<SubmitConfirmDialogProps> = ({
  isPractice,
  totalQuestions,
  answeredCount,
  onCancel,
  onConfirm,
}) => {
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/60 dark:bg-slate-950/80 flex items-center justify-center p-4 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
          <h3 id="submit-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Submit {isPractice ? 'Practice' : 'Exam'}?
          </h3>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 mb-6 space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total questions</span>
            <span className="font-bold text-slate-900 dark:text-white">{totalQuestions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Answered</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Unanswered</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{unansweredCount}</span>
          </div>
          {isPractice && (
            <p className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 leading-relaxed">
              Unanswered practice items are not counted as incorrect. Your accuracy will be based only on the questions you answered.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isPractice ? 'Keep Practicing' : 'Keep Working'}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isPractice ? 'Submit Practice' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};
