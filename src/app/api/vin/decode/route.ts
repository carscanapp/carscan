import { NextResponse } from 'next/server';
import { validateVIN } from '@/lib/vin/validate';
import { decodeVinLocal } from '@/lib/vin/wmi';
import { createClient } from '@/lib/supabase/server';

/**
 * Resultado normalizado de la decodificación del VIN.
 * Se devuelve al cliente y se cachea en `vehicle_lookups`.
 */
interface DecodeResult {
  make: string;
  model: string;
  year: number | null;
  country: string;
  fuel: string;
  engine: string;
  displacement: string;
  /** Fuentes que aportaron datos: 'local', 'vpic', 'cache' */
  sources: string[];
}

/** Timeout para la llamada a NHTSA vPIC (5 segundos) */
const VPIC_TIMEOUT_MS = 5_000;

/**
 * POST /api/vin/decode
 *
 * Flujo:
 *   1. Valida el VIN localmente (ISO 3779)
 *   2. Busca en caché (vehicle_lookups)
 *   3. Si no hay caché: decodificación local (WMI) + NHTSA vPIC (con timeout)
 *   4. Combina resultados (local como base, vPIC sobrescribe si aporta)
 *   5. Guarda en caché y devuelve
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vin: string = body.vin?.trim()?.toUpperCase() ?? '';

    // ── 1. Validación local ──
    const validation = validateVIN(vin);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errorMessage ?? 'VIN inválido', code: validation.errorCode },
        { status: 400 },
      );
    }

    // ── 2. Buscar en caché (vehicle_lookups) ──
    const supabase = createClient();
    const { data: cached } = await supabase
      .from('vehicle_lookups')
      .select('data')
      .eq('clave', vin)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached?.data) {
      const cachedResult = cached.data as DecodeResult;
      return NextResponse.json({ ...cachedResult, sources: ['cache'] });
    }

    // ── 3. Decodificación local (WMI + año) ──
    const local = decodeVinLocal(vin);

    const result: DecodeResult = {
      make: local.make,
      model: '',
      year: local.year,
      country: local.country,
      fuel: '',
      engine: '',
      displacement: '',
      sources: ['local'],
    };

    // ── 4. Llamar a NHTSA vPIC (gratuita, sin API key) ──
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), VPIC_TIMEOUT_MS);

      const vpicUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`;
      const vpicResponse = await fetch(vpicUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeout);

      if (vpicResponse.ok) {
        const vpicData = await vpicResponse.json();
        const vpicResult = vpicData?.Results?.[0];

        if (vpicResult) {
          // Solo sobrescribir con datos útiles (vPIC devuelve "" o "Not Applicable" para datos vacíos)
          const isUseful = (val: string | undefined | null): val is string =>
            !!val && val.trim() !== '' && val !== 'Not Applicable';

          if (isUseful(vpicResult.Make)) {
            result.make = vpicResult.Make.toUpperCase();
          }
          if (isUseful(vpicResult.Model)) {
            result.model = vpicResult.Model.toUpperCase();
          }
          if (isUseful(vpicResult.ModelYear)) {
            const parsedYear = parseInt(vpicResult.ModelYear, 10);
            if (!isNaN(parsedYear)) result.year = parsedYear;
          }
          if (isUseful(vpicResult.FuelTypePrimary)) {
            result.fuel = vpicResult.FuelTypePrimary;
          }
          if (isUseful(vpicResult.EngineModel)) {
            result.engine = vpicResult.EngineModel;
          }
          if (isUseful(vpicResult.DisplacementL)) {
            result.displacement = `${vpicResult.DisplacementL}L`;
          }

          result.sources.push('vpic');
        }
      }
    } catch (vpicError: unknown) {
      // vPIC falló o hizo timeout → seguimos con datos locales, nunca bloqueamos al operario
      const errorMessage = vpicError instanceof Error ? vpicError.message : 'Unknown error';
      console.warn(`[VIN Decode] vPIC falló para ${vin}: ${errorMessage}`);
    }

    // ── 5. Guardar en caché (vehicle_lookups) ──
    try {
      await supabase.from('vehicle_lookups').insert({
        clave: vin,
        data: result,
        proveedor: result.sources.includes('vpic') ? 'vpic' : 'local',
      });
    } catch (cacheError) {
      // Si falla el caché, no bloqueamos la respuesta
      console.warn('[VIN Decode] Error guardando en caché:', cacheError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[VIN Decode] Error general:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - Se usa AbortController con 5s de timeout para que vPIC nunca bloquee al operario.
 * - La función `isUseful` filtra strings vacíos y "Not Applicable" que vPIC devuelve
 *   frecuentemente para vehículos europeos no vendidos en EE.UU.
 * - La caché en vehicle_lookups evita llamadas repetidas a vPIC para el mismo VIN.
 * - Si Supabase no está disponible (ej. sin auth en modo bypass), el caché falla
 *   silenciosamente y la ruta devuelve datos igualmente.
 */
