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
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Signed-in visitors never see this page (RedirectWhenAuthed), so both
  // CTAs lead to the Google auth flow.
  const enterApp = () => navigate('/auth');

  const scrollToSampleQuestion = () => {
    document.getElementById('try-question')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar onStartPracticing={enterApp} />
      <main>
        <HeroSection onStartPracticing={enterApp} onTryQuestion={scrollToSampleQuestion} />
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
