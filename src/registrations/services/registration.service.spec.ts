import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { ApprovalStatus } from '../../events/constants/approval-flow';
import { EventApproval } from '../../events/entities/event-approval.entity';
import { Event } from '../../events/entities/event.entity';
import {
  DocumentType,
  RegistrationData,
  RegistrationSource,
} from '../constants/registration.constants';
import { Workbook } from 'exceljs';

import { EventRegistration } from '../entities/event-registration.entity';
import {
  ExcelRow,
  RegistrationExcelService,
} from './registration-excel.service';
import { RegistrationService } from './registration.service';

// @nestjs/typeorm se publica como ESM y Jest no lo transforma; aquí solo se usa su decorador.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

const user = { userId: 'user-1' } as AuthUser;

const person = (
  documentNumber: string,
  changes: Partial<RegistrationData> = {},
) => ({
  documentType: DocumentType.CC,
  documentNumber,
  firstNames: 'Ana',
  lastNames: 'Ruiz',
  email: 'ana@correo.com',
  phone: '3001234567',
  ...changes,
});

const approved = [
  { status: ApprovalStatus.APROBADO },
  { status: ApprovalStatus.APROBADO },
];
const pending = [
  { status: ApprovalStatus.APROBADO },
  { status: ApprovalStatus.PENDIENTE },
];

function makeEvent(maximumCapacity: number, approvals = approved): Event {
  return {
    id: 10,
    name: 'Diplomado',
    eventType: 'Diplomado',
    faculty: { name: 'Ingeniería' },
    modality: 'Presencial',
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    startTime: '08:00',
    endTime: '12:00',
    minimumCapacity: 1,
    maximumCapacity,
    approvals,
  } as unknown as Event;
}

/** Simula la base de datos: un evento, sus aprobaciones y las inscripciones guardadas. */
function setup(
  event: Event | null,
  stored: Partial<EventRegistration>[] = [],
  realExcel?: RegistrationExcelService,
) {
  const saved: Partial<EventRegistration>[] = [...stored];

  const manager = {
    findOne: jest.fn(async (..._args: unknown[]) => event),
    find: jest.fn(async (entity: unknown) =>
      entity === EventApproval ? (event?.approvals ?? []) : saved,
    ),
    count: jest.fn(async () => saved.length),
    exists: jest.fn(
      async (_: unknown, { where }: { where: { documentNumber: string } }) =>
        saved.some((item) => item.documentNumber === where.documentNumber),
    ),
    create: jest.fn((_: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (data: object | object[]) => {
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item, i) =>
        saved.push({
          id: saved.length + i + 1,
          createdAt: new Date(),
          ...item,
        }),
      );
      return Array.isArray(data) ? data : saved[saved.length - 1];
    }),
  };

  const dataSource = {
    transaction: jest.fn(async (work: (m: typeof manager) => unknown) =>
      work(manager),
    ),
  };
  const registrations = {
    find: jest.fn(async () => saved),
    delete: jest.fn(async (_id: number) => ({ affected: 1 })),
    createQueryBuilder: jest.fn(),
  };
  const events = { find: jest.fn(), findOne: jest.fn(async () => event) };
  const excel = {
    readRows: jest.fn<(b: Buffer) => Promise<ExcelRow[]>>(),
    buildFailedFile: jest.fn(async () => Buffer.from('errores')),
    buildTemplate: jest.fn(),
  };

  const service = new RegistrationService(
    registrations as never,
    events as never,
    dataSource as never,
    realExcel ?? (excel as unknown as RegistrationExcelService),
  );

  return { service, manager, saved, registrations, events, excel };
}

const xlsx = {
  originalname: 'inscritos.xlsx',
  mimetype: '',
  size: 10,
  buffer: Buffer.from(''),
};

describe('RegistrationService', () => {
  describe('findApprovedEvents', () => {
    it('solo lista eventos con todas las aprobaciones y calcula los cupos', async () => {
      const { service, events, registrations } = setup(null);
      const full = makeEvent(30);
      const half = { ...makeEvent(30, pending), id: 11 };
      const none = { ...makeEvent(30, []), id: 12 };

      events.find.mockResolvedValue([full, half, none] as never);
      registrations.createQueryBuilder.mockReturnValue({
        innerJoin: () => ({
          select: () => ({
            addSelect: () => ({
              groupBy: () => ({
                getRawMany: async () => [{ eventId: 10, total: '25' }],
              }),
            }),
          }),
        }),
      });

      const result = await service.findApprovedEvents();

      expect(result.map((item) => item.id)).toEqual([10]);
      expect(result[0]).toMatchObject({
        registeredCount: 25,
        availableSlots: 5,
        faculty: 'Ingeniería',
      });
    });
  });

  describe('findByEvent', () => {
    it('no muestra inscritos de eventos sin aprobación completa', async () => {
      const { service } = setup(makeEvent(10, pending));
      await expect(service.findByEvent(10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('numera a los inscritos en el orden en que se inscribieron', async () => {
      const { service } = setup(makeEvent(10), [
        { id: 1, ...person('11111') },
        { id: 2, ...person('22222') },
      ]);

      const { registrations, event } = await service.findByEvent(10);
      expect(registrations.map((item) => item.position)).toEqual([1, 2]);
      expect(event.availableSlots).toBe(8);
    });
  });

  describe('register (formulario)', () => {
    it('inscribe a la persona con los datos normalizados', async () => {
      const { service, saved } = setup(makeEvent(10));

      const result = await service.register(
        10,
        person(' 1.037.654.321 ', { email: 'ANA@Correo.com' }) as never,
        user,
      );

      expect(saved[0]).toMatchObject({
        documentNumber: '1037654321',
        email: 'ana@correo.com',
        source: RegistrationSource.FORMULARIO,
        registeredBy: 'user-1',
      });
      expect(result).toMatchObject({ capacityReached: false, lastSlot: null });
      expect(result.registration.position).toBe(1);
      expect(result.event.availableSlots).toBe(9);
    });

    it('rechaza datos con formato inválido antes de tocar la base de datos', async () => {
      const { service, manager } = setup(makeEvent(10));

      await expect(
        service.register(10, person('12', { email: 'malo' }) as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.findOne).not.toHaveBeenCalled();
    });

    it('no inscribe en eventos sin aprobación completa', async () => {
      const { service } = setup(makeEvent(10, pending));
      await expect(
        service.register(10, person('11111') as never, user),
      ).rejects.toThrow(
        'Solo se pueden inscribir personas a eventos con la aprobación completa.',
      );
    });

    it('responde 404 si el evento no existe', async () => {
      const { service } = setup(null);
      await expect(
        service.register(99, person('11111') as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('no permite inscribir dos veces el mismo documento', async () => {
      const { service } = setup(makeEvent(10), [person('11111')]);
      await expect(
        service.register(10, person('11.111') as never, user),
      ).rejects.toThrow('ya está inscrita en este evento');
    });

    it('detecta el duplicado aunque el documento con letras cambie de mayúsculas', async () => {
      const { service, saved } = setup(makeEvent(10));
      const passport = (number: string) =>
        person(number, { documentType: DocumentType.PA }) as never;

      await service.register(10, passport('ab12345'), user);
      await expect(
        service.register(10, passport('AB12345'), user),
      ).rejects.toThrow('ya está inscrita en este evento');
      expect(saved.map((item) => item.documentNumber)).toEqual(['AB12345']);
    });

    it('no supera el cupo máximo', async () => {
      const { service, saved } = setup(makeEvent(2), [
        person('11111'),
        person('22222'),
      ]);

      await expect(
        service.register(10, person('33333') as never, user),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saved).toHaveLength(2);
    });

    it('avisa quién ocupó el último cupo', async () => {
      const { service } = setup(makeEvent(2), [person('11111')]);

      const result = await service.register(10, person('22222') as never, user);

      expect(result.capacityReached).toBe(true);
      expect(result.lastSlot).toMatchObject({
        documentNumber: '22222',
        position: 2,
        rowNumber: null,
      });
      expect(result.event.availableSlots).toBe(0);
    });

    it('bloquea la fila del evento para que dos inscripciones a la vez no pasen el cupo', async () => {
      const { service, manager } = setup(makeEvent(10));
      await service.register(10, person('11111') as never, user);

      expect(manager.findOne).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });
  });

  describe('importExcel', () => {
    const row = (
      rowNumber: number,
      documentNumber: string,
      changes: Partial<RegistrationData> = {},
    ): ExcelRow => ({
      rowNumber,
      values: person(documentNumber, changes),
    });

    it('exige un archivo .xlsx', async () => {
      const { service } = setup(makeEvent(10));

      await expect(service.importExcel(10, undefined, user)).rejects.toThrow(
        'Adjunta el archivo de Excel.',
      );
      await expect(
        service.importExcel(10, { ...xlsx, originalname: 'datos.csv' }, user),
      ).rejects.toThrow('El archivo debe ser un Excel .xlsx.');
    });

    it('inscribe las filas válidas y devuelve en un Excel las que tienen error', async () => {
      const { service, saved, excel } = setup(makeEvent(10), [person('99999')]);
      excel.readRows.mockResolvedValue([
        row(2, '11111'),
        row(3, '12', { firstNames: '' }),
        row(4, '22222', { email: 'malo' }),
        row(5, '99999'),
        row(6, '11111'),
        row(7, '33333'),
      ]);

      const result = await service.importExcel(10, xlsx, user);

      expect(result).toMatchObject({
        totalRows: 6,
        registered: 2,
        failed: 4,
        failedByCapacity: 0,
      });
      expect(saved.map((item) => item.documentNumber)).toEqual([
        '99999',
        '11111',
        '33333',
      ]);
      expect(
        saved
          .slice(1)
          .every((item) => item.source === RegistrationSource.EXCEL),
      ).toBe(true);

      const [failed] = excel.buildFailedFile.mock.calls[0] as unknown as [
        { rowNumber: number; errors: string[] }[],
      ];
      expect(failed.map((item) => [item.rowNumber, item.errors[0]])).toEqual([
        [3, 'Falta: Nombres'],
        [4, 'El correo electrónico no es válido'],
        [5, 'La persona ya está inscrita en este evento'],
        [6, 'Documento repetido en el archivo (fila 2)'],
      ]);
      expect(result.failedFile?.fileName).toBe(
        'inscripciones-con-error-evento-10.xlsx',
      );
      expect(result.failedFile?.contentBase64).toBe(
        Buffer.from('errores').toString('base64'),
      );
    });

    it('detiene la inscripción al llenar el cupo y marca quién ocupó el último', async () => {
      const { service, saved, excel } = setup(makeEvent(3), [person('99999')]);
      excel.readRows.mockResolvedValue([
        row(2, '11111'),
        row(3, '22222'),
        row(4, '33333'),
        row(5, '44444'),
      ]);

      const result = await service.importExcel(10, xlsx, user);

      expect(saved).toHaveLength(3);
      expect(result).toMatchObject({
        registered: 2,
        failed: 2,
        failedByCapacity: 2,
        capacityReached: true,
      });
      expect(result.lastSlot).toMatchObject({
        documentNumber: '22222',
        position: 3,
        rowNumber: 3,
      });
      expect(result.event.availableSlots).toBe(0);
    });

    it('no genera archivo de errores si todas las filas se inscriben', async () => {
      const { service, excel } = setup(makeEvent(10));
      excel.readRows.mockResolvedValue([row(2, '11111')]);

      const result = await service.importExcel(10, xlsx, user);

      expect(result.failedFile).toBeNull();
      expect(excel.buildFailedFile).not.toHaveBeenCalled();
    });

    it('no carga personas en eventos sin aprobación completa', async () => {
      const { service, excel, saved } = setup(makeEvent(10, pending));
      excel.readRows.mockResolvedValue([row(2, '11111')]);

      await expect(service.importExcel(10, xlsx, user)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(saved).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('quita la inscripción', async () => {
      const { service, registrations } = setup(makeEvent(10));
      await service.remove(5);
      expect(registrations.delete).toHaveBeenCalledWith(5);
    });

    it('responde 404 si la inscripción no existe', async () => {
      const { service, registrations } = setup(makeEvent(10));
      registrations.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(5)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

/** Carga de punta a punta con archivos de Excel reales: plantilla → carga → archivo de errores. */
describe('RegistrationService.importExcel con Excel real', () => {
  const excelService = new RegistrationExcelService();

  /** Llena la plantilla oficial con las filas dadas, como lo haría el usuario. */
  async function fillTemplate(rows: (string | null)[][]): Promise<Buffer> {
    const workbook = new Workbook();
    await workbook.xlsx.load(
      (await excelService.buildTemplate()) as unknown as ArrayBuffer,
    );
    const sheet = workbook.getWorksheet('Inscritos')!;
    rows.forEach((values, i) =>
      values.forEach((value, column) => {
        if (value !== null) sheet.getCell(i + 2, column + 1).value = value;
      }),
    );
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /** Lee el Excel de errores que devuelve la carga. */
  async function readFailedFile(contentBase64: string) {
    const workbook = new Workbook();
    await workbook.xlsx.load(
      Buffer.from(contentBase64, 'base64') as unknown as ArrayBuffer,
    );
    const sheet = workbook.getWorksheet('Inscritos')!;
    const header = (sheet.getRow(1).values as unknown[]).slice(1);
    const rows: unknown[][] = [];
    sheet.eachRow(
      (row, n) => n > 1 && rows.push((row.values as unknown[]).slice(1)),
    );
    return { header, rows };
  }

  const ok = (doc: string, name = 'Ana'): (string | null)[] => [
    'CC',
    doc,
    name,
    'Ruiz',
    'ana@correo.com',
    '3001234567',
  ];

  it('guarda las filas válidas y devuelve en un Excel las que tienen datos vacíos o inválidos', async () => {
    const { service, saved } = setup(makeEvent(10), [], excelService);
    const buffer = await fillTemplate([
      ok('11111'),
      ['CC', '22222', null, 'Ruiz', 'ana@correo.com', '3001234567'], // sin nombres
      ok('33333'),
      ['CC', null, null, null, null, null], // solo el tipo de documento
      ok('44444', 'Juan2'), // nombre inválido
      ok('55555'),
    ]);

    const result = await service.importExcel(10, { ...xlsx, buffer }, user);

    expect(saved.map((item) => item.documentNumber)).toEqual([
      '11111',
      '33333',
      '55555',
    ]);
    expect(result).toMatchObject({
      totalRows: 6,
      registered: 3,
      failed: 3,
      failedByCapacity: 0,
    });

    const failed = await readFailedFile(result.failedFile!.contentBase64);
    expect(failed.header).toEqual([
      'Tipo de documento',
      'Número de documento',
      'Nombres',
      'Apellidos',
      'Correo electrónico',
      'Teléfono',
      'Fila original',
      'Error',
    ]);
    expect(failed.rows.map((row) => [row[6], row[7]])).toEqual([
      [3, 'Falta: Nombres'],
      [
        5,
        'Falta: Número de documento, Nombres, Apellidos, Correo electrónico, Teléfono',
      ],
      [6, 'Los nombres solo pueden tener letras (2 a 100 caracteres)'],
    ]);
  });

  it('al llenar el cupo devuelve en el Excel a las personas que no alcanzaron cupo, junto con las de error', async () => {
    const { service, saved } = setup(
      makeEvent(3),
      [person('99999')],
      excelService,
    );
    const buffer = await fillTemplate([
      ok('11111'),
      ['CC', '12', 'Ana', 'Ruiz', 'ana@correo.com', '3001234567'], // documento inválido
      ok('22222'),
      ok('33333'),
      ok('44444'),
    ]);

    const result = await service.importExcel(10, { ...xlsx, buffer }, user);

    expect(saved.map((item) => item.documentNumber)).toEqual([
      '99999',
      '11111',
      '22222',
    ]);
    expect(result).toMatchObject({
      registered: 2,
      failed: 3,
      failedByCapacity: 2,
      capacityReached: true,
    });
    expect(result.lastSlot).toMatchObject({
      documentNumber: '22222',
      rowNumber: 4,
    });

    const failed = await readFailedFile(result.failedFile!.contentBase64);
    expect(failed.rows.map((row) => [row[1], row[6], row[7]])).toEqual([
      ['12', 3, 'El número de documento debe tener entre 5 y 12 dígitos'],
      ['33333', 5, 'Sin cupo: el evento alcanzó su cupo máximo de 3 personas'],
      ['44444', 6, 'Sin cupo: el evento alcanzó su cupo máximo de 3 personas'],
    ]);
  });

  it('el Excel de errores, ya corregido, se vuelve a cargar y completa la inscripción', async () => {
    const event = makeEvent(10);
    const { service, saved } = setup(event, [], excelService);
    const first = await service.importExcel(
      10,
      {
        ...xlsx,
        buffer: await fillTemplate([
          ok('11111'),
          ['CC', '22222', null, 'Ruiz', 'ana@correo.com', '3001234567'],
        ]),
      },
      user,
    );

    const workbook = new Workbook();
    await workbook.xlsx.load(
      Buffer.from(
        first.failedFile!.contentBase64,
        'base64',
      ) as unknown as ArrayBuffer,
    );
    workbook.getWorksheet('Inscritos')!.getCell('C2').value = 'Luisa';
    const corrected = Buffer.from(await workbook.xlsx.writeBuffer());

    const second = await service.importExcel(
      10,
      { ...xlsx, buffer: corrected },
      user,
    );

    expect(second).toMatchObject({
      totalRows: 1,
      registered: 1,
      failed: 0,
      failedFile: null,
    });
    expect(saved.map((item) => item.firstNames)).toEqual(['Ana', 'Luisa']);
  });
});
