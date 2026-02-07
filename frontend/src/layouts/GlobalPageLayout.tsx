import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import { useApp } from '../App';

export default function GlobalPageLayout({ children }: { children: React.ReactNode }) {
  const { customization, user } = useApp();

  return (
    <div 
      className="flex flex-col min-h-screen bg-gray-50 transition-colors duration-300"
      style={{
        fontFamily: customization?.font_family || 'Poppins, sans-serif'
      }}
      data-testid="global-layout"
    >
      {/* Header (Desktop: Normal, Mobile: Sticky) */}
      <Header />

      {/* Main Content */}
      {/* Main Content: Increased width (xl -> 2xl or full with padding) and reduced vertical padding */}
      <main className="grow w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-4 pb-20 md:pb-6">
        {/* pb-24 on mobile to account for BottomNav space */}
        {children}
      </main>

      {/* Footer (Desktop Only? Or simplified on mobile?) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Nav (Always Visible) */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
