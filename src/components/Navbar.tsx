'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

/**
 * Navbar global — se muestra en todas las páginas.
 * El logo a la izquierda enlaza siempre al inicio (/).
 * Mobile-first: sticky, alto contraste, fácil de pulsar con guantes.
 */
export default function Navbar() {
  const pathname = usePathname();

  // No mostrar en la página de login (para cuando se reactive)
  if (pathname === '/login') return null;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 shadow-sm" style={{ backgroundColor: '#ca3143' }}>
      <Link href="/" className="flex items-center gap-2" aria-label="Volver al inicio">
        <Image
          src="/logo-carscan.png"
          alt="Carscan"
          width={140}
          height={40}
          className="h-9 w-auto"
          priority
        />
      </Link>
    </nav>
  );
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - Componente 'use client' porque usa usePathname para ocultar en /login.
 * - El logo usa next/image para optimización automática (WebP, lazy loading).
 * - Se oculta en /login para que cuando se reactive la autenticación, la
 *   pantalla de login tenga diseño limpio sin navbar.
 * - sticky + z-50 garantiza que siempre esté visible al hacer scroll.
 */
