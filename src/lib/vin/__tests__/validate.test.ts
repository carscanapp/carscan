import { isValidVIN, validateVIN } from '../validate';

describe('VIN Validation (ISO 3779)', () => {
  // ─────────────────────────────────────────────────────────────
  // VINs válidos conocidos (longitud + caracteres correctos)
  // ─────────────────────────────────────────────────────────────
  describe('VINs válidos', () => {
    const validVINs = [
      { vin: '1HGBH41JXMN109186', desc: 'Honda Civic (USA)', checkDigitOk: true },
      { vin: '11111111111111111', desc: 'Todos unos (check digit = 1)', checkDigitOk: true },
      { vin: '1M8GDM9AXKP042788', desc: 'General Motors', checkDigitOk: true },
      { vin: '5YJSA1DN0DFP14705', desc: 'Tesla Model S', checkDigitOk: true },
      { vin: 'YV1BZ714681016153', desc: 'Volvo S80 (europeo, check digit no aplica)', checkDigitOk: false },
      { vin: 'VSSZZZ5FZLR000001', desc: 'SEAT (europeo, check digit no aplica)', checkDigitOk: false },
      { vin: 'WF0XXXGCDX1234567', desc: 'Ford Europa (check digit no aplica)', checkDigitOk: false },
    ];

    test.each(validVINs)('$desc ($vin) pasa validación', ({ vin, checkDigitOk }) => {
      expect(isValidVIN(vin)).toBe(true);
      const result = validateVIN(vin);
      expect(result.valid).toBe(true);
      expect(result.checkDigitValid).toBe(checkDigitOk);
    });

    it('acepta minúsculas (se normalizan internamente)', () => {
      expect(isValidVIN('1hgbh41jxmn109186')).toBe(true);
    });

    it('muestra warning para VINs europeos con check digit diferente', () => {
      const result = validateVIN('YV1BZ714681016153');
      expect(result.valid).toBe(true);
      expect(result.checkDigitValid).toBe(false);
      expect(result.checkDigitWarning).toBeDefined();
      expect(result.checkDigitWarning).toContain('europeos');
    });

    it('no muestra warning cuando el check digit es correcto', () => {
      const result = validateVIN('1HGBH41JXMN109186');
      expect(result.valid).toBe(true);
      expect(result.checkDigitValid).toBe(true);
      expect(result.checkDigitWarning).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // VINs inválidos (estos sí se bloquean)
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
  });

  // ─────────────────────────────────────────────────────────────
  // Detalle de errores y warnings
  // ─────────────────────────────────────────────────────────────
  describe('Mensajes de error detallados', () => {
    it('devuelve mensaje en español para longitud incorrecta', () => {
      const result = validateVIN('ABC');
      expect(result.errorMessage).toContain('17 caracteres');
    });

    it('devuelve valid=true sin errorCode para VINs correctos', () => {
      const result = validateVIN('1HGBH41JXMN109186');
      expect(result.valid).toBe(true);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it('un VIN con check digit incorrecto es VÁLIDO pero con warning', () => {
      // Cambiamos el check digit (posición 9) de 'X' a '0'
      const result = validateVIN('1HGBH41J0MN109186');
      expect(result.valid).toBe(true); // NO bloquea
      expect(result.checkDigitValid).toBe(false);
      expect(result.checkDigitWarning).toBeDefined();
    });
  });
});
