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
  power: string;
  transmission: string;
  bodyType: string;
  /** Fuentes que aportaron datos: 'local', 'vincario', 'cache' */
  sources: string[];
}

/** Timeout para la llamada a Vincario (5 segundos) */
const VINCARIO_TIMEOUT_MS = 5_000;

/**
 * POST /api/vin/decode
 *
 * Flujo:
 *   1. Valida el VIN localmente (longitud + caracteres)
 *   2. Busca en caché (vehicle_lookups)
 *   3. Si no hay caché: decodificación local (WMI) + Vincario API
 *   4. Combina: datos locales como base + Vincario sobrescribe si aporta
 *   5. Guarda el resultado en vehicle_lookups y lo devuelve
 *   6. Si Vincario falla o no responde en 5s, devuelve solo datos locales
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

    // ── 3. Decodificación local (WMI + año) como base segura ──
    const local = decodeVinLocal(vin);

    const result: DecodeResult = {
      make: local.make,
      model: '',
      year: local.year,
      country: local.country,
      fuel: '',
      engine: '',
      displacement: '',
      power: '',
      transmission: '',
      bodyType: '',
      sources: ['local'],
    };

    // ── 4. Llamar a Vincario API ──
    try {
      const apiKey = process.env.VINDECODER_API_KEY;
      const secretKey = process.env.VINDECODER_SECRET_KEY;

      if (!apiKey || !secretKey) {
        console.warn('[VIN Decode] Vincario API keys no configuradas, usando solo datos locales');
      } else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), VINCARIO_TIMEOUT_MS);

        const vincarioUrl = `https://api.vindecoder.eu/3.2/${apiKey}/${secretKey}/decode/${vin}.json`;
        const vincarioResponse = await fetch(vincarioUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        clearTimeout(timeout);

        if (vincarioResponse.ok) {
          const vincarioData = await vincarioResponse.json();

          // Vincario devuelve un array "decode" con objetos {id, label, value}
          if (vincarioData?.decode && Array.isArray(vincarioData.decode)) {
            const decoded = vincarioData.decode;

            /**
             * Helper: busca un valor en el array de decode por su label o id.
             * Devuelve null si no existe o si el valor está vacío.
             */
            const findValue = (labels: string[], ids: string[] = []): string | null => {
              for (const item of decoded) {
                const matchLabel = labels.some((l) =>
                  item.label?.toLowerCase().includes(l.toLowerCase()),
                );
                const matchId = ids.some((id) => item.id === id);
                if (matchLabel || matchId) {
                  const val = String(item.value ?? '').trim();
                  if (val && val !== 'null' && val !== 'undefined') return val;
                }
              }
              return null;
            };

            const make = findValue(['Make'], ['make']);
            const model = findValue(['Model'], ['model']);
            const year = findValue(['Model Year', 'Production Year'], ['model_year']);
            const fuel = findValue(['Fuel Type', 'Fuel'], ['fuel_type_primary']);
            const engine = findValue(['Engine Code', 'Engine Model', 'Engine Type'], ['engine_code', 'engine_type']);
            const displacement = findValue(['Displacement', 'Engine Displacement'], ['displacement']);
            const power = findValue(['Power', 'Engine Power'], ['engine_power_kw', 'engine_power_hp']);
            const transmission = findValue(['Transmission', 'Gearbox'], ['transmission']);
            const bodyType = findValue(['Body', 'Body Type', 'Body Style'], ['body_type']);

            if (make) result.make = make.toUpperCase();
            if (model) result.model = model.toUpperCase();
            if (year) {
              const parsedYear = parseInt(year, 10);
              if (!isNaN(parsedYear)) result.year = parsedYear;
            }
            if (fuel) result.fuel = fuel;
            if (engine) result.engine = engine;
            if (displacement) result.displacement = displacement;
            if (power) result.power = power;
            if (transmission) result.transmission = transmission;
            if (bodyType) result.bodyType = bodyType;

            result.sources.push('vincario');
          }
        } else {
          const errorText = await vincarioResponse.text();
          console.warn(`[VIN Decode] Vincario respondió ${vincarioResponse.status}: ${errorText}`);
        }
      }
    } catch (vincarioError: unknown) {
      // Vincario falló o hizo timeout → seguimos con datos locales
      const errorMessage = vincarioError instanceof Error ? vincarioError.message : 'Unknown error';
      console.warn(`[VIN Decode] Vincario falló para ${vin}: ${errorMessage}`);
    }

    // ── 5. Guardar en caché (vehicle_lookups) ──
    try {
      await supabase.from('vehicle_lookups').insert({
        clave: vin,
        data: result,
        proveedor: result.sources.includes('vincario') ? 'vincario' : 'local',
      });
    } catch (cacheError) {
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
 * - Se usa Vincario (API de pago, ~0.05€/consulta) en vez de NHTSA vPIC.
 *   Vincario da datos mucho más completos para coches europeos: motor, 
 *   combustible, potencia, transmisión, carrocería.
 * - La decodificación local (WMI) se mantiene como fallback gratuito: si 
 *   Vincario falla o hace timeout (5s), el operario nunca se queda bloqueado.
 * - La caché en vehicle_lookups evita consultas repetidas (y costes) para 
 *   el mismo VIN.
 * - Vincario devuelve un array `decode` con objetos {id, label, value}.
 *   El helper `findValue` busca por label e id para ser resiliente a cambios
 *   en la API.
 * - LECCIÓN APRENDIDA: NHTSA vPIC es gratuita pero inútil para coches
 *   europeos (no da motor ni combustible). Vincario es la opción correcta
 *   para el mercado español.
 */
