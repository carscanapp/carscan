'use client';

// 1. Interfaces
export type PartStatus = 'guardar' | 'desechar' | 'no_tiene' | null;

export interface PartEntry {
  name: string;
  status: PartStatus;
}

interface PartsChecklistProps {
  parts: PartEntry[];
  onStatusChange: (index: number, status: PartStatus) => void;
}

/** Las 25 piezas de la hoja de papel del desguace, en orden */
export const DEFAULT_PARTS: string[] = [
  'Alternador',
  'Batería',
  'Bomba gasolina',
  'Bomba inyección',
  'Cambio',
  'Caudalímetro',
  'Centralita',
  'Cierres',
  'Cinturones',
  'Cuadro',
  'Elevalunas',
  'Espejos',
  'Llave contacto',
  'Llave limpia',
  'Llave luces',
  'Mandos calefacción',
  'Mando elevalunas',
  'Motor',
  'Motor calefacción',
  'Motor limpia',
  'Puesta marcha',
  'Radiador agua',
  'Radiador aire',
  'Radio',
  'Turbo',
];

// 2. Estilos — botones grandes para guantes, alto contraste
const statusConfig: Record<
  NonNullable<PartStatus>,
  { label: string; emoji: string; bg: string; bgActive: string; text: string }
> = {
  guardar: {
    label: 'Guardar',
    emoji: '✅',
    bg: 'bg-green-100 border-green-300',
    bgActive: 'bg-green-500 border-green-600 text-white',
    text: 'text-green-800',
  },
  desechar: {
    label: 'Desechar',
    emoji: '❌',
    bg: 'bg-red-100 border-red-300',
    bgActive: 'bg-red-500 border-red-600 text-white',
    text: 'text-red-800',
  },
  no_tiene: {
    label: 'No tiene',
    emoji: '➖',
    bg: 'bg-slate-100 border-slate-300',
    bgActive: 'bg-slate-500 border-slate-600 text-white',
    text: 'text-slate-600',
  },
};

/**
 * PartsChecklist — Lista de piezas con 3 estados.
 *
 * Cada fila muestra el nombre de la pieza y 3 botones (Guardar/Desechar/No tiene).
 * Los botones son grandes y con emojis para facilitar el uso con guantes.
 * Mobile-first: ocupa todo el ancho, botones de tamaño mínimo 44px (A11y).
 */
export default function PartsChecklist({ parts, onStatusChange }: PartsChecklistProps) {
  // Contar estados para el resumen
  const counts = {
    guardar: parts.filter((p) => p.status === 'guardar').length,
    desechar: parts.filter((p) => p.status === 'desechar').length,
    no_tiene: parts.filter((p) => p.status === 'no_tiene').length,
    pending: parts.filter((p) => p.status === null).length,
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Cabecera del checklist */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900">Checklist de Piezas</h3>
        <div className="flex gap-3 mt-1 text-xs font-medium">
          <span className="text-green-600">✅ {counts.guardar}</span>
          <span className="text-red-600">❌ {counts.desechar}</span>
          <span className="text-slate-500">➖ {counts.no_tiene}</span>
          {counts.pending > 0 && (
            <span className="text-yellow-600">⏳ {counts.pending} pendientes</span>
          )}
        </div>
      </div>

      {/* Lista de piezas */}
      <div className="divide-y divide-slate-100">
        {parts.map((part, index) => (
          <div
            key={part.name}
            className={`px-4 py-3 flex items-center justify-between gap-2 transition-colors ${
              part.status ? 'bg-white' : 'bg-yellow-50/30'
            }`}
          >
            {/* Nombre de la pieza */}
            <span
              className={`text-sm font-semibold min-w-0 flex-1 ${
                part.status === 'desechar'
                  ? 'text-red-400 line-through'
                  : part.status === 'no_tiene'
                    ? 'text-slate-400'
                    : 'text-slate-800'
              }`}
            >
              {part.name}
            </span>

            {/* Botones de estado */}
            <div className="flex gap-1.5 shrink-0">
              {(Object.keys(statusConfig) as Array<NonNullable<PartStatus>>).map((status) => {
                const config = statusConfig[status];
                const isActive = part.status === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusChange(index, isActive ? null : status)}
                    className={`
                      min-w-[44px] min-h-[44px] rounded-xl border-2 px-2 py-1.5
                      text-xs font-bold transition-all active:scale-95
                      ${isActive ? config.bgActive : `${config.bg} ${config.text}`}
                    `}
                    aria-label={`${part.name}: ${config.label}`}
                    aria-pressed={isActive}
                  >
                    <span className="block text-base leading-none">{config.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - Las 25 piezas son las mismas de la hoja de papel del desguace.
 * - Botones de min 44x44px cumplen WCAG 2.1 para targets táctiles.
 * - Pulsar un botón ya activo lo desactiva (toggle → null).
 * - El nombre de la pieza se tacha si el estado es "desechar" y se atenúa
 *   si es "no_tiene" para feedback visual instantáneo.
 * - Los contadores en la cabecera dan al operario un resumen rápido.
 * - Edge case: "pending" muestra las piezas que aún no se han clasificado.
 */
