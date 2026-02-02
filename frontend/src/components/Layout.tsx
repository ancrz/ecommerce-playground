/**
 * src/components/Layout.tsx
 * "Carcasa" principal del sitio (Header, Contenido, Footer).
 * REFACTORIZADO: Ahora utiliza el 'GlobalPageLayout' para manejar la lógica responsive.
 */
import { Outlet } from 'react-router-dom';
import GlobalPageLayout from '../layouts/GlobalPageLayout';

export default function Layout() {
  return (
    <GlobalPageLayout>
      <Outlet />
    </GlobalPageLayout>
  );
}