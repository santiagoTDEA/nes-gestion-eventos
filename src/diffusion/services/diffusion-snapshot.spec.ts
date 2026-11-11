import { describe, beforeEach, it, expect, jest } from '@jest/globals';

// @nestjs/typeorm se publica como ESM y Jest no lo transforma; aquí solo se usa su decorador.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { DiffusionService } from './diffusion.service';
import { DiffusionArea } from '../constants/diffusion.constants';
import { DiffusionRequest } from '../entities/diffusion-request.entity';
import { Event } from '../../events/entities/event.entity';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return Object.assign(new Event(), {
    id: 10,
    name: 'Curso de Excel',
    eventType: 'Curso',
    faculty: { name: 'Ingeniería' },
    modality: 'Presencial',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    startTime: '08:00:00',
    endTime: '12:00:00',
    participantProfile: 'Estudiantes',
    presentation: 'Curso básico',
    ...overrides,
  });
}

function snapshotOf(event: Event): DiffusionRequest['eventSnapshot'] {
  return {
    name: event.name,
    eventType: event.eventType,
    faculty: event.faculty?.name ?? '',
    modality: event.modality,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    participantProfile: event.participantProfile,
    presentation: event.presentation,
  };
}

describe('DiffusionService.refreshEventSnapshot', () => {
  let service: DiffusionService;
  let stored: DiffusionRequest[];
  let requests: {
    find: jest.Mock<() => Promise<DiffusionRequest[]>>;
    save: jest.Mock<(items: DiffusionRequest[]) => Promise<DiffusionRequest[]>>;
  };
  let notify: jest.Mock<(drafts: unknown[]) => Promise<void>>;
  let users: { createQueryBuilder: jest.Mock<() => unknown> };

  function request(
    id: number,
    area: DiffusionArea,
    status: string,
  ): DiffusionRequest {
    return Object.assign(new DiffusionRequest(), {
      id,
      area,
      status,
      eventSnapshot: snapshotOf(makeEvent()),
      assets: [{ id: 99 }],
    });
  }

  beforeEach(() => {
    const areas = Object.values(DiffusionArea) as DiffusionArea[];
    stored = [
      request(1, areas[0], 'en_proceso'),
      request(2, areas[0], 'solicitada'),
    ];

    requests = {
      find: jest.fn(() => Promise.resolve(stored)),
      save: jest.fn((items: DiffusionRequest[]) => Promise.resolve(items)),
    };
    notify = jest.fn(() => Promise.resolve());

    service = new DiffusionService(
      requests as never,
      {} as never,
      {} as never,
      { notify } as never,
      {} as never,
    );

    // Responsables del área: se consultan aparte; aquí se fija un usuario.
    jest
      .spyOn(
        service as unknown as { executorIds: () => Promise<string[]> },
        'executorIds',
      )
      .mockResolvedValue(['area-user']);
    users = { createQueryBuilder: jest.fn() };
  });

  it('actualiza los datos del evento sin tocar estado ni piezas y avisa al área', async () => {
    await service.refreshEventSnapshot(
      makeEvent({ startDate: '2026-12-08', name: 'Curso de Excel avanzado' }),
    );

    const [saved] = requests.save.mock.calls[0];
    expect(saved).toHaveLength(2);
    expect(saved[0].eventSnapshot.startDate).toBe('2026-12-08');
    expect(saved[0].eventSnapshot.name).toBe('Curso de Excel avanzado');
    expect(saved[0].status).toBe('en_proceso');
    expect(saved[0].assets).toEqual([{ id: 99 }]);

    const [drafts] = notify.mock.calls[0] as [
      { userId: string; message: string }[],
    ];
    expect(drafts).toHaveLength(1);
    expect(drafts[0].userId).toBe('area-user');
    expect(drafts[0].message).toContain('Curso de Excel avanzado');
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('no guarda ni avisa si los datos no cambiaron', async () => {
    await service.refreshEventSnapshot(makeEvent());

    expect(requests.save).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('un error en difusión no rompe la edición del evento', async () => {
    requests.find.mockRejectedValue(new Error('BD caída'));

    await expect(
      service.refreshEventSnapshot(makeEvent({ name: 'Otro' })),
    ).resolves.toBeUndefined();
  });
});
