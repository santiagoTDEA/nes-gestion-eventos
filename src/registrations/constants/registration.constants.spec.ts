import { describe, it, expect } from '@jest/globals';

import {
  RegistrationData,
  normalizeRegistration,
  validateRegistration,
} from './registration.constants';

const valid: RegistrationData = {
  documentType: 'CC',
  documentNumber: '1037654321',
  firstNames: 'Santiago',
  lastNames: 'Ospina',
  email: 'santiago@correo.com',
  phone: '3001234567',
};

const errorsFor = (changes: Partial<RegistrationData>) =>
  validateRegistration({ ...valid, ...changes });

describe('normalizeRegistration', () => {
  it('limpia espacios, mayúsculas y separadores', () => {
    expect(
      normalizeRegistration({
        documentType: ' cc ',
        documentNumber: '1.037.654-321',
        firstNames: '  María   José ',
        lastNames: 'Pérez  Gómez',
        email: ' Maria@Correo.COM ',
        phone: '(300) 123-4567',
      }),
    ).toEqual({
      documentType: 'CC',
      documentNumber: '1037654321',
      firstNames: 'María José',
      lastNames: 'Pérez Gómez',
      email: 'maria@correo.com',
      phone: '3001234567',
    });
  });

  it('pasa a mayúsculas los documentos con letras para detectar duplicados', () => {
    expect(
      normalizeRegistration({ documentNumber: 'ab-12.345' }).documentNumber,
    ).toBe('AB12345');
  });

  it('convierte los valores ausentes en texto vacío', () => {
    expect(normalizeRegistration({})).toEqual({
      documentType: '',
      documentNumber: '',
      firstNames: '',
      lastNames: '',
      email: '',
      phone: '',
    });
  });
});

describe('validateRegistration', () => {
  it('acepta datos válidos para registrar asistencia', () => {
    expect(validateRegistration(valid)).toEqual([]);
  });

  it('informa primero los datos que faltan', () => {
    expect(errorsFor({ email: '', phone: '' })).toEqual([
      'Falta: Correo electrónico, Teléfono',
    ]);
  });

  it('rechaza tipos de documento que no están en la lista', () => {
    expect(errorsFor({ documentType: 'NIT' })[0]).toContain(
      'Tipo de documento no válido',
    );
  });

  it.each(['CC', 'TI'])('%s solo admite de 5 a 12 dígitos', (documentType) => {
    expect(errorsFor({ documentType, documentNumber: '1234' })).toHaveLength(1);
    expect(
      errorsFor({ documentType, documentNumber: '1234567890123' }),
    ).toHaveLength(1);
    expect(errorsFor({ documentType, documentNumber: 'AB12345' })).toHaveLength(
      1,
    );
    expect(errorsFor({ documentType, documentNumber: '12345' })).toEqual([]);
    expect(errorsFor({ documentType, documentNumber: '123456789012' })).toEqual(
      [],
    );
  });

  it.each(['CE', 'PA', 'PPT'])(
    '%s admite letras o números de 5 a 15',
    (documentType) => {
      expect(errorsFor({ documentType, documentNumber: 'AB123' })).toEqual([]);
      expect(
        errorsFor({ documentType, documentNumber: 'A'.repeat(15) }),
      ).toEqual([]);
      expect(
        errorsFor({ documentType, documentNumber: 'A'.repeat(16) }),
      ).toHaveLength(1);
      expect(errorsFor({ documentType, documentNumber: 'AB-12' })).toHaveLength(
        1,
      );
    },
  );

  it('acepta nombres con tildes, ñ, espacios y apóstrofos', () => {
    expect(errorsFor({ firstNames: "María Ñuñez D'Angelo" })).toEqual([]);
  });

  it('rechaza nombres con números o de un solo carácter', () => {
    expect(errorsFor({ firstNames: 'Juan2' })).toHaveLength(1);
    expect(errorsFor({ lastNames: 'O' })).toHaveLength(1);
    expect(errorsFor({ firstNames: 'A'.repeat(101) })).toHaveLength(1);
  });

  it('rechaza correos inválidos o de más de 150 caracteres', () => {
    expect(errorsFor({ email: 'sin-arroba.com' })).toHaveLength(1);
    expect(errorsFor({ email: 'a@b.c' })).toHaveLength(1);
    expect(errorsFor({ email: `${'a'.repeat(140)}@correo.com` })).toHaveLength(
      1,
    );
  });

  it('valida el teléfono de 7 a 15 dígitos, con + opcional', () => {
    expect(errorsFor({ phone: '+573001234567' })).toEqual([]);
    expect(errorsFor({ phone: '123456' })).toHaveLength(1);
    expect(errorsFor({ phone: '1234567890123456' })).toHaveLength(1);
    expect(errorsFor({ phone: '300abc4567' })).toHaveLength(1);
  });

  it('acumula varios errores de formato', () => {
    expect(errorsFor({ firstNames: '1', email: 'x', phone: '1' })).toHaveLength(
      3,
    );
  });
});
