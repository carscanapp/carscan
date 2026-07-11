'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidVIN, validateVIN } from '@/lib/vin';

// 1. Interfaces
interface VehicleData {
  matricula: string;
  vin: string;
  marca: string;
  modelo: string;
  motor_codigo: string;
  year: string;
}

interface ValidationErrors {
  vin?: string;
  general?: string;
}

type DataSource = 'none' | 'local' | 'vpic' | 'matricula' | 'cache';

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
  warningBanner: 'mb-4 p-4 rounded-lg bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 font-medium',
  errorBanner: 'mb-4 p-4 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-800 font-bold',
  infoBanner: 'mb-4 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400 text-blue-800 font-medium',
};

// 3. Component Logic & 4. Render
export default function NuevaEntradaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('none');

  const [formData, setFormData] = useState<VehicleData>({
    matricula: '',
    vin: '',
    marca: '',
    modelo: '',
    motor_codigo: '',
    year: '',
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
        const result = validateVIN(upperValue);
        if (!result.valid) {
          setErrors((prev) => ({ ...prev, vin: result.errorMessage }));
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
      return;
    }
    
    setLoading(true);
    setFetchError(null);
    setDataSource('none');

    try {
      if (formData.matricula && !formData.vin) {
        // Solo matrícula → MatriculaAPI (RegCheck)
        const res = await fetch('/api/matricula', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matricula: formData.matricula }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al conectar con MatriculaAPI');

        const make = data.CarMake?.CurrentTextValue || data.MakeDescription?.CurrentTextValue || '';
        const model = data.CarModel?.CurrentTextValue || data.ModelDescription?.CurrentTextValue || '';
        const engine = data.Variation || data.VariantType || '';
        const fetchedVin = data.VehicleIdentificationNumber;

        setFormData((prev) => ({
          ...prev,
          marca: make || prev.marca,
          modelo: model || prev.modelo,
          motor_codigo: engine || prev.motor_codigo,
          vin: fetchedVin || prev.vin,
          year: data.RegistrationYear || prev.year,
        }));
        setDataSource('matricula');

      } else if (formData.vin && isValidVIN(formData.vin)) {
        // VIN válido → nueva API /api/vin/decode (local + NHTSA vPIC)
        const res = await fetch('/api/vin/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: formData.vin }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al decodificar el VIN');

        setFormData((prev) => ({
          ...prev,
          marca: data.make || prev.marca,
          modelo: data.model || prev.modelo,
          motor_codigo: data.engine || data.displacement || prev.motor_codigo,
          year: data.year ? String(data.year) : prev.year,
        }));

        // Determinar la fuente de datos para mostrar advertencia si solo es local
        const sources: string[] = data.sources || [];
        if (sources.includes('cache')) {
          setDataSource('cache');
        } else if (sources.includes('vpic')) {
          setDataSource('vpic');
        } else {
          setDataSource('local');
        }
      }

      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al buscar los datos.';
      console.error(err);
      setFetchError(message);
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
      console.log('Guardando datos y pasando a checklist:', formData);
      alert('Datos confirmados. Aquí iríamos al checklist de piezas.');
    }
  };

  /** Indica si el botón de búsqueda debe estar deshabilitado */
  const isSearchDisabled = loading
    || (!formData.matricula && !formData.vin)
    || (formData.vin.length > 0 && formData.vin.length < 17)
    || (formData.vin.length === 17 && !!errors.vin);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nueva Entrada</h1>
        <p className={styles.subtitle}>
          {step === 1 ? 'Paso 1: Identificación' : 'Paso 2: Confirmación de Datos'}
        </p>
      </header>

      <div className={styles.card}>
        {/* Banners de estado */}
        {fetchError && (
          <div className={styles.warningBanner}>
            ⚠️ No se encontraron datos automáticamente: {fetchError}. Rellena los datos a mano.
          </div>
        )}

        {step === 2 && dataSource === 'local' && (
          <div className={styles.warningBanner}>
            ⚠️ <strong>Verificar datos:</strong> La marca y el año se han deducido del código del fabricante (WMI). 
            El modelo y motor no se pudieron obtener automáticamente. Por favor, confírmalos manualmente.
          </div>
        )}

        {step === 2 && (dataSource === 'vpic' || dataSource === 'cache') && (
          <div className={styles.infoBanner}>
            ✅ Datos obtenidos correctamente. Revisa que sean correctos antes de continuar.
          </div>
        )}

        {errors.general && (
          <div className={styles.errorBanner}>
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
              placeholder="17 caracteres (opcional si hay matrícula)"
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
                <label htmlFor="year" className={styles.label}>Año</label>
                <input
                  id="year"
                  name="year"
                  type="text"
                  value={formData.year}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ej. 2018"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="motor_codigo" className={styles.label}>Motor / Variante</label>
                <input
                  id="motor_codigo"
                  name="motor_codigo"
                  type="text"
                  value={formData.motor_codigo}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ej. 1.5DCI 85 (opcional)"
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className={styles.button}
            disabled={step === 1 ? isSearchDisabled : false}
          >
            {loading ? (
              <span className="animate-pulse">Buscando datos...</span>
            ) : step === 1 ? (
              '🔍 Buscar Datos del Vehículo'
            ) : (
              '✅ Continuar al Checklist'
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
 * - Se elimina la dependencia de Vincario (API de pago) y se sustituye por:
 *   (a) decodificación local del WMI (instantánea, sin red)
 *   (b) NHTSA vPIC (gratuita, complementaria)
 * - Se mantiene el flujo de 2 pasos para que el operario confirme siempre.
 * - Se diferencia visualmente con banners de color:
 *   - Amarillo: datos solo locales (WMI) → "Verificar datos"
 *   - Azul: datos de vPIC o caché → "Revisa que sean correctos"
 *   - Amarillo (fetchError): la API falló → relleno manual
 * - El campo `year` se añade como dato del vehículo, ya que la decodificación
 *   local siempre puede aportar el año del modelo.
 * - Edge case cubierto: si el VIN tiene 17 chars pero falla el check digit,
 *   el botón queda deshabilitado y no se puede hacer submit.
 */
