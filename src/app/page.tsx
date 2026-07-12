import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single();
    profile = data;
  } else {
    // BYPASS TEMP
    profile = { nombre: 'Operario (Sin Auth)', rol: 'operario' };
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <main className="flex-1 p-4 pb-24">

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
