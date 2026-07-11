/**
 * wmi.ts — Decodificación local del WMI (World Manufacturer Identifier)
 *
 * Los 3 primeros caracteres del VIN identifican al fabricante y el país
 * de producción. La posición 10 codifica el año del modelo.
 *
 * Esta tabla cubre los fabricantes más habituales en el mercado español
 * de desguace. No requiere ninguna llamada de red.
 */

// ─────────────────────────────────────────────────────────────
// 1. Interfaces
// ─────────────────────────────────────────────────────────────

export interface WmiEntry {
  make: string;
  country: string;
}

export interface VinLocalDecodeResult {
  /** Fabricante deducido del WMI (ej. "SEAT", "RENAULT") */
  make: string;
  /** País de fabricación deducido del WMI */
  country: string;
  /** Año del modelo deducido de la posición 10 */
  year: number | null;
  /** true si la decodificación proviene solo de datos locales (sin API externa) */
  localOnly: boolean;
}

// ─────────────────────────────────────────────────────────────
// 2. Tabla WMI → Fabricante + País
// ─────────────────────────────────────────────────────────────
// Fuente: ISO 3780, Wikipedia "World manufacturer identifier"
// Se prioriza el mercado español (marcas más frecuentes en desguaces).

const WMI_TABLE: Readonly<Record<string, WmiEntry>> = {
  // ── SEAT ──
  VSS: { make: 'SEAT', country: 'España' },

  // ── Volkswagen ──
  WVW: { make: 'VOLKSWAGEN', country: 'Alemania' },
  WV1: { make: 'VOLKSWAGEN', country: 'Alemania' },
  WV2: { make: 'VOLKSWAGEN', country: 'Alemania' },
  WV3: { make: 'VOLKSWAGEN', country: 'Alemania' },
  '3VW': { make: 'VOLKSWAGEN', country: 'México' },

  // ── Audi ──
  WAU: { make: 'AUDI', country: 'Alemania' },
  WUA: { make: 'AUDI', country: 'Alemania' },

  // ── Škoda ──
  TMB: { make: 'ŠKODA', country: 'República Checa' },
  TMP: { make: 'ŠKODA', country: 'República Checa' },

  // ── Renault ──
  VF1: { make: 'RENAULT', country: 'Francia' },
  VF2: { make: 'RENAULT', country: 'Francia' },
  VF6: { make: 'RENAULT', country: 'Francia' },
  GA1: { make: 'RENAULT', country: 'Francia' },

  // ── Dacia (grupo Renault) ──
  UU1: { make: 'DACIA', country: 'Rumanía' },
  UU6: { make: 'DACIA', country: 'Rumanía' },

  // ── Peugeot ──
  VF3: { make: 'PEUGEOT', country: 'Francia' },
  VR3: { make: 'PEUGEOT', country: 'Francia' },

  // ── Citroën ──
  VF7: { make: 'CITROËN', country: 'Francia' },
  VR7: { make: 'CITROËN', country: 'Francia' },

  // ── DS Automobiles ──
  VR1: { make: 'DS', country: 'Francia' },

  // ── Ford ──
  WF0: { make: 'FORD', country: 'Alemania' },
  VS6: { make: 'FORD', country: 'España' },
  WFD: { make: 'FORD', country: 'Alemania' },
  UN1: { make: 'FORD', country: 'Alemania' },
  '1FA': { make: 'FORD', country: 'EE.UU.' },
  '1FT': { make: 'FORD', country: 'EE.UU.' },

  // ── Opel / Vauxhall ──
  W0L: { make: 'OPEL', country: 'Alemania' },
  W0V: { make: 'OPEL', country: 'Alemania' },

  // ── Fiat / Alfa Romeo / Lancia ──
  ZFA: { make: 'FIAT', country: 'Italia' },
  ZAR: { make: 'ALFA ROMEO', country: 'Italia' },
  ZLA: { make: 'LANCIA', country: 'Italia' },

  // ── Toyota ──
  JTD: { make: 'TOYOTA', country: 'Japón' },
  JTE: { make: 'TOYOTA', country: 'Japón' },
  SB1: { make: 'TOYOTA', country: 'Reino Unido' },
  NMT: { make: 'TOYOTA', country: 'Turquía' },

  // ── BMW ──
  WBA: { make: 'BMW', country: 'Alemania' },
  WBS: { make: 'BMW', country: 'Alemania' },
  WBY: { make: 'BMW', country: 'Alemania' },

  // ── MINI (grupo BMW) ──
  WMW: { make: 'MINI', country: 'Alemania/UK' },

  // ── Mercedes-Benz ──
  WDB: { make: 'MERCEDES-BENZ', country: 'Alemania' },
  WDC: { make: 'MERCEDES-BENZ', country: 'Alemania' },
  WDD: { make: 'MERCEDES-BENZ', country: 'Alemania' },
  WDF: { make: 'MERCEDES-BENZ', country: 'Alemania' },
  W1K: { make: 'MERCEDES-BENZ', country: 'Alemania' },
  W1N: { make: 'MERCEDES-BENZ', country: 'Alemania' },
  W1V: { make: 'MERCEDES-BENZ', country: 'Alemania' },

  // ── Kia ──
  KNA: { make: 'KIA', country: 'Corea del Sur' },
  KNC: { make: 'KIA', country: 'Corea del Sur' },
  U5Y: { make: 'KIA', country: 'Eslovaquia' },

  // ── Hyundai ──
  KMH: { make: 'HYUNDAI', country: 'Corea del Sur' },
  NLE: { make: 'HYUNDAI', country: 'Turquía' },
  TME: { make: 'HYUNDAI', country: 'República Checa' },

  // ── Nissan ──
  JN1: { make: 'NISSAN', country: 'Japón' },
  VSK: { make: 'NISSAN', country: 'España' },
  SJN: { make: 'NISSAN', country: 'Reino Unido' },

  // ── Mazda ──
  JM1: { make: 'MAZDA', country: 'Japón' },
  JMZ: { make: 'MAZDA', country: 'Japón' },

  // ── Honda ──
  JHM: { make: 'HONDA', country: 'Japón' },
  SHH: { make: 'HONDA', country: 'Reino Unido' },

  // ── Suzuki ──
  JSA: { make: 'SUZUKI', country: 'Japón' },
  TSM: { make: 'SUZUKI', country: 'Hungría' },

  // ── Volvo ──
  YV1: { make: 'VOLVO', country: 'Suecia' },
  YV4: { make: 'VOLVO', country: 'Suecia' },

  // ── Porsche ──
  WP0: { make: 'PORSCHE', country: 'Alemania' },
  WP1: { make: 'PORSCHE', country: 'Alemania' },

  // ── Mitsubishi ──
  JMB: { make: 'MITSUBISHI', country: 'Japón' },
  JMY: { make: 'MITSUBISHI', country: 'Japón' },

  // ── Subaru ──
  JF1: { make: 'SUBARU', country: 'Japón' },
  JF2: { make: 'SUBARU', country: 'Japón' },

  // ── Jeep / Chrysler / Dodge (Stellantis) ──
  '1C4': { make: 'JEEP', country: 'EE.UU.' },
  '1J4': { make: 'JEEP', country: 'EE.UU.' },

  // ── Tesla ──
  '5YJ': { make: 'TESLA', country: 'EE.UU.' },
  LRW: { make: 'TESLA', country: 'China' },

  // ── Land Rover / Jaguar ──
  SAL: { make: 'LAND ROVER', country: 'Reino Unido' },
  SAJ: { make: 'JAGUAR', country: 'Reino Unido' },

  // ── Cupra (desde 2018, grupo VW/SEAT) ──
  // Cupra utiliza el mismo WMI que SEAT (VSS) por ahora
};

// ─────────────────────────────────────────────────────────────
// 3. Tabla de año de modelo (posición 10 del VIN)
// ─────────────────────────────────────────────────────────────
// La posición 10 codifica el año del modelo en ciclos de 30 años:
//   Ciclo 1: 1980–2009
//   Ciclo 2: 2010–2039
// Usamos el ciclo 2 por defecto ya que es el más probable en un desguace actual.

const YEAR_CODES: Readonly<Record<string, number[]>> = {
  A: [1980, 2010],
  B: [1981, 2011],
  C: [1982, 2012],
  D: [1983, 2013],
  E: [1984, 2014],
  F: [1985, 2015],
  G: [1986, 2016],
  H: [1987, 2017],
  J: [1988, 2018],
  K: [1989, 2019],
  L: [1990, 2020],
  M: [1991, 2021],
  N: [1992, 2022],
  P: [1993, 2023],
  R: [1994, 2024],
  S: [1995, 2025],
  T: [1996, 2026],
  V: [1997, 2027],
  W: [1998, 2028],
  X: [1999, 2029],
  Y: [2000, 2030],
  '1': [2001, 2031],
  '2': [2002, 2032],
  '3': [2003, 2033],
  '4': [2004, 2034],
  '5': [2005, 2035],
  '6': [2006, 2036],
  '7': [2007, 2037],
  '8': [2008, 2038],
  '9': [2009, 2039],
};

// ─────────────────────────────────────────────────────────────
// 4. Funciones públicas
// ─────────────────────────────────────────────────────────────

/**
 * Busca en la tabla WMI un fabricante a partir de los 3 primeros caracteres del VIN.
 *
 * @param wmi - Primeros 3 caracteres del VIN (ya en mayúsculas)
 * @returns La entrada WMI o `null` si el fabricante no está en la tabla
 */
export function lookupWmi(wmi: string): WmiEntry | null {
  return WMI_TABLE[wmi.toUpperCase()] ?? null;
}

/**
 * Decodifica el año del modelo a partir del carácter en la posición 10 del VIN.
 *
 * @param yearChar - Carácter de la posición 10
 * @returns El año más probable (ciclo 2: 2010-2039 por defecto) o `null`
 *
 * @remarks
 * Heurística: si el año del ciclo 2 es posterior al año actual, devolvemos
 * el año del ciclo 1. Esto cubre coches fabricados antes de 2010.
 */
export function decodeModelYear(yearChar: string): number | null {
  const upper = yearChar.toUpperCase();
  const years = YEAR_CODES[upper];

  if (!years) return null;

  const currentYear = new Date().getFullYear();
  // Preferir el ciclo 2 (2010+), pero si es futuro, caer al ciclo 1
  return years[1] <= currentYear ? years[1] : years[0];
}

/**
 * Decodificación local completa de un VIN sin llamadas de red.
 *
 * Combina la tabla WMI (fabricante + país) con la decodificación del año.
 * Si el WMI no está en la tabla, devuelve strings vacíos para make/country
 * pero aún intenta decodificar el año.
 *
 * @param vin - VIN de 17 caracteres (no se valida aquí; usar `validateVIN` antes)
 * @returns Datos decodificados localmente
 *
 * @example
 * ```ts
 * decodeVinLocal('VSSZZZ5FZLR000001');
 * // → { make: 'SEAT', country: 'España', year: 2020, localOnly: true }
 * ```
 */
export function decodeVinLocal(vin: string): VinLocalDecodeResult {
  const upper = vin.toUpperCase();
  const wmi = upper.substring(0, 3);
  const yearChar = upper[9]; // Posición 10 (índice 9)

  const wmiData = lookupWmi(wmi);
  const year = decodeModelYear(yearChar);

  return {
    make: wmiData?.make ?? '',
    country: wmiData?.country ?? '',
    year,
    localOnly: true,
  };
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - La tabla WMI se centra en el mercado español de desguace. Se puede ampliar
 *   fácilmente añadiendo entradas al objeto WMI_TABLE.
 * - Los años se decodifican con heurística de "ciclo más reciente válido" para
 *   que un coche de 2015 (código F) no se confunda con uno de 1985.
 * - Edge case: CUPRA comparte WMI con SEAT (VSS). Sin más información del VDS
 *   (posiciones 4-8) no se puede diferenciar automáticamente.
 * - Edge case: algunos fabricantes (ej. Mercedes) tienen múltiples WMIs por
 *   tipo de vehículo (turismo vs furgoneta). Se cubren los más comunes.
 */
