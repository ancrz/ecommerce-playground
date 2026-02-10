/**
 * src/components/Footer.tsx
 * Pie de página del sitio.
 * REFACTORIZADO: Consume el AppContext (useApp) y añade la lógica
 * de redes sociales que faltaba.
 */
import React from 'react';
// Importa el hook del contexto
import { useApp } from '../App';
// Importa los iconos que usaremos
import { Phone, Facebook, Instagram, Twitter, Linkedin, Youtube, MessageSquare } from 'lucide-react';

// Mapeo de iconos para redes sociales
const iconMap = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  whatsapp: MessageSquare,
  default: Phone
};

export default function Footer() {
  // Consume los datos del contexto global
  const { customization, businessInfo } = useApp();
  
  // Asignar colores con fallbacks seguros
  const primaryColor = customization?.primary_color || '#264192';
  const accentColor = customization?.accent_color || '#ffffff';

  return (
    <footer style={{
      backgroundColor: primaryColor,
      color: accentColor,
      padding: '2rem',
      marginTop: '4rem' // Asegura espacio sobre el footer
    }} data-testid="footer-public">
      <div className="max-w-7xl mx-auto text-center">
                  <p className="font-semibold">&copy; {new Date().getFullYear()} {businessInfo?.name || import.meta.env.VITE_APP_NAME}. Todos los derechos reservados.</p>        
        {businessInfo?.contact && (
          <p className="mt-2 flex items-center justify-center gap-2">
            <Phone size={16} />
            {businessInfo.contact}
          </p>
        )}

        {/* REFACTOR: Lógica de Redes Sociales (Módulo 56) */}
        {businessInfo?.social_networks && businessInfo.social_networks.length > 0 && (
            <div className="flex justify-center gap-4 mt-4" data-testid="footer-social-links">
              {businessInfo.social_networks.map((network, i) => {
                if (!network.icon) {
                  const Icon = (iconMap as any)[network.name.toLowerCase()] || iconMap.default;
                  return (
                    <a 
                      key={i} 
                      href={network.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:opacity-80 transition-opacity"
                      aria-label={`Visita nuestro ${network.name}`}
                      data-testid={`social-link-${network.name}`}
                    >
                      <Icon size={24} />
                    </a>
                  );
                }
                return (
                  <a 
                    key={i} 
                    href={network.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:opacity-80 transition-opacity"
                    aria-label={`Visita nuestro ${network.name}`}
                    data-testid={`social-link-${network.name}`}
                  >
                    <img src={network.icon} alt={network.name} className="w-6 h-6" />
                  </a>
                );
              })}
            </div>
          )}
      </div>
    </footer>
  );
}