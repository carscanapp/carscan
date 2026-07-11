import { isValidVIN, validateVIN } from '../validate';

describe('VIN Validation (ISO 3779)', () => {
  // ─────────────────────────────────────────────────────────────
  // VINs válidos conocidos (check digit calculado correctamente)
  // ─────────────────────────────────────────────────────────────
  describe('VINs válidos', () => {
    const validVINs = [
      { vin: '1HGBH41JXMN109186', desc: 'Honda Civic (USA)' },
      { vin: '11111111111111111', desc: 'Todos unos (check digit = 1)' },
      { vin: '1M8GDM9AXKP042788', desc: 'General Motors' },
      { vin: '5YJSA1DN0DFP14705', desc: 'Tesla Model S' },
    ];

    test.each(validVINs)('$desc ($vin) es válido', ({ vin }) => {
      expect(isValidVIN(vin)).toBe(true);
    });

    it('acepta minúsculas (se normalizan internamente)', () => {
      expect(isValidVIN('1hgbh41jxmn109186')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // VINs inválidos
  // ─────────────────────────────────────────────────────────────
  describe('VINs inválidos', () => {
    it('rechaza cadenas vacías', () => {
      const result = validateVIN('');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('WRONG_LENGTH');
    });

    it('rechaza VINs de menos de 17 caracteres', () => {
      const result = validateVIN('1HGBH41JX');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('WRONG_LENGTH');
    });

    it('rechaza VINs de más de 17 caracteres', () => {
      const result = validateVIN('1HGBH41JXMN1091861');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('WRONG_LENGTH');
    });

    it('rechaza VINs con la letra I', () => {
      const result = validateVIN('1HGBH41IXMN10918X');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN_CHARS');
    });

    it('rechaza VINs con la letra O', () => {
      const result = validateVIN('1HGBH41OXMN10918X');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN_CHARS');
    });

    it('rechaza VINs con la letra Q', () => {
      const result = validateVIN('1HGBH41QXMN10918X');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN_CHARS');
    });

    it('rechaza VINs con caracteres especiales', () => {
      const result = validateVIN('1HGBH41J-MN10918');
      expect(result.valid).toBe(false);
    });

    it('rechaza un VIN con check digit incorrecto', () => {
      // Cambiamos el check digit (posición 9) de 'X' a '0'
      const result = validateVIN('1HGBH41J0MN109186');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('BAD_CHECK_DIGIT');
    });

    it('rechaza un VIN manipulado (un solo carácter cambiado)', () => {
      // VIN original válido: 1M8GDM9AXKP042788
      // Cambiamos la última cifra de 8 a 9 → check digit ya no cuadra
      const result = validateVIN('1M8GDM9AXKP042789');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('BAD_CHECK_DIGIT');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Detalle de errores
  // ─────────────────────────────────────────────────────────────
  describe('Mensajes de error detallados', () => {
    it('devuelve mensaje en español para longitud incorrecta', () => {
      const result = validateVIN('ABC');
      expect(result.errorMessage).toContain('17 caracteres');
    });

    it('devuelve mensaje en español para check digit incorrecto', () => {
      const result = validateVIN('1HGBH41J0MN109186');
      expect(result.errorMessage).toContain('Dígito de control');
    });

    it('devuelve valid=true sin errorCode para VINs correctos', () => {
      const result = validateVIN('1HGBH41JXMN109186');
      expect(result.valid).toBe(true);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });
  });
});
