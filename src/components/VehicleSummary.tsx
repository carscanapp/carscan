'use client';

import { useState } from 'react';

// 1. Interfaces
export interface VehicleInfo {
  marca: string;
  modelo: string;
  version: string;
  year: string;
  carroceria: string;
  motor_codigo: string;
  combustible: string;
  potencia: string;
  traccion: string;
  displacement: string;
  matricula: string;
  vin: string;
}

interface VehicleSummaryProps {
  vehicle: VehicleInfo;
  onEdit: () => void;
}

/**
 * VehicleSummary — Resumen compacto del vehículo + ficha técnica desplegable.
 *
 * Se muestra en el Step 2 de Nueva Entrada, justo debajo del navbar.
 * Estilo inspirado en las fichas de Oscaro / recambios online.
 */
export default function VehicleSummary({ vehicle, onEdit }: VehicleSummaryProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Construir la línea de resumen compacto
  const summaryParts = [
    vehicle.marca,
    vehicle.modelo,
    vehicle.version,
    vehicle.carroceria,
    vehicle.displacement,
    vehicle.traccion ? vehicle.traccion.split(' - ')[0] : '', // "4x4" sin "Four-wheel drive"
    vehicle.combustible,
    vehicle.potencia,
    vehicle.motor_codigo,
  ].filter(Boolean);

  const summaryLine = summaryParts.join(' · ');
  const yearLine = vehicle.year ? `Año ${vehicle.year}` : '';

  // Ficha técnica en pares clave-valor
  const specs: Array<{ label: string; value: string }> = [
    { label: 'Marca', value: vehicle.marca },
    { label: 'Modelo', value: vehicle.modelo },
    { label: 'Versión / Acabado', value: vehicle.version },
    { label: 'Año', value: vehicle.year },
    { label: 'Carrocería', value: vehicle.carroceria },
    { label: 'Tracción', value: vehicle.traccion },
    { label: 'Motor', value: vehicle.motor_codigo },
    { label: 'Cilindrada', value: vehicle.displacement },
    { label: 'Combustible', value: vehicle.combustible },
    { label: 'Potencia', value: vehicle.potencia },
    { label: 'Matrícula', value: vehicle.matricula },
    { label: 'VIN', value: vehicle.vin },
  ].filter((s) => s.value);

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      {/* Resumen compacto */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {vehicle.marca} {vehicle.modelo}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 leading-snug">
              {summaryLine}
            </p>
            {yearLine && (
              <p className="text-xs text-slate-400 mt-0.5">{yearLine}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            aria-label="Volver a buscar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Ficha técnica desplegable */}
      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          aria-expanded={detailsOpen}
        >
          <span>Ficha técnica completa</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 text-slate-400 ${detailsOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {detailsOpen && (
          <div className="px-4 pb-4 animate-in slide-in-from-top-2">
            <table className="w-full text-sm">
              <tbody>
                {specs.map((spec) => (
                  <tr key={spec.label} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-4 text-slate-500 font-medium whitespace-nowrap">
                      {spec.label}
                    </td>
                    <td className="py-2 text-slate-900 font-semibold text-right">
                      {spec.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - El resumen compacto une todos los datos en una línea separada por " · "
 *   para máxima densidad informativa (estilo Oscaro).
 * - La ficha técnica se abre con un toggle, cerrada por defecto para no
 *   ocupar espacio en la campa donde el operario usa el móvil con guantes.
 * - El botón "Editar" permite volver al Step 1 si los datos de Vincario
 *   no son correctos.
 */
