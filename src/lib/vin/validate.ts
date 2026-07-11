/**
 * validate.ts — Validación local del VIN (ISO 3779)
 *
 * Verifica:
 *   1. Longitud exacta de 17 caracteres
 *   2. Exclusión de I, O, Q (confusión visual con 1, 0, 9)
 *   3. Solo alfanuméricos válidos
 *   4. Dígito de control en posición 9 según ISO 3779 (WARNING, no bloqueo)
 *
 * No realiza ninguna llamada de red.
 *
 * Lección Aprendida: La norma ISO 3779 del check digit solo es obligatoria
 * en Norteamérica. La mayoría de fabricantes europeos (Volvo, SEAT, VW,
 * Renault, BMW, PSA, Fiat…) NO la respetan — usan la posición 9 para otros
 * fines. Por eso, el check digit se trata como WARNING y nunca bloquea al
 * operario.
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
 */
export interface VinValidationResult {
  /** true si el VIN pasa las comprobaciones obligatorias (longitud + caracteres) */
  valid: boolean;
  /** Código de error si no es válido */
  errorCode?: 'WRONG_LENGTH' | 'INVALID_CHARS' | 'FORBIDDEN_CHARS';
  /** Mensaje de error legible en español para la UI */
  errorMessage?: string;
  /** true si el check digit ISO 3779 es correcto (solo informativo) */
  checkDigitValid: boolean;
  /** Aviso si el check digit no coincide (no es un error bloqueante) */
  checkDigitWarning?: string;
}

/**
 * Valida un VIN comprobando longitud y caracteres válidos.
 * El check digit NO bloquea — la mayoría de fabricantes europeos no lo usan.
 *
 * @param vin - Cadena a validar (se normaliza internamente a mayúsculas)
 * @returns `true` si el VIN pasa las comprobaciones obligatorias
 */
export function isValidVIN(vin: string): boolean {
  return validateVIN(vin).valid;
}

/**
 * Validación detallada del VIN con información del error y aviso de check digit.
 *
 * @param vin - Cadena a validar
 * @returns Objeto con el resultado, errores bloqueantes y avisos informativos
 */
export function validateVIN(vin: string): VinValidationResult {
  if (!vin || vin.length !== 17) {
    return {
      valid: false,
      checkDigitValid: false,
      errorCode: 'WRONG_LENGTH',
      errorMessage: 'El VIN debe tener exactamente 17 caracteres.',
    };
  }

  const upper = vin.toUpperCase();

  if (/[IOQ]/.test(upper)) {
    return {
      valid: false,
      checkDigitValid: false,
      errorCode: 'FORBIDDEN_CHARS',
      errorMessage: 'El VIN no puede contener las letras I, O ni Q.',
    };
  }

  if (!VIN_CHAR_REGEX.test(upper)) {
    return {
      valid: false,
      checkDigitValid: false,
      errorCode: 'INVALID_CHARS',
      errorMessage: 'El VIN solo puede contener letras A-Z (sin I/O/Q) y dígitos 0-9.',
    };
  }

  // Cálculo del check digit (posición 9, índice 8) — solo informativo
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = upper[i];
    const value = TRANSLITERATION[char];
    if (value === undefined) {
      return {
        valid: false,
        checkDigitValid: false,
        errorCode: 'INVALID_CHARS',
        errorMessage: `Carácter no reconocido: ${char}`,
      };
    }
    sum += value * WEIGHTS[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 10 ? 'X' : String(remainder);
  const actualCheckDigit = upper[8];
  const checkDigitValid = expectedCheckDigit === actualCheckDigit;

  return {
    valid: true, // Siempre válido si longitud y caracteres están bien
    checkDigitValid,
    checkDigitWarning: checkDigitValid
      ? undefined
      : `Check digit ISO 3779 no coincide (esto es normal en fabricantes europeos).`,
  };
}

/**
 * ==========================================
 * Documentación de Memoria
 * ==========================================
 * - LECCIÓN APRENDIDA (2026-07-11): El check digit ISO 3779 NO es universal.
 *   Fabricantes europeos como Volvo (YV1BZ714681016153), SEAT, VW, Renault,
 *   BMW, PSA, Fiat… no lo respetan. Solo es obligatorio en Norteamérica.
 *   Por eso, el check digit se trata como WARNING informativo, nunca como
 *   bloqueo. El operario no debe quedarse atascado por un VIN real.
 * - `isValidVIN` sigue siendo retrocompatible (booleano).
 * - `validateVIN` expone `checkDigitValid` y `checkDigitWarning` para que
 *   la UI pueda mostrar un aviso sutil sin impedir la operación.
 */
