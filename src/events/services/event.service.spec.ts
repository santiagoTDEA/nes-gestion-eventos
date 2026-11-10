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
import { ApprovalStatus } from '../constants/approval-flow';
import { UpdateEventDto } from '../dto/event.dto';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('EventService', () => {
  let service: EventService;
  let eventRepository: {
    findById: jest.Mock;
    findVisibleIds: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    eventRepository = {
      findById: jest.fn(),
      findVisibleIds: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: EventRepository, useValue: eventRepository },
        { provide: FacultyRepository, useValue: {} },
        { provide: PersonRepository, useValue: {} },
        { provide: RoleRepository, useValue: {} },
        { provide: EventNotifier, useValue: {} },
        { provide: DiffusionService, useValue: {} },
        { provide: SignatureService, useValue: {} },
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
    event.minimumCapacity = 1;
    event.maximumCapacity = 10;

    return event;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('denies edits to approved events for roles other than verification or admin', async () => {
    const event = makeEvent(ApprovalStatus.APROBADO);
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.findVisibleIds.mockResolvedValue([event.id]);

    await expect(
      service.update(
        event.id,
        {} as UpdateEventDto,
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
    eventRepository.findVisibleIds.mockResolvedValue([event.id]);
    eventRepository.update.mockResolvedValue(event);

    await expect(
      service.update(
        event.id,
        {} as UpdateEventDto,
        {
          userId: 'user-id',
          username: 'verification',
          status: 'Activo',
          role: { id: 'verification-role', name: 'Verificación' },
        },
      ),
    ).resolves.toBe(event);

    expect(eventRepository.update).toHaveBeenCalledWith(event, false);
  });

  it('allows administrators to edit an approved event', async () => {
    const event = makeEvent(ApprovalStatus.APROBADO);
    eventRepository.findById.mockResolvedValue(event);
    eventRepository.update.mockResolvedValue(event);

    await expect(
      service.update(
        event.id,
        {} as UpdateEventDto,
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
        {} as UpdateEventDto,
        {
          userId: 'user-id',
          username: 'validator',
          status: 'Activo',
          role: { id: 'validator-role', name: 'Validación' },
        },
      ),
    ).resolves.toBe(event);
  });
});
