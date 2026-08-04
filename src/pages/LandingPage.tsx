import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProductPreviewSection } from '@/components/landing/ProductPreviewSection';
import { InteractiveQuestionSection } from '@/components/landing/InteractiveQuestionSection';
import { ExamCoverageSection } from '@/components/landing/ExamCoverageSection';
import { CoreFeaturesSection } from '@/components/landing/CoreFeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { Footer } from '@/components/landing/Footer';
import { useAuth } from '@/context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Signed-in visitors go straight to the app; everyone else to the auth flow.
  const enterApp = () => navigate(user ? '/app/dashboard' : '/auth');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar onStartPracticing={enterApp} onEnterApp={enterApp} />
      <main>
        <HeroSection onStartPracticing={enterApp} onSignIn={enterApp} />
        <ProductPreviewSection onStartPracticing={enterApp} />
        <InteractiveQuestionSection />
        <ExamCoverageSection />
        <CoreFeaturesSection />
        <FAQSection />
        <FinalCTASection onStartPracticing={enterApp} />
      </main>
      <Footer />
    </div>
  );
};
