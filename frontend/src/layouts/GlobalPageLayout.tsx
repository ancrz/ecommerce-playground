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
      <main className="grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {/* pb-24 on mobile to account for BottomNav space */}
        {children}
      </main>

      {/* Footer (Desktop Only? Or simplified on mobile?) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Nav (Authenticated Only) */}
      {user && (
          <div className="md:hidden">
            <MobileBottomNav />
          </div>
      )}
    </div>
  );
}
