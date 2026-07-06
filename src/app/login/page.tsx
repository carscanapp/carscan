'use client';

import { useState } from 'react';
import { login } from './actions';

// 1. Interfaces
interface LoginProps {}
interface LoginState {
  error: string | null;
  loading: boolean;
}

// 2. Styled Components / Tailwind classes (mobile-first, high contrast)
const styles = {
  container: 'flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50',
  card: 'w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl',
  title: 'mb-8 text-center text-3xl font-bold text-slate-900',
  label: 'mb-2 block text-lg font-medium text-slate-700',
  input: 'w-full rounded-xl border-2 border-slate-300 p-4 text-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 mb-6',
  button: 'w-full rounded-xl bg-blue-600 py-4 text-xl font-bold text-white shadow-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 transition-colors',
  error: 'mb-6 rounded-lg bg-red-50 p-4 text-center text-red-600 font-medium',
};

// 3. Component Logic & 4. Render
export default function LoginPage({}: LoginProps) {
  const [state, setState] = useState<LoginState>({ error: null, loading: false });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ ...state, loading: true, error: null });

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setState({ error: result.error, loading: false });
    }
    // Si es exitoso, login() hace redirect, no necesitamos actualizar loading a false.
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Carscan</h1>
        
        {state.error && <div className={styles.error}>{state.error}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={styles.input}
              placeholder="operario@desguace.com"
            />
          </div>

          <div>
            <label htmlFor="password" className={styles.label}>
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={styles.input}
            />
          </div>

          <button 
            type="submit" 
            disabled={state.loading}
            className={styles.button}
          >
            {state.loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * ¿Por qué se tomó esta decisión técnica?
 * - Se usa un formulario HTML estándar con un Server Action para el proceso de login.
 * - Sin embargo, como el usuario pide feedback visual inmediato si la clave es incorrecta
 *   sin perder el estado de la UI (sin recarga completa que vacíe los campos), optamos
 *   por interceptar el submit y usar 'use client', enviando el FormData al Server Action.
 * 
 * Edge cases cubiertos:
 * - Botón deshabilitado mientras carga para evitar submits duplicados (común en exteriores con mala red).
 * - Textos e inputs grandes para su uso con guantes (mobile-first, p-4, text-lg).
 */
