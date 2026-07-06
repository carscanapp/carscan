export function isValidVIN(vin: string): boolean {
  // 1. Debe tener 17 caracteres exactos
  if (vin.length !== 17) {
    return false;
  }

  // 2. Convertir a mayúsculas
  const upperVin = vin.toUpperCase();

  // 3. No puede contener I, O, Q
  if (/[IOQ]/.test(upperVin)) {
    return false;
  }

  // 4. Caracteres permitidos: 0-9, A-Z (excluyendo I, O, Q)
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(upperVin)) {
    return false;
  }

  // 5. Cálculo del dígito de control (ISO 3779)
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const values: Record<string, number> = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5,
    'P': 7,
    'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = upperVin[i];
    sum += values[char] * weights[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 10 ? 'X' : remainder.toString();
  const actualCheckDigit = upperVin[8];

  // IMPORTANTE: Algunos fabricantes no siguen la norma ISO 3779 en Europa, 
  // pero el requerimiento solicita específicamente "dígito de control ISO 3779".
  return expectedCheckDigit === actualCheckDigit;
}
