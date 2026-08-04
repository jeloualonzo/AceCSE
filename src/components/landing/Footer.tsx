import React from 'react';
import { BrandMark } from '@/components/BrandMark';

export const Footer: React.FC = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-50 pt-12 pb-8 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <BrandMark className="w-9 h-9" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Ace<span className="text-emerald-600">CSE</span>
            </span>
            <span className="text-xs text-slate-500 font-medium ml-2">
              Civil Service Exam Simulator
            </span>
          </div>

          {/* Nav */}
          <div className="flex flex-wrap gap-6 text-xs sm:text-sm font-medium text-slate-600">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('coverage')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Exam Coverage
            </button>
            <button
              onClick={() => scrollToSection('try-question')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Sample Question
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </div>

        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="max-w-3xl leading-relaxed text-slate-500 text-[11px] sm:text-xs">
            <strong className="text-slate-700">Disclaimer:</strong> AceCSE is an independent educational test preparation platform designed for practice and review purposes only. It is not affiliated with, endorsed by, sponsored by, or officially connected to the Civil Service Commission (CSC) of the Philippines or any government agency.
          </p>

          <div className="shrink-0 text-slate-500 text-[11px] sm:text-xs">
            © {new Date().getFullYear()} AceCSE. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  );
};
