import { BadRequestException, Injectable } from '@nestjs/common';
import { Cell, Workbook, Worksheet } from 'exceljs';

import {
  DOCUMENT_TYPE_LABEL,
  DocumentType,
  MAX_IMPORT_ROWS,
  REGISTRATION_COLUMNS,
  RegistrationData,
} from '../constants/registration.constants';

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SHEET_NAME = 'Asistentes';
const TEMPLATE_ROWS = 1000;
const HEADER_FILL = 'FF0F5A38';
const ERROR_FILL = 'FFB91C1C';

/** Fila leída del Excel, con los valores tal cual venían (para devolverlos si fallan). */
export interface ExcelRow {
  rowNumber: number;
  values: Record<keyof RegistrationData, string>;
}

/** Fila que no se pudo registrar y el motivo. */
export interface FailedRow extends ExcelRow {
  errors: string[];
}

/** Texto sin tildes, mayúsculas ni espacios de más, para reconocer los encabezados. */
function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valor de una celda como texto, sin importar si es número, fórmula, enlace o texto enriquecido. */
function cellText(cell: Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('result' in value) {
      const result = value.result;
      return typeof result === 'string' || typeof result === 'number'
        ? String(result)
        : '';
    }
  }

  return cell.text ?? '';
}

@Injectable()
export class RegistrationExcelService {
  /** Plantilla vacía con los encabezados, la lista de tipos de documento y una hoja de instrucciones. */
  async buildTemplate(): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = this.createSheet(workbook);

    for (let row = 2; row <= TEMPLATE_ROWS + 1; row++) {
      sheet.getCell(row, 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${Object.values(DocumentType).join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Tipo de documento',
        error: `Escoge uno de la lista: ${Object.values(DocumentType).join(', ')}`,
      };
    }

    this.addInstructions(workbook);

    return this.toBuffer(workbook);
  }

  /**
   * Excel con las filas que no se registraron, en las mismas columnas de la plantilla
   * más la columna "Error". Se puede corregir y volver a cargar tal cual.
   */
  async buildFailedFile(rows: FailedRow[]): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = this.createSheet(workbook, [
      { header: 'Fila original', width: 14 },
      { header: 'Error', width: 60 },
    ]);

    rows.forEach((row) => {
      const added = sheet.addRow([
        ...REGISTRATION_COLUMNS.map(({ key }) => row.values[key]),
        row.rowNumber,
        row.errors.join('; '),
      ]);
      added.getCell(REGISTRATION_COLUMNS.length + 2).font = {
        color: { argb: ERROR_FILL },
      };
    });

    [REGISTRATION_COLUMNS.length + 1, REGISTRATION_COLUMNS.length + 2].forEach(
      (column) => {
        sheet.getRow(1).getCell(column).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: ERROR_FILL },
        };
      },
    );

    return this.toBuffer(workbook);
  }

  /** Lee las filas de la hoja de inscritos. Las filas vacías se ignoran. */
  async readRows(buffer: Buffer): Promise<ExcelRow[]> {
    const workbook = new Workbook();

    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo. Verifica que sea un Excel .xlsx válido.',
      );
    }

    const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('El archivo no tiene hojas.');
    }

    const columns = this.mapColumns(sheet);
    const rows: ExcelRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const values = Object.fromEntries(
        REGISTRATION_COLUMNS.map(({ key }) => [
          key,
          cellText(row.getCell(columns[key])).trim(),
        ]),
      ) as Record<keyof RegistrationData, string>;

      if (Object.values(values).some((value) => value !== '')) {
        rows.push({ rowNumber, values });
      }
    });

    if (rows.length === 0) {
      throw new BadRequestException(
        'El archivo no tiene personas para inscribir.',
      );
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `El archivo tiene ${rows.length} filas; el máximo por carga es ${MAX_IMPORT_ROWS}.`,
      );
    }

    return rows;
  }

  /** Ubica cada columna por el texto del encabezado, así no importa el orden. */
  private mapColumns(sheet: Worksheet): Record<keyof RegistrationData, number> {
    const found = new Map<string, number>();

    sheet.getRow(1).eachCell((cell, column) => {
      found.set(normalizeHeader(cellText(cell)), column);
    });

    const missing = REGISTRATION_COLUMNS.filter(
      ({ header }) => !found.has(normalizeHeader(header)),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `El archivo no tiene las columnas de la plantilla (faltan: ${missing
          .map(({ header }) => header)
          .join(', ')}). Descarga la plantilla y vuelve a intentarlo.`,
      );
    }

    return Object.fromEntries(
      REGISTRATION_COLUMNS.map(({ key, header }) => [
        key,
        found.get(normalizeHeader(header)),
      ]),
    ) as Record<keyof RegistrationData, number>;
  }

  /** Hoja "Asistentes" con los encabezados de la plantilla (y columnas extra si se piden). */
  private createSheet(
    workbook: Workbook,
    extraColumns: { header: string; width: number }[] = [],
  ): Worksheet {
    const sheet = workbook.addWorksheet(SHEET_NAME, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [...REGISTRATION_COLUMNS, ...extraColumns].map(
      ({ header, width }) => ({ header, width }),
    );

    // Documento y teléfono como texto para no perder ceros a la izquierda.
    sheet.getColumn(2).numFmt = '@';
    sheet.getColumn(6).numFmt = '@';

    const header = sheet.getRow(1);
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: HEADER_FILL },
      };
    });

    return sheet;
  }

  private addInstructions(workbook: Workbook): void {
    const sheet = workbook.addWorksheet('Instrucciones');
    sheet.columns = [{ width: 26 }, { width: 70 }];

    const lines: [string, string][] = [
      ['Plantilla de asistencia', ''],
      ['', ''],
      [
        'Cómo llenarla',
        'Escribe una persona por fila en la hoja "Asistentes", desde la fila 2. No cambies los encabezados.',
      ],
      [
        'Todos los datos',
        'Son obligatorios. Si a una fila le falta un dato, esa fila no se registra y se devuelve en el archivo de errores.',
      ],
      [
        'Cupo',
        'Solo se inscriben personas hasta llenar el cupo máximo del evento; las demás se devuelven en el archivo de errores.',
      ],
      ['', ''],
      ['Campo', 'Regla'],
      ['Tipo de documento', 'Uno de la lista (ver abajo).'],
      [
        'Número de documento',
        'CC y TI: solo números, de 5 a 12 dígitos. CE, PA y PPT: letras o números, de 5 a 15. Sin puntos ni espacios.',
      ],
      ['Nombres', 'Solo letras, de 2 a 100 caracteres.'],
      ['Apellidos', 'Solo letras, de 2 a 100 caracteres.'],
      [
        'Correo electrónico',
        'Un correo válido, por ejemplo nombre@correo.com.',
      ],
      ['Teléfono', 'De 7 a 15 dígitos; puede empezar con +.'],
      ['', ''],
      ['Tipos de documento', ''],
      ...Object.values(DocumentType).map((type): [string, string] => [
        type,
        DOCUMENT_TYPE_LABEL[type],
      ]),
      ['', ''],
      [
        'Ejemplo',
        'CC | 1037654321 | Santiago | Ospina | santiago@correo.com | 3001234567',
      ],
    ];

    lines.forEach((line) => sheet.addRow(line));

    sheet.getCell('A1').font = {
      bold: true,
      size: 14,
      color: { argb: HEADER_FILL },
    };
    [7, 15].forEach((row) => {
      sheet.getRow(row).font = { bold: true };
    });
    sheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  }

  private async toBuffer(workbook: Workbook): Promise<Buffer> {
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
