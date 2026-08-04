import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, User, ExternalLink, ChevronDown, Check } from 'lucide-react';

interface AppHeaderProps {
  onReturnToLanding: () => void;
  examLevel: 'Professional' | 'Subprofessional';
  onToggleExamLevel: (level: 'Professional' | 'Subprofessional') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onReturnToLanding,
  examLevel,
  onToggleExamLevel,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: AceCSE Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Ace<span className="text-emerald-600">CSE</span>
          </span>
        </div>
      </div>

      {/* Right: Minimal Profile Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-2.5 px-2 py-1.5 min-h-[44px] rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
          aria-expanded={isProfileOpen}
          aria-label="User Profile Menu"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
            JA
          </div>
          <span className="hidden sm:inline text-xs font-bold text-slate-900 leading-none">
            Jelou Alonzo
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isProfileOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900">Jelou Alonzo</p>
              <p className="text-xs text-slate-500 truncate">alonzojelou06@gmail.com</p>
            </div>

            <div className="py-1">
              <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Target Exam Scope
              </div>
              <button
                onClick={() => {
                  onToggleExamLevel('Professional');
                  setIsProfileOpen(false);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer focus:outline-none focus-visible:bg-slate-100"
              >
                <span>Professional Level</span>
                {examLevel === 'Professional' && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
              <button
                onClick={() => {
                  onToggleExamLevel('Subprofessional');
                  setIsProfileOpen(false);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer focus:outline-none focus-visible:bg-slate-100"
              >
                <span>Subprofessional Level</span>
                {examLevel === 'Subprofessional' && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>

            <div className="border-t border-slate-100 my-1"></div>

            <button
              onClick={() => {
                setIsProfileOpen(false);
                onReturnToLanding();
              }}
              className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:bg-slate-100"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Back to Landing Page</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
