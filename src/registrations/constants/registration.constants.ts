/** Tipos de documento que se aceptan al inscribir a una persona. */
export enum DocumentType {
  CC = 'CC',
  TI = 'TI',
  CE = 'CE',
  PA = 'PA',
  PPT = 'PPT',
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  [DocumentType.CC]: 'Cédula de ciudadanía',
  [DocumentType.TI]: 'Tarjeta de identidad',
  [DocumentType.CE]: 'Cédula de extranjería',
  [DocumentType.PA]: 'Pasaporte',
  [DocumentType.PPT]: 'Permiso por protección temporal',
};

/** Cómo llegó la inscripción. */
export enum RegistrationSource {
  FORMULARIO = 'formulario',
  EXCEL = 'excel',
}

/** Datos básicos para identificar y contactar a una persona inscrita. */
export interface RegistrationData {
  documentType: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
}

/** Columnas de la plantilla de Excel, en el orden en que se descargan. */
export const REGISTRATION_COLUMNS: {
  key: keyof RegistrationData;
  header: string;
  width: number;
}[] = [
  { key: 'documentType', header: 'Tipo de documento', width: 20 },
  { key: 'documentNumber', header: 'Número de documento', width: 22 },
  { key: 'firstNames', header: 'Nombres', width: 28 },
  { key: 'lastNames', header: 'Apellidos', width: 28 },
  { key: 'email', header: 'Correo electrónico', width: 34 },
  { key: 'phone', header: 'Teléfono', width: 18 },
];

export const MAX_IMPORT_ROWS = 2000;

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,100}$/;
const NUMERIC_DOCUMENT_PATTERN = /^\d{5,12}$/;
const ALPHANUMERIC_DOCUMENT_PATTERN = /^[A-Za-z0-9]{5,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?\d{7,15}$/;

/** Documentos que solo llevan números. */
const NUMERIC_DOCUMENTS: string[] = [DocumentType.CC, DocumentType.TI];

/** Limpia los datos antes de validarlos: espacios, mayúsculas y separadores. */
export function normalizeRegistration(
  raw: Partial<Record<keyof RegistrationData, string>>,
): RegistrationData {
  const text = (value?: string) => (value ?? '').replace(/\s+/g, ' ').trim();

  return {
    documentType: text(raw.documentType).toUpperCase(),
    documentNumber: text(raw.documentNumber)
      .replace(/[\s.-]/g, '')
      .toUpperCase(),
    firstNames: text(raw.firstNames),
    lastNames: text(raw.lastNames),
    email: text(raw.email).toLowerCase(),
    phone: text(raw.phone).replace(/[\s()-]/g, ''),
  };
}

/**
 * Valida una inscripción ya normalizada. Devuelve los errores encontrados;
 * primero los datos que faltan y después los que tienen mal el formato.
 */
export function validateRegistration(data: RegistrationData): string[] {
  const missing = REGISTRATION_COLUMNS.filter(({ key }) => !data[key]).map(
    ({ header }) => header,
  );

  if (missing.length > 0) {
    return [`Falta: ${missing.join(', ')}`];
  }

  const errors: string[] = [];

  if (
    !Object.values(DocumentType).includes(data.documentType as DocumentType)
  ) {
    errors.push(
      `Tipo de documento no válido (usa ${Object.values(DocumentType).join(', ')})`,
    );
  } else if (NUMERIC_DOCUMENTS.includes(data.documentType)) {
    if (!NUMERIC_DOCUMENT_PATTERN.test(data.documentNumber)) {
      errors.push('El número de documento debe tener entre 5 y 12 dígitos');
    }
  } else if (!ALPHANUMERIC_DOCUMENT_PATTERN.test(data.documentNumber)) {
    errors.push(
      'El número de documento debe tener entre 5 y 15 letras o números',
    );
  }

  if (!NAME_PATTERN.test(data.firstNames)) {
    errors.push('Los nombres solo pueden tener letras (2 a 100 caracteres)');
  }

  if (!NAME_PATTERN.test(data.lastNames)) {
    errors.push('Los apellidos solo pueden tener letras (2 a 100 caracteres)');
  }

  if (data.email.length > 150 || !EMAIL_PATTERN.test(data.email)) {
    errors.push('El correo electrónico no es válido');
  }

  if (!PHONE_PATTERN.test(data.phone)) {
    errors.push('El teléfono debe tener entre 7 y 15 dígitos');
  }

  return errors;
}
