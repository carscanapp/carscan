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
  general?: string;
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
  input: 'w-full rounded-xl border-2 border-slate-300 p-4 text-xl uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:text-slate-500',
  inputError: 'border-red-500 focus:border-red-600 focus:ring-red-100',
  errorText: 'mt-2 text-sm font-bold text-red-600',
  button: 'mt-8 w-full rounded-xl bg-blue-600 py-5 text-2xl font-bold text-white shadow-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all flex items-center justify-center',
};

// 3. Component Logic & 4. Render
export default function NuevaEntradaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

    // Validar VIN en tiempo real si se está rellenando
    if (name === 'vin') {
      if (upperValue.length > 0 && upperValue.length < 17) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN debe tener 17 caracteres.' }));
      } else if (upperValue.length === 17) {
        if (!isValidVIN(upperValue)) {
          setErrors((prev) => ({ ...prev, vin: 'VIN inválido según norma ISO 3779.' }));
        } else {
          setErrors((prev) => ({ ...prev, vin: undefined }));
        }
      } else if (upperValue.length > 17) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN no puede tener más de 17 caracteres.' }));
      } else {
        setErrors((prev) => ({ ...prev, vin: undefined }));
      }
    }

    // Limpiar error general si el usuario empieza a escribir
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const handleSearch = async () => {
    if (!formData.matricula && !formData.vin) {
      setErrors((prev) => ({ ...prev, general: 'Debes introducir la matrícula o el bastidor para buscar.' }));
      return;
    }

    if (formData.vin && errors.vin) {
      return; // El VIN tiene errores
    }
    
    setLoading(true);
    setFetchError(null);

    try {
      if (formData.matricula) {
        // Buscar por Matrícula en MatriculaAPI
        const res = await fetch('/api/matricula', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matricula: formData.matricula }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al conectar con MatriculaAPI');

        // Parseamos la respuesta de MatriculaAPI (la que nos pasaste)
        const make = data.CarMake?.CurrentTextValue || data.MakeDescription?.CurrentTextValue || '';
        const model = data.CarModel?.CurrentTextValue || data.ModelDescription?.CurrentTextValue || '';
        const engine = data.Variation || data.VariantType || '';
        const fetchedVin = data.VehicleIdentificationNumber; // Suele ser null

        setFormData((prev) => ({
          ...prev,
          marca: make || prev.marca,
          modelo: model || prev.modelo,
          motor_codigo: engine || prev.motor_codigo,
          vin: fetchedVin || prev.vin, 
        }));

      } else if (formData.vin) {
        // Buscar por VIN en Vincario
        const res = await fetch('/api/vincario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: formData.vin }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al conectar con Vincario');

        let make = '';
        let model = '';
        let engine = '';

        if (data.decode && Array.isArray(data.decode)) {
          const makeItem = data.decode.find((item: any) => item.label === 'Make' || item.id === 'make');
          const modelItem = data.decode.find((item: any) => item.label === 'Model' || item.id === 'model');
          const engineItem = data.decode.find((item: any) => item.label?.includes('Engine') || item.id === 'engine_code');
          
          if (makeItem) make = makeItem.value;
          if (modelItem) model = modelItem.value;
          if (engineItem) engine = engineItem.value;
        }

        setFormData((prev) => ({
          ...prev,
          marca: make || prev.marca,
          modelo: model || prev.modelo,
          motor_codigo: engine || prev.motor_codigo,
        }));
      }

      setStep(2);
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Error desconocido al buscar los datos.');
      // Pasamos al paso 2 de todas formas para relleno manual
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      handleSearch();
    } else {
      if (!formData.vin) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN es obligatorio para finalizar la entrada.' }));
        return;
      }
      console.log('Guardando datos y pasando a checklist:', formData);
      alert('Datos confirmados. Aquí iríamos al checklist de piezas.');
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nueva Entrada</h1>
        <p className={styles.subtitle}>
          {step === 1 ? 'Paso 1: Identificación (Lectura API)' : 'Paso 2: Confirmación de Datos'}
        </p>
      </header>

      <div className={styles.card}>
        {fetchError && (
          <div className="mb-4 p-4 rounded-lg bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 font-medium">
            No se encontraron datos automáticamente: {fetchError}. Por favor, rellena los datos a mano.
          </div>
        )}

        {errors.general && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-800 font-bold">
            {errors.general}
          </div>
        )}

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
              // En el paso 1 no es "required" por HTML para permitir VIN. Lo validamos en JS.
              readOnly={step === 2}
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
              placeholder="Opcional en Paso 1 (si tienes matrícula)"
              readOnly={step === 2 && formData.vin.length === 17 && !errors.vin}
            />
            {errors.vin && <p className={styles.errorText}>{errors.vin}</p>}
          </div>

          {step === 2 && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="marca" className={styles.label}>Marca</label>
                <input
                  id="marca"
                  name="marca"
                  type="text"
                  value={formData.marca}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ej. RENAULT"
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
                  placeholder="Ej. MEGANE"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="motor_codigo" className={styles.label}>Motor (Variante)</label>
                <input
                  id="motor_codigo"
                  name="motor_codigo"
                  type="text"
                  value={formData.motor_codigo}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ej. 1.5DCI 85"
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className={styles.button}
            disabled={loading || (!!errors.vin && formData.vin.length > 0 && formData.vin.length < 17)}
          >
            {loading ? (
              <span className="animate-pulse">Buscando datos...</span>
            ) : step === 1 ? (
              'Buscar Datos del Vehículo'
            ) : (
              'Continuar al Checklist'
            )}
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
 * - Se separa la lógica de validación HTML5 (`required`) de la lógica JS para 
 *   permitir que o bien Matrícula o bien VIN disparen el submit en el Paso 1.
 * - En el Paso 2, el VIN sí se vuelve obligatorio antes de pasar al Checklist, 
 *   ya que MatriculaAPI frecuentemente devuelve el VIN como null.
 * - Mantenemos la estructura de 2 pasos para que el usuario confirme siempre
 *   la información devuelta por la API (MatriculaAPI o Vincario).
 */
