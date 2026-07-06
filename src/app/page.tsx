import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtenemos el perfil para saber si es admin u operario
  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-blue-600 p-4 text-white shadow-md">
        <div>
          <h1 className="text-xl font-bold">Carscan</h1>
          <p className="text-sm opacity-90">{profile?.nombre || user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium hover:bg-blue-800">
            Salir
          </button>
        </form>
      </header>

      <main className="flex-1 p-4 pb-24">
        {/* Aquí irán los botones principales y el listado */}
        <div className="mb-8 mt-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">¿Qué quieres hacer?</h2>
          
          <Link href="/nueva-entrada" className="w-full">
            <button className="w-full max-w-sm rounded-2xl bg-green-600 p-6 text-2xl font-bold text-white shadow-lg hover:bg-green-700 active:bg-green-800 transition-all">
              + Nueva Entrada
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * ¿Por qué se tomó esta decisión técnica?
 * - Server Component para la página principal, verificando sesión en el servidor
 *   para evitar un parpadeo en el cliente.
 * - Layout mobile-first: Header sticky para siempre tener contexto de quién está
 *   logueado, botón de acción primaria exageradamente grande (+ Nueva Entrada) 
 *   para facilitar el uso con guantes.
 */
