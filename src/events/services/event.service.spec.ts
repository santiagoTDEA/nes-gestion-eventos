/* eslint-disable @typescript-eslint/require-await -- los mocks del repositorio imitan métodos async */
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

// @nestjs/typeorm se publica como ESM y Jest no lo transforma; aquí solo se usa su decorador.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { EventService } from './event.service';
import { EventRepository } from '../repository/event.repository';
import { FacultyRepository } from '../../faculty/repository/faculty.repository';
import { PersonRepository } from '../../person/repository/person.repository';
import { RoleRepository } from '../../roles/repositories/role.repository';
import { EventNotifier } from './event-notifier.service';
import { DiffusionService } from '../../diffusion/services/diffusion.service';
import { SignatureService } from '../../auth/services/signature.service';
import { Event } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';
import { ApprovalStatus, WorkflowStatus } from '../constants/approval-flow';
import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';

type Mocked<T> = { [K in keyof T]: jest.Mock<any> };

const ADMIN: AuthUser = {
  userId: 'admin-1',
  username: 'admin',
  status: 'Activo',
  role: {
    id: 'r0',
    name: 'Administrador',
    permissionsFull: true,
    modulesFull: true,
  },
};

const VERIFIER: AuthUser = {
  userId: 'verif-1',
  username: 'verificacion',
  status: 'Activo',
  role: {
    id: 'r3',
    name: 'Verificación',
    permissionsFull: false,
    modulesFull: false,
  },
};

const REVIEWER: AuthUser = {
  userId: 'rev-1',
  username: 'revision',
  status: 'Activo',
  role: {
    id: 'r2',
    name: 'Revisión',
    permissionsFull: false,
    modulesFull: false,
  },
};

function step(
  id: number,
  roleName: string,
  status: ApprovalStatus,
): EventApproval {
  return Object.assign(new EventApproval(), {
    id,
    role: { id: `role-${id}`, name: roleName },
    person: { id, name: `Persona ${id}` },
    status,
    date: '2026-11-01',
    signature: status === ApprovalStatus.APROBADO ? `FD-${id}` : null,
    signedAt: status === ApprovalStatus.APROBADO ? new Date() : null,
  });
}

function buildEvent(overrides: Partial<Event> = {}, approved = false): Event {
  const pending = approved ? ApprovalStatus.APROBADO : ApprovalStatus.PENDIENTE;

  return Object.assign(new Event(), {
    id: 10,
    name: 'Curso de prueba',
    startTime: '08:00',
    endTime: '12:00',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    minimumCapacity: 5,
    maximumCapacity: 20,
    workflowStatus: WorkflowStatus.EN_FLUJO,
    createdBy: 'author-1',
    cancelledAt: null,
    approvals: [
      step(1, 'Elaboración', ApprovalStatus.APROBADO),
      step(
        2,
        'Revisión',
        approved ? ApprovalStatus.APROBADO : ApprovalStatus.APROBADO,
      ),
      step(3, 'Verificación', pending),
      step(4, 'Validación', pending),
    ],
    ...overrides,
  });
}

describe('EventService', () => {
  let service: EventService;
  let repo: Mocked<EventRepository>;
  let persons: Mocked<PersonRepository>;
  let notifier: Mocked<EventNotifier>;
  let diffusion: Mocked<DiffusionService>;
  let stored: Event;

  beforeEach(() => {
    stored = buildEvent();

    repo = {
      findById: jest.fn(async () => stored),
      findAll: jest.fn(async () => [stored]),
      findVisibleIds: jest.fn(async () => [stored.id]),
      findVerificationEventIds: jest.fn(async () => [] as number[]),
      setCancellation: jest.fn(async (_id: number, data: Partial<Event>) => {
        stored = Object.assign(new Event(), stored, data);
      }),
      clearCancellation: jest.fn(async () => {
        stored = Object.assign(new Event(), stored, {
          cancelledAt: null,
          cancellationReason: null,
          cancelledBy: null,
          cancelledByName: null,
        });
      }),
      countRegistrations: jest.fn(async () => 0),
      update: jest.fn(async (event: Event) => event),
      findByName: jest.fn(async () => null),
      isApprovalOfUser: jest.fn(async () => true),
      saveApproval: jest.fn(async (approval: EventApproval) => approval),
    } as unknown as Mocked<EventRepository>;

    persons = {
      findByUserId: jest.fn(async () => ({ name: 'Valeria Verificación' })),
    } as unknown as Mocked<PersonRepository>;

    notifier = {
      cancelled: jest.fn(async () => undefined),
      reactivated: jest.fn(async () => undefined),
      signed: jest.fn(async () => undefined),
      authorIds: jest.fn(async () => []),
    } as unknown as Mocked<EventNotifier>;

    diffusion = {
      createFromEvent: jest.fn(),
      refreshEventSnapshot: jest.fn(async () => undefined),
    } as unknown as Mocked<DiffusionService>;

    service = new EventService(
      repo as unknown as EventRepository,
      {} as FacultyRepository,
      persons as unknown as PersonRepository,
      {} as RoleRepository,
      notifier as unknown as EventNotifier,
      diffusion as unknown as DiffusionService,
      {
        getOrCreate: jest.fn(async () => 'FD-X'),
      } as unknown as SignatureService,
    );
  });

  describe('canManage en la consulta', () => {
    it('el administrador puede gestionar todos los eventos', async () => {
      const [event] = await service.findAll(ADMIN);
      expect(event.canManage).toBe(true);
    });

    it('Verificación solo gestiona los eventos donde es responsable de ese paso', async () => {
      repo.findVerificationEventIds.mockResolvedValueOnce([10]);
      expect((await service.findAll(VERIFIER))[0].canManage).toBe(true);

      repo.findVerificationEventIds.mockResolvedValueOnce([]);
      expect((await service.findAll(VERIFIER))[0].canManage).toBe(false);
    });

    it('otros roles no gestionan eventos aunque los vean', async () => {
      const [event] = await service.findAll(REVIEWER);

      expect(event.canManage).toBe(false);
      expect(repo.findVerificationEventIds).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancela en cualquier estado sin tocar aprobaciones ni workflow', async () => {
      stored = buildEvent({ workflowStatus: WorkflowStatus.DEVUELTO });
      const approvalsBefore = stored.approvals;

      const result = await service.cancel(
        10,
        { reason: '  No hubo cupo mínimo.  ' },
        ADMIN,
      );

      expect(repo.setCancellation).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          cancellationReason: 'No hubo cupo mínimo.',
          cancelledBy: 'admin-1',
          cancelledByName: 'Valeria Verificación',
        }),
      );
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(result.workflowStatus).toBe(WorkflowStatus.DEVUELTO);
      expect(result.approvals).toBe(approvalsBefore);
      expect(repo.update).not.toHaveBeenCalled();
      expect(notifier.cancelled).toHaveBeenCalledWith(
        result,
        'No hubo cupo mínimo.',
        'admin-1',
      );
    });

    it('cancela un evento aprobado si es el responsable de Verificación', async () => {
      stored = buildEvent({}, true);
      repo.findVerificationEventIds.mockResolvedValue([10]);

      await expect(
        service.cancel(10, { reason: 'Se suspendió el curso.' }, VERIFIER),
      ).resolves.toMatchObject({
        cancellationReason: 'Se suspendió el curso.',
      });
    });

    it('rechaza a Verificación cuando no es responsable del evento', async () => {
      await expect(
        service.cancel(10, { reason: 'Se suspendió el curso.' }, VERIFIER),
      ).rejects.toThrow(/Verificación/);
      expect(repo.setCancellation).not.toHaveBeenCalled();
    });

    it('rechaza a otros roles', async () => {
      await expect(
        service.cancel(10, { reason: 'Se suspendió el curso.' }, REVIEWER),
      ).rejects.toThrow();
      expect(repo.setCancellation).not.toHaveBeenCalled();
    });

    it('no cancela dos veces', async () => {
      stored = buildEvent({ cancelledAt: new Date() });

      await expect(
        service.cancel(10, { reason: 'Se suspendió el curso.' }, ADMIN),
      ).rejects.toThrow(/ya está cancelado/);
    });
  });

  describe('reactivate', () => {
    it('reactiva y el evento sigue en el mismo paso con las mismas firmas', async () => {
      stored = buildEvent({
        cancelledAt: new Date(),
        cancellationReason: 'Motivo de prueba',
      });
      const approvalsBefore = stored.approvals;

      const result = await service.reactivate(10, ADMIN);

      expect(repo.clearCancellation).toHaveBeenCalledWith(10, 'admin-1');
      expect(result.cancelledAt).toBeNull();
      expect(result.approvals).toBe(approvalsBefore);
      expect(result.workflowStatus).toBe(WorkflowStatus.EN_FLUJO);
      expect(notifier.reactivated).toHaveBeenCalledWith(result, 'admin-1');
    });

    it('solo reactiva eventos cancelados', async () => {
      await expect(service.reactivate(10, ADMIN)).rejects.toThrow(
        /no está cancelado/,
      );
    });

    it('rechaza a quien no puede gestionar el evento', async () => {
      stored = buildEvent({ cancelledAt: new Date() });

      await expect(service.reactivate(10, REVIEWER)).rejects.toThrow();
      expect(repo.clearCancellation).not.toHaveBeenCalled();
    });
  });

  describe('acciones sobre un evento cancelado', () => {
    beforeEach(() => {
      stored = buildEvent({ cancelledAt: new Date() });
    });

    it('no se puede firmar', async () => {
      await expect(service.approve(10, VERIFIER)).rejects.toThrow(/cancelado/);
      expect(repo.saveApproval).not.toHaveBeenCalled();
    });

    it('no se puede devolver', async () => {
      await expect(
        service.returnToAuthor(
          10,
          { observation: 'Falta información.' },
          VERIFIER,
        ),
      ).rejects.toThrow(/cancelado/);
    });

    it('no se puede reenviar', async () => {
      await expect(service.resubmit(10, ADMIN)).rejects.toThrow(/cancelado/);
    });

    it('no se puede editar, ni siquiera el administrador', async () => {
      await expect(
        service.update(10, { name: 'Nuevo' }, ADMIN),
      ).rejects.toThrow(/cancelado/);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const newApprovals = [
      { personId: 9, roleId: 'role-2', date: '2026-11-02' },
      { personId: 9, roleId: 'role-3', date: '2026-11-02' },
      { personId: 9, roleId: 'role-4', date: '2026-11-02' },
    ];

    it('un evento aprobado no se edita para quien no lo gestiona', async () => {
      stored = buildEvent({}, true);

      await expect(
        service.update(10, { name: 'Nuevo' }, REVIEWER),
      ).rejects.toThrow(/completó el flujo/);
    });

    it('el administrador edita un evento aprobado sin tocar responsables ni firmas', async () => {
      stored = buildEvent({}, true);
      const approvalsBefore = stored.approvals;

      await service.update(
        10,
        { name: 'Nombre corregido', approvals: newApprovals },
        ADMIN,
      );

      const [saved, replaceApprovals] = repo.update.mock.calls[0] as [
        Event,
        boolean,
      ];
      expect(saved.name).toBe('Nombre corregido');
      expect(saved.approvals).toBe(approvalsBefore);
      expect(
        saved.approvals.every(
          (item) => item.status === ApprovalStatus.APROBADO,
        ),
      ).toBe(true);
      expect(replaceApprovals).toBe(false);
      expect(diffusion.refreshEventSnapshot).toHaveBeenCalledWith(saved);
    });

    it('el responsable de Verificación edita un evento aprobado', async () => {
      stored = buildEvent({}, true);
      repo.findVerificationEventIds.mockResolvedValue([10]);

      await service.update(10, { scope: 'Nuevo alcance' }, VERIFIER);

      const [saved, replaceApprovals] = repo.update.mock.calls[0] as [
        Event,
        boolean,
      ];
      expect(saved.scope).toBe('Nuevo alcance');
      expect(replaceApprovals).toBe(false);
    });

    it('no deja el cupo máximo por debajo de los inscritos', async () => {
      stored = buildEvent({}, true);
      repo.countRegistrations.mockResolvedValue(15);

      await expect(
        service.update(10, { maximumCapacity: 12 }, ADMIN),
      ).rejects.toThrow(/15 personas ya inscritas/);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('un evento en flujo se sigue editando igual que antes', async () => {
      await service.update(10, { name: 'Otro nombre' }, REVIEWER);

      const [saved, replaceApprovals] = repo.update.mock.calls[0] as [
        Event,
        boolean,
      ];
      expect(saved.name).toBe('Otro nombre');
      expect(replaceApprovals).toBe(false);
      // Sin aprobación completa todavía no hay solicitudes de difusión que actualizar.
      expect(diffusion.refreshEventSnapshot).not.toHaveBeenCalled();
    });
  });
});
