'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidVIN, validateVIN } from '@/lib/vin';
import VehicleSummary, { type VehicleInfo } from '@/components/VehicleSummary';
import PartsChecklist, { DEFAULT_PARTS, type PartEntry, type PartStatus } from '@/components/PartsChecklist';

// 1. Interfaces
interface VehicleData extends VehicleInfo {
  displacement: string;
}

interface ValidationErrors {
  vin?: string;
  vinWarning?: string;
  general?: string;
}

type DataSource = 'none' | 'local' | 'vincario' | 'matricula' | 'cache';

// 2. Estilos (mobile-first, alto contraste, guantes)
const styles = {
  container: 'min-h-screen bg-slate-50',
  searchContainer: 'p-4 pb-24',
  header: 'mb-6',
  title: 'text-2xl font-bold text-slate-900',
  subtitle: 'text-slate-600',
  card: 'rounded-2xl bg-white p-6 shadow-md',
  formGroup: 'mb-6',
  label: 'mb-2 block text-lg font-bold text-slate-700',
  input: 'w-full rounded-xl border-2 border-slate-300 p-4 text-xl uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:text-slate-500',
  inputError: 'border-red-500 focus:border-red-600 focus:ring-red-100',
  errorText: 'mt-2 text-sm font-bold text-red-600',
  button: 'mt-6 w-full rounded-xl bg-blue-600 py-5 text-2xl font-bold text-white shadow-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all flex items-center justify-center',
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
    version: '',
    motor_codigo: '',
    year: '',
    combustible: '',
    potencia: '',
    carroceria: '',
    traccion: '',
    displacement: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Estado del checklist de piezas (inicializado con las 25 piezas)
  const [parts, setParts] = useState<PartEntry[]>(
    DEFAULT_PARTS.map((name) => ({ name, status: null }))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const upperValue = value.toUpperCase();
    
    setFormData((prev) => ({ ...prev, [name]: upperValue }));

    // Validar VIN en tiempo real
    if (name === 'vin') {
      if (upperValue.length > 0 && upperValue.length < 17) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN debe tener 17 caracteres.', vinWarning: undefined }));
      } else if (upperValue.length === 17) {
        const result = validateVIN(upperValue);
        if (!result.valid) {
          setErrors((prev) => ({ ...prev, vin: result.errorMessage, vinWarning: undefined }));
        } else {
          setErrors((prev) => ({
            ...prev,
            vin: undefined,
            vinWarning: result.checkDigitWarning,
          }));
        }
      } else if (upperValue.length > 17) {
        setErrors((prev) => ({ ...prev, vin: 'El VIN no puede tener más de 17 caracteres.', vinWarning: undefined }));
      } else {
        setErrors((prev) => ({ ...prev, vin: undefined, vinWarning: undefined }));
      }
    }

    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const handleSearch = async () => {
    if (!formData.matricula && !formData.vin) {
      setErrors((prev) => ({ ...prev, general: 'Debes introducir la matrícula o el bastidor para buscar.' }));
      return;
    }

    if (formData.vin && errors.vin) return;
    
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
        // VIN válido → /api/vin/decode (local WMI + Vincario)
        const res = await fetch('/api/vin/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: formData.vin }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al decodificar el VIN');

        const motorParts = [data.engine, data.displacement].filter(Boolean);
        const motorStr = motorParts.join(' ') || '';

        setFormData((prev) => ({
          ...prev,
          marca: data.make || prev.marca,
          modelo: data.model || prev.modelo,
          version: data.trim || prev.version,
          motor_codigo: motorStr || prev.motor_codigo,
          year: data.year ? String(data.year) : prev.year,
          combustible: data.fuel || prev.combustible,
          potencia: data.power || prev.potencia,
          carroceria: data.bodyType || prev.carroceria,
          traccion: data.drive || prev.traccion,
          displacement: data.displacement || prev.displacement,
        }));

        const sources: string[] = data.sources || [];
        if (sources.includes('cache')) {
          setDataSource('cache');
        } else if (sources.includes('vincario')) {
          setDataSource('vincario');
        } else {
          setDataSource('local');
        }
      }

      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al buscar los datos.';
      console.error(err);
      setFetchError(message);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handlePartStatusChange = (index: number, status: PartStatus) => {
    setParts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status };
      return updated;
    });
  };

  const handleFinalize = () => {
    console.log('Guardando entrada:', { vehicle: formData, parts });
    alert(`Entrada guardada:\n${parts.filter(p => p.status === 'guardar').length} piezas a guardar\n${parts.filter(p => p.status === 'desechar').length} a desechar`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleSearch();
    }
  };

  const isSearchDisabled = loading
    || (!formData.matricula && !formData.vin)
    || (formData.vin.length > 0 && formData.vin.length < 17)
    || (formData.vin.length === 17 && !!errors.vin);

  // ───────────────────────────────────────────────────────
  // STEP 2: Resumen + Checklist
  // ───────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <main className={styles.container}>
        {/* Resumen del vehículo */}
        <VehicleSummary
          vehicle={formData}
          onEdit={() => setStep(1)}
        />

        {/* Banners de estado */}
        <div className="px-4 pt-3">
          {fetchError && (
            <div className={styles.warningBanner}>
              ⚠️ {fetchError}. Rellena los datos manualmente.
            </div>
          )}
          {dataSource === 'local' && (
            <div className={styles.warningBanner}>
              ⚠️ <strong>Verificar datos:</strong> Solo se pudo deducir la marca del código del fabricante.
            </div>
          )}
        </div>

        {/* Checklist de piezas */}
        <div className="p-4">
          <PartsChecklist
            parts={parts}
            onStatusChange={handlePartStatusChange}
          />

          {/* Botón finalizar */}
          <button
            type="button"
            onClick={handleFinalize}
            className="mt-6 w-full rounded-xl bg-green-600 py-5 text-2xl font-bold text-white shadow-lg hover:bg-green-700 active:bg-green-800 transition-all flex items-center justify-center"
          >
            💾 Guardar Entrada
          </button>
        </div>
      </main>
    );
  }

  // ───────────────────────────────────────────────────────
  // STEP 1: Búsqueda (Matrícula o VIN)
  // ───────────────────────────────────────────────────────
  return (
    <main className={`${styles.container} ${styles.searchContainer}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nueva Entrada</h1>
        <p className={styles.subtitle}>Introduce matrícula o bastidor</p>
      </header>

      <div className={styles.card}>
        {errors.general && (
          <div className={styles.errorBanner}>{errors.general}</div>
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
            />
            {errors.vin && <p className={styles.errorText}>{errors.vin}</p>}
            {!errors.vin && errors.vinWarning && (
              <p className="mt-2 text-sm font-medium text-yellow-600">ℹ️ {errors.vinWarning}</p>
            )}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSearchDisabled}
          >
            {loading ? (
              <span className="animate-pulse">Buscando datos...</span>
            ) : (
              '🔍 Buscar Datos del Vehículo'
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
 * - Step 1: formulario simple (matrícula o VIN) — pantalla limpia.
 * - Step 2: resumen compacto del vehículo (VehicleSummary) + ficha desplegable
 *   + checklist de 25 piezas (PartsChecklist). Se eliminaron los inputs editables
 *   de marca/modelo/año del Step 2 — ahora son solo lectura en el resumen.
 * - El botón "Editar" del VehicleSummary vuelve al Step 1.
 * - LECCIÓN APRENDIDA: el operario no quiere rellenar campos de texto uno a uno
 *   en la campa con guantes. Quiere ver un resumen rápido y tocar botones de
 *   guardar/desechar en las piezas.
 */
