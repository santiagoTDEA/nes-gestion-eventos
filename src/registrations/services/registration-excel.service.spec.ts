import { describe, beforeEach, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Workbook } from 'exceljs';

import { MAX_IMPORT_ROWS } from '../constants/registration.constants';
import { RegistrationExcelService } from './registration-excel.service';

const HEADERS = [
  'Tipo de documento',
  'Número de documento',
  'Nombres',
  'Apellidos',
  'Correo electrónico',
  'Teléfono',
];

async function excel(
  rows: unknown[][],
  headers = HEADERS,
  sheetName = 'Inscritos',
): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function load(buffer: Buffer): Promise<Workbook> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

describe('RegistrationExcelService', () => {
  let service: RegistrationExcelService;

  beforeEach(() => {
    service = new RegistrationExcelService();
  });

  describe('buildTemplate', () => {
    it('trae la hoja Inscritos con los encabezados y la hoja de instrucciones', async () => {
      const workbook = await load(await service.buildTemplate());
      const sheet = workbook.getWorksheet('Inscritos')!;

      expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual(HEADERS);
      expect(workbook.getWorksheet('Instrucciones')).toBeDefined();
    });

    it('ofrece la lista de tipos de documento en la columna A', async () => {
      const sheet = (await load(await service.buildTemplate())).getWorksheet(
        'Inscritos',
      )!;

      expect(sheet.getCell('A2').dataValidation).toMatchObject({
        type: 'list',
        formulae: ['"CC,TI,CE,PA,PPT"'],
      });
    });

    it('la plantilla vacía no tiene personas para inscribir', async () => {
      await expect(
        service.readRows(await service.buildTemplate()),
      ).rejects.toThrow('El archivo no tiene personas para inscribir.');
    });
  });

  describe('readRows', () => {
    it('lee las filas, ignora las vacías y conserva el número de fila', async () => {
      const rows = await service.readRows(
        await excel([
          [
            'CC',
            '1037654321',
            'Santiago',
            'Ospina',
            'a@correo.com',
            '3001234567',
          ],
          [],
          ['CE', 'AB12345', 'Ana', 'Ruiz', 'b@correo.com', '3009876543'],
        ]),
      );

      expect(rows.map((row) => row.rowNumber)).toEqual([2, 4]);
      expect(rows[1].values.documentNumber).toBe('AB12345');
    });

    it('convierte las celdas numéricas a texto', async () => {
      const [row] = await service.readRows(
        await excel([
          ['CC', 1037654321, 'Santiago', 'Ospina', 'a@correo.com', 3001234567],
        ]),
      );

      expect(row.values.documentNumber).toBe('1037654321');
      expect(row.values.phone).toBe('3001234567');
    });

    it('lee correos guardados como hipervínculo', async () => {
      const [row] = await service.readRows(
        await excel([
          [
            'CC',
            '1037654321',
            'Santiago',
            'Ospina',
            { text: 'a@correo.com', hyperlink: 'mailto:a@correo.com' },
            '3001234567',
          ],
        ]),
      );

      expect(row.values.email).toBe('a@correo.com');
    });

    it('ubica las columnas por encabezado aunque cambien de orden o de tildes', async () => {
      const [row] = await service.readRows(
        await excel(
          [
            [
              '3001234567',
              'a@correo.com',
              'Ospina',
              'Santiago',
              '1037654321',
              'CC',
            ],
          ],
          [
            'TELEFONO',
            'correo electronico',
            'Apellidos',
            'Nombres',
            'Numero de documento',
            'Tipo de documento',
          ],
          'Hoja1',
        ),
      );

      expect(row.values).toEqual({
        documentType: 'CC',
        documentNumber: '1037654321',
        firstNames: 'Santiago',
        lastNames: 'Ospina',
        email: 'a@correo.com',
        phone: '3001234567',
      });
    });

    it('rechaza archivos sin las columnas de la plantilla', async () => {
      await expect(
        service.readRows(await excel([['x']], ['Nombre completo'])),
      ).rejects.toThrow(/faltan: Tipo de documento/);
    });

    it('rechaza archivos que no son Excel', async () => {
      await expect(
        service.readRows(Buffer.from('esto no es un excel')),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rechaza más de ${MAX_IMPORT_ROWS} filas`, async () => {
      const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [
        'CC',
        String(10000 + i),
        'Ana',
        'Ruiz',
        'a@correo.com',
        '3001234567',
      ]);

      await expect(service.readRows(await excel(rows))).rejects.toThrow(
        `el máximo por carga es ${MAX_IMPORT_ROWS}`,
      );
    });
  });

  describe('buildFailedFile', () => {
    it('devuelve las filas con su fila original y el error, y se puede volver a cargar', async () => {
      const buffer = await service.buildFailedFile([
        {
          rowNumber: 7,
          values: {
            documentType: 'CC',
            documentNumber: '12',
            firstNames: 'Ana',
            lastNames: 'Ruiz',
            email: 'a@correo.com',
            phone: '3001234567',
          },
          errors: ['Error uno', 'Error dos'],
        },
      ]);

      const sheet = (await load(buffer)).getWorksheet('Inscritos')!;
      expect(sheet.getCell('G2').value).toBe(7);
      expect(sheet.getCell('H2').value).toBe('Error uno; Error dos');

      const [again] = await service.readRows(buffer);
      expect(again.values.documentNumber).toBe('12');
    });
  });
});
