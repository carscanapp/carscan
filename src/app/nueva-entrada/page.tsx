'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidVIN } from '@/lib/vinValidation';

// 1. Interfaces
interface VehicleData {
  matricula: string;
  vin: string;
  marca: string;
  modelo: string;
  motor_codigo: string;
}

interface ValidationErrors {
  vin?: string;
}

// 2. Styled Components / Tailwind classes (mobile-first, alto contraste, guantes)
const styles = {
  container: 'min-h-screen bg-slate-50 p-4 pb-24',
  header: 'mb-6',
  title: 'text-2xl font-bold text-slate-900',
  subtitle: 'text-slate-600',
  card: 'rounded-2xl bg-white p-6 shadow-md',
  formGroup: 'mb-6',
  label: 'mb-2 block text-lg font-bold text-slate-700',
  input: 'w-full rounded-xl border-2 border-slate-300 p-4 text-xl uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all',
  inputError: 'border-red-500 focus:border-red-600 focus:ring-red-100',
  errorText: 'mt-2 text-sm font-bold text-red-600',
  button: 'mt-8 w-full rounded-xl bg-blue-600 py-5 text-2xl font-bold text-white shadow-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all',
};

// 3. Component Logic & 4. Render
export default function NuevaEntradaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<VehicleData>({
    matricula: '',
    vin: '',
    marca: '',
    modelo: '',
    motor_codigo: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const upperValue = value.toUpperCase();
    
    setFormData((prev) => ({ ...prev, [name]: upperValue }));

    // Validar VIN en tiempo real si el usuario está escribiendo en ese campo
    if (name === 'vin') {
      if (upperValue.length > 0 && upperValue.length < 17) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN debe tener 17 caracteres.' }));
      } else if (upperValue.length === 17) {
        if (!isValidVIN(upperValue)) {
          setErrors((prev) => ({ ...prev, vin: 'VIN inválido según norma ISO 3779 (Dígito de control o caracteres no permitidos).' }));
        } else {
          setErrors((prev) => ({ ...prev, vin: undefined }));
        }
      } else if (upperValue.length > 17) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN no puede tener más de 17 caracteres.' }));
      } else {
        setErrors((prev) => ({ ...prev, vin: undefined }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.vin && !isValidVIN(formData.vin)) {
      setErrors({ vin: 'Revisa el VIN, no es válido.' });
      return;
    }

    // Aquí en el futuro lo guardaremos en un contexto/estado global o en localStorage
    // para pasarlo a la vista del Checklist. Por ahora hacemos un log y alert.
    console.log('Datos del vehículo:', formData);
    alert('Datos validados correctamente. En el próximo paso iremos al Checklist.');
    
    // router.push('/nueva-entrada/checklist');
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nueva Entrada</h1>
        <p className={styles.subtitle}>Introduce los datos del vehículo (Paso 1 de 2)</p>
      </header>

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          
          <div className={styles.formGroup}>
            <label htmlFor="matricula" className={styles.label}>Matrícula</label>
            <input
              id="matricula"
              name="matricula"
              type="text"
              value={formData.matricula}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Ej. 1234ABC"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="vin" className={styles.label}>Bastidor (VIN)</label>
            <input
              id="vin"
              name="vin"
              type="text"
              maxLength={17}
              value={formData.vin}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.vin ? styles.inputError : ''}`}
              placeholder="17 caracteres"
              required
            />
            {errors.vin && <p className={styles.errorText}>{errors.vin}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="marca" className={styles.label}>Marca</label>
            <input
              id="marca"
              name="marca"
              type="text"
              value={formData.marca}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Ej. SEAT"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="modelo" className={styles.label}>Modelo</label>
            <input
              id="modelo"
              name="modelo"
              type="text"
              value={formData.modelo}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Ej. LEON"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="motor_codigo" className={styles.label}>Código de Motor</label>
            <input
              id="motor_codigo"
              name="motor_codigo"
              type="text"
              value={formData.motor_codigo}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Ej. BKD (Opcional)"
            />
          </div>

          <button 
            type="submit" 
            className={styles.button}
            disabled={!!errors.vin && formData.vin.length > 0}
          >
            Continuar al Checklist
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
 * - Se ha creado un formulario en 'use client' para tener validación del VIN en 
 *   tiempo real, ya que el operario necesita feedback inmediato si se equivoca 
 *   al teclear el bastidor de 17 caracteres (muy propenso a errores manuales).
 * - Se fuerza a uppercase todos los campos para evitar discrepancias en base de datos.
 * 
 * Posibles "edge cases" cubiertos:
 * - VIN menor a 17 o mayor a 17 caracteres.
 * - Validación oficial ISO 3779 que rechaza caracteres I, O, Q y comprueba 
 *   el dígito de control.
 * - Inputs extremadamente grandes (p-4, text-xl) para que se vean bien bajo el sol 
 *   y se puedan tocar con guantes, cumpliendo la regla de oro de UX.
 */
