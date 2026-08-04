import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProductPreviewSection } from './components/ProductPreviewSection';
import { InteractiveQuestionSection } from './components/InteractiveQuestionSection';
import { ExamCoverageSection } from './components/ExamCoverageSection';
import { CoreFeaturesSection } from './components/CoreFeaturesSection';
import { FAQSection } from './components/FAQSection';
import { FinalCTASection } from './components/FinalCTASection';
import { Footer } from './components/Footer';
import { PracticeModal } from './components/PracticeModal';
import { ActiveSimulatorView } from './components/ActiveSimulatorView';
import { AppShell } from './components/shell/AppShell';

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'appShell'>('appShell');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    level: 'Professional' | 'Subprofessional';
    mode: 'simulation' | 'practice';
    subject: string;
  } | null>(null);

  const handleStartPracticing = () => {
    setViewMode('appShell');
  };

  const handleEnterApp = () => {
    setViewMode('appShell');
  };

  const handleTryQuestion = () => {
    const el = document.getElementById('try-question');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLaunchSession = (
    level: 'Professional' | 'Subprofessional',
    mode: 'simulation' | 'practice',
    subject: string = 'all'
  ) => {
    setIsModalOpen(false);
    setActiveSession({ level, mode, subject });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitSession = () => {
    setActiveSession(null);
  };

  // 1. Focus Mode / Simulator view
  if (activeSession) {
    return (
      <ActiveSimulatorView
        level={activeSession.level}
        mode={activeSession.mode}
        subjectScope={activeSession.subject}
        onExit={handleExitSession}
      />
    );
  }

  // 2. Authenticated Application Shell
  if (viewMode === 'appShell') {
    return <AppShell onReturnToLanding={() => setViewMode('landing')} />;
  }

  // 3. Landing Page View
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. Navigation */}
      <Navbar
        onStartPracticing={handleStartPracticing}
        onEnterApp={handleEnterApp}
      />

      <main>
        {/* 2. Hero */}
        <HeroSection
          onStartPracticing={handleStartPracticing}
          onTryQuestion={handleTryQuestion}
        />

        {/* 3. See AceCSE in Action */}
        <ProductPreviewSection onStartPracticing={handleStartPracticing} />

        {/* 4. Try a Real CSE Question */}
        <InteractiveQuestionSection />

        {/* 5. Exam Coverage */}
        <ExamCoverageSection />

        {/* 6. Three Core Features */}
        <CoreFeaturesSection />

        {/* 7. FAQ */}
        <FAQSection />

        {/* 8. Final CTA */}
        <FinalCTASection onStartPracticing={handleStartPracticing} />
      </main>

      {/* 9. Footer */}
      <Footer />

      {/* Interactive Practice Launch Modal */}
      <PracticeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLaunch={handleLaunchSession}
      />

    </div>
  );
}
