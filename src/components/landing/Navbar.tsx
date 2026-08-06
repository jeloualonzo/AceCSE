import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

interface NavbarProps {
  onStartPracticing: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartPracticing }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <BrandMark className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Ace<span className="text-emerald-600">CSE</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
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
              onClick={() => scrollToSection('faq')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onStartPracticing}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
