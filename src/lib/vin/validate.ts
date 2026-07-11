/**
 * validate.ts — Validación local del VIN (ISO 3779)
 *
 * Verifica:
 *   1. Longitud exacta de 17 caracteres
 *   2. Exclusión de I, O, Q (confusión visual con 1, 0, 9)
 *   3. Solo alfanuméricos válidos
 *   4. Dígito de control en posición 9 según ISO 3779
 *
 * No realiza ninguna llamada de red.
 */

/** Pesos posicionales para el cálculo del check digit ISO 3779 */
const WEIGHTS: readonly number[] = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Tabla de transliteración: carácter alfanumérico → valor numérico */
const TRANSLITERATION: Readonly<Record<string, number>> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5,
  P: 7,
  R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

/** Regex que admite solo los caracteres válidos de un VIN (A-Z sin I/O/Q, 0-9) */
const VIN_CHAR_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * Resultado detallado de la validación de un VIN.
 * Permite al consumidor saber *qué* falló, no solo si pasó o no.
 */
export interface VinValidationResult {
  valid: boolean;
  /** Código de error si no es válido */
  errorCode?: 'WRONG_LENGTH' | 'INVALID_CHARS' | 'FORBIDDEN_CHARS' | 'BAD_CHECK_DIGIT';
  /** Mensaje de error legible en español para la UI */
  errorMessage?: string;
}

/**
 * Valida un VIN según la norma ISO 3779.
 *
 * @param vin - Cadena a validar (se normaliza internamente a mayúsculas)
 * @returns `true` si el VIN pasa todas las comprobaciones
 *
 * @remarks
 * Algunos fabricantes europeos (especialmente antes de 1981 y ciertos modelos
 * del grupo PSA y Fiat) no calculan el check digit según esta norma. En esos
 * casos, la función devolverá `false` aunque el VIN sea "real". El formulario
 * del operario permite sobrescribir la validación si lo necesita.
 */
export function isValidVIN(vin: string): boolean {
  return validateVIN(vin).valid;
}

/**
 * Validación detallada del VIN con información del error.
 *
 * @param vin - Cadena a validar
 * @returns Objeto con el resultado y, si falla, el código y mensaje del error
 */
export function validateVIN(vin: string): VinValidationResult {
  if (!vin || vin.length !== 17) {
    return {
      valid: false,
      errorCode: 'WRONG_LENGTH',
      errorMessage: 'El VIN debe tener exactamente 17 caracteres.',
    };
  }

  const upper = vin.toUpperCase();

  if (/[IOQ]/.test(upper)) {
    return {
      valid: false,
      errorCode: 'FORBIDDEN_CHARS',
      errorMessage: 'El VIN no puede contener las letras I, O ni Q.',
    };
  }

  if (!VIN_CHAR_REGEX.test(upper)) {
    return {
      valid: false,
      errorCode: 'INVALID_CHARS',
      errorMessage: 'El VIN solo puede contener letras A-Z (sin I/O/Q) y dígitos 0-9.',
    };
  }

  // Cálculo del check digit (posición 9, índice 8)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = upper[i];
    const value = TRANSLITERATION[char];
    if (value === undefined) {
      return { valid: false, errorCode: 'INVALID_CHARS', errorMessage: `Carácter no reconocido: ${char}` };
    }
    sum += value * WEIGHTS[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 10 ? 'X' : String(remainder);
  const actualCheckDigit = upper[8];

  if (expectedCheckDigit !== actualCheckDigit) {
    return {
      valid: false,
      errorCode: 'BAD_CHECK_DIGIT',
      errorMessage: `Dígito de control inválido (esperado ${expectedCheckDigit}, encontrado ${actualCheckDigit}).`,
    };
  }

  return { valid: true };
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - Se mantiene `isValidVIN` como wrapper booleano simple para retrocompatibilidad.
 * - `validateVIN` expone el detalle del error para la UI (mostrar mensajes específicos).
 * - El peso de la posición 9 es 0 porque es la propia posición del check digit.
 * - Edge case: algunos fabricantes europeos no respetan ISO 3779. Se documenta en
 *   los comentarios y el formulario permite sobrescribir manualmente.
 */
