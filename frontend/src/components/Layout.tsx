/**
 * src/components/Layout.tsx
 * "Carcasa" principal del sitio (Header, Contenido, Footer).
 * REFACTORIZADO: Consume el AppContext (useApp) y elimina el "prop drilling".
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
// Importa componentes desde la misma carpeta 'components'
import Header from './Header';
import Footer from './Footer';
// Importa el hook del contexto
import { useApp } from '../App';

export default function Layout() {
  // Consume los datos del contexto global
  const { customization } = useApp();
  
  return (
    <div 
      className="flex flex-col min-h-screen bg-gray-100"
      style={{
        // Aplica la fuente global desde el contexto
        fontFamily: customization?.font_family || 'Poppins, sans-serif'
      }}
      data-testid="public-layout"
    >
      <Header />
      
      <main className="flex-grow w-full">
        {/* Outlet renderiza la página actual (HomePage, UserAccountPage, etc.) */}
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
}