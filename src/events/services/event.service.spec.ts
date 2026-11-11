import { Test, TestingModule } from '@nestjs/testing';
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
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('EventService', () => {
  let service: EventService;
  let eventRepository: {
    findAll: jest.Mock<EventRepository['findAll']>;
    findById: jest.Mock<EventRepository['findById']>;
    findVisibleIds: jest.Mock<EventRepository['findVisibleIds']>;
    isApprovalOfUser: jest.Mock<EventRepository['isApprovalOfUser']>;
    saveApproval: jest.Mock<EventRepository['saveApproval']>;
    update: jest.Mock<EventRepository['update']>;
    setWorkflowStatus: jest.Mock<EventRepository['setWorkflowStatus']>;
  };
  let eventNotifier: {
    signed: jest.Mock<EventNotifier['signed']>;
    cancelled: jest.Mock<EventNotifier['cancelled']>;
  };
  let signatureService: {
    getOrCreate: jest.Mock<SignatureService['getOrCreate']>;
  };

  beforeEach(async () => {
    eventRepository = {
      findAll: jest.fn<EventRepository['findAll']>(),
      findById: jest.fn<EventRepository['findById']>(),
      findVisibleIds: jest.fn<EventRepository['findVisibleIds']>(),
      isApprovalOfUser: jest.fn<EventRepository['isApprovalOfUser']>(),
      saveApproval: jest.fn<EventRepository['saveApproval']>(),
      update: jest.fn<EventRepository['update']>(),
      setWorkflowStatus: jest.fn<EventRepository['setWorkflowStatus']>(),
    };
    eventNotifier = {
      signed: jest.fn<EventNotifier['signed']>().mockResolvedValue(undefined),
      cancelled: jest
        .fn<EventNotifier['cancelled']>()
        .mockResolvedValue(undefined),
    };
    signatureService = {
      getOrCreate: jest
        .fn<SignatureService['getOrCreate']>()
        .mockResolvedValue('FD-TEST'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: EventRepository, useValue: eventRepository },
        { provide: FacultyRepository, useValue: {} },
        { provide: PersonRepository, useValue: {} },
        { provide: RoleRepository, useValue: {} },
        { provide: EventNotifier, useValue: eventNotifier },
        { provide: DiffusionService, useValue: {} },
        { provide: SignatureService, useValue: signatureService },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  function makeEvent(status: ApprovalStatus): Event {
    const approval = new EventApproval();
    approval.status = status;

    const event = new Event();
    event.id = 1;
    event.approvals = [approval];
    event.startTime = '08:00:00';
    event.endTime = '12:00:00';
    event.startDate = '2026-03-01';
    event.endDate = '2026-03-01';
    event.workflowStatus = WorkflowStatus.EN_FLUJO;
    event.minimumCapacity = 1;
    event.maximumCapacity = 10;

    return event;
  }

  function makeApproval(
    roleName: string,
    status: ApprovalStatus,
  ): EventApproval {
    const approval = new EventApproval();
    approval.id = roleName === 'Verificación' ? 3 : 1;
    approval.status = status;
    approval.role = { name: roleName } as EventApproval['role'];
    return approval;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lets verification see events in every workflow state', async () => {
    const inProgress = makeEvent(ApprovalStatus.PENDIENTE);
    const approved = makeEvent(ApprovalStatus.APROBADO);
    approved.id = 2;
    const cancelled = makeEvent(ApprovalStatus.PENDIENTE);
    cancelled.id = 3;
    cancelled.workflowStatus = WorkflowStatus.CANCELADO;
    eventRepository.findAll.mockResolvedValue([
      inProgress,
      approved,
      cancelled,
    ]);

    await expect(
      service.findAll({
        userId: 'verification-id',
        username: 'verification',
        status: 'Activo',
        role: { id: 'verification-role', name: 'Verificación' },
      }),
    ).resolves.toEqual([inProgress, approved, cancelled]);

    expect(eventRepository.findAll).toHaveBeenCalledWith(undefined);
  });

  it('lets the verification role sign only when its workflow step is current', async () => {
    const event = makeEvent(ApprovalStatus.APROBADO);
    const verificationApproval = makeApproval(
      'Verificación',
      ApprovalStatus.PENDIENTE,
    );
    event.approvals = [
      makeApproval('Elaboración', ApprovalStatus.APROBADO),
      makeApproval('Revisión', ApprovalStatus.APROBADO),
      verificationApproval,
      makeApproval('Validación', ApprovalStatus.PENDIENTE),
    ];
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.isApprovalOfUser.mockResolvedValue(false);
    eventRepository.saveApproval.mockResolvedValue(verificationApproval);

    await expect(
      service.approve(event.id, {
        userId: 'verification-id',
        username: 'verification',
        status: 'Activo',
        role: { id: 'verification-role', name: 'Verificación' },
      }),
    ).resolves.toBe(event);

    expect(verificationApproval.status).toBe(ApprovalStatus.APROBADO);
    expect(verificationApproval.signature).toBe('FD-TEST');
    expect(eventRepository.saveApproval).toHaveBeenCalledWith(
      verificationApproval,
    );
    expect(eventNotifier.signed).toHaveBeenCalledWith(event, 'verification-id');
  });

  it('denies edits to approved events for roles other than verification or admin', async () => {
    const event = makeEvent(ApprovalStatus.APROBADO);
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.findVisibleIds.mockResolvedValue([event.id]);

    await expect(
      service.update(
        event.id,
        {},
        {
          userId: 'user-id',
          username: 'validator',
          status: 'Activo',
          role: { id: 'validator-role', name: 'Validación' },
        },
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(eventRepository.update).not.toHaveBeenCalled();
  });

  it('allows the verification role to edit an approved event', async () => {
    const event = makeEvent(ApprovalStatus.APROBADO);
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.findVisibleIds.mockResolvedValue([]);
    eventRepository.update.mockResolvedValue(event);

    await expect(
      service.update(
        event.id,
        {},
        {
          userId: 'user-id',
          username: 'verification',
          status: 'Activo',
          role: { id: 'verification-role', name: 'Verificación' },
        },
      ),
    ).resolves.toBe(event);

    expect(eventRepository.update).toHaveBeenCalledWith(event, false);
    expect(eventRepository.findVisibleIds).not.toHaveBeenCalled();
  });

  it('allows administrators to edit an approved event', async () => {
    const event = makeEvent(ApprovalStatus.APROBADO);
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.update.mockResolvedValue(event);

    await expect(
      service.update(
        event.id,
        {},
        {
          userId: 'admin-id',
          username: 'admin',
          status: 'Activo',
          role: {
            id: 'admin-role',
            name: 'Administrador',
            permissionsFull: true,
            modulesFull: true,
          },
        },
      ),
    ).resolves.toBe(event);
  });

  it('keeps edits to unapproved events available to other authorized roles', async () => {
    const event = makeEvent(ApprovalStatus.PENDIENTE);
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.findVisibleIds.mockResolvedValue([event.id]);
    eventRepository.update.mockResolvedValue(event);

    await expect(
      service.update(
        event.id,
        {},
        {
          userId: 'user-id',
          username: 'validator',
          status: 'Activo',
          role: { id: 'validator-role', name: 'Validación' },
        },
      ),
    ).resolves.toBe(event);
  });

  it('allows only verification and administrators to cancel events', async () => {
    const event = makeEvent(ApprovalStatus.PENDIENTE);
    eventRepository.findById.mockResolvedValue(event);

    await expect(
      service.cancel(event.id, {
        userId: 'user-id',
        username: 'reviewer',
        status: 'Activo',
        role: { id: 'review-role', name: 'Revisión' },
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(eventRepository.setWorkflowStatus).not.toHaveBeenCalled();
  });

  it('cancels events for verification and prevents later edits', async () => {
    const event = makeEvent(ApprovalStatus.PENDIENTE);
    const user = {
      userId: 'verification-id',
      username: 'verification',
      status: 'Activo',
      role: { id: 'verification-role', name: 'Verificación' },
    };
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.findVisibleIds.mockResolvedValue([event.id]);
    eventRepository.setWorkflowStatus.mockImplementation(() => {
      event.workflowStatus = WorkflowStatus.CANCELADO;
      return Promise.resolve();
    });

    await expect(service.cancel(event.id, user)).resolves.toBe(event);
    expect(eventRepository.setWorkflowStatus).toHaveBeenCalledWith(
      event.id,
      WorkflowStatus.CANCELADO,
    );
    expect(eventNotifier.cancelled).toHaveBeenCalledWith(
      event,
      'verification-id',
    );

    await expect(service.update(event.id, {}, user)).rejects.toMatchObject({
      status: 400,
    });
    expect(eventRepository.update).not.toHaveBeenCalled();
  });
});
