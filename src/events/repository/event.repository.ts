import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Event } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';
import { EventObservation } from '../entities/event-observation.entity';
import { WorkflowStatus } from '../constants/approval-flow';

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly repository: Repository<Event>,
  ) {}

  async create(event: Event): Promise<Event> {
    const savedEvent = await this.repository.save(event);

    return (await this.findById(savedEvent.id)) as Event;
  }

  async findAll(ownerId?: string): Promise<Event[]> {
    const visibleIds = ownerId ? await this.findVisibleIds(ownerId) : undefined;

    if (visibleIds && visibleIds.length === 0) {
      return [];
    }

    return await this.repository.find({
      where: visibleIds ? { id: In(visibleIds) } : undefined,
      relations: {
        faculty: true,
        observations: { author: true },
        approvals: {
          person: true,
          role: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Ids de los eventos que un usuario puede ver: los que creó o aquellos donde
   * figura como responsable en alguna aprobación (persona vinculada a su usuario).
   * Se resuelve aparte para no filtrar las aprobaciones que se cargan después.
   */
  async findVisibleIds(userId: string, eventId?: number): Promise<number[]> {
    const query = this.repository
      .createQueryBuilder('event')
      .select('event.id')
      .leftJoin('event.approvals', 'approval')
      .leftJoin('approval.person', 'person')
      .leftJoin('person.user', 'user')
      .where('(event.createdBy = :userId OR user.id = :userId)', { userId });

    if (eventId !== undefined) {
      query.andWhere('event.id = :eventId', { eventId });
    }

    const events = await query.getMany();

    return [...new Set(events.map((event) => event.id))];
  }

  async findById(id: number): Promise<Event | null> {
    return await this.repository.findOne({
      where: { id },
      relations: {
        faculty: true,
        observations: { author: true },
        approvals: {
          person: true,
          role: true,
        },
      },
    });
  }

  async update(event: Event, replaceApprovals: boolean): Promise<Event> {
    await this.repository.manager.transaction(async (manager) => {
      if (replaceApprovals) {
        await manager.delete(EventApproval, { event: { id: event.id } });
      }

      await manager.save(Event, event);
    });

    return (await this.findById(event.id)) as Event;
  }

  async setWorkflowStatus(id: number, status: WorkflowStatus): Promise<void> {
    await this.repository.update(id, { workflowStatus: status });
  }

  async saveObservation(
    observation: EventObservation,
  ): Promise<EventObservation> {
    return await this.repository.manager.save(EventObservation, observation);
  }

  async resolveObservations(eventId: number): Promise<void> {
    await this.repository.manager
      .createQueryBuilder()
      .update(EventObservation)
      .set({ resolvedAt: () => 'NOW()' })
      .where('id_event = :eventId AND resolved_at IS NULL', { eventId })
      .execute();
  }

  /** Usuario vinculado a la persona de cada aprobación del evento (id de aprobación -> id de usuario). */
  async findApprovalUsers(eventId: number): Promise<Map<number, string>> {
    const rows = await this.repository.manager
      .getRepository(EventApproval)
      .createQueryBuilder('approval')
      .select('approval.id', 'approvalId')
      .addSelect('user.id', 'userId')
      .innerJoin('approval.event', 'event')
      .innerJoin('approval.person', 'person')
      .innerJoin('person.user', 'user')
      .where('event.id = :eventId', { eventId })
      .getRawMany<{ approvalId: number; userId: string }>();

    return new Map(rows.map((row) => [Number(row.approvalId), row.userId]));
  }

  async saveApproval(approval: EventApproval): Promise<EventApproval> {
    return await this.repository.manager.save(EventApproval, approval);
  }

  /** Indica si la persona de la aprobación está vinculada al usuario autenticado. */
  async isApprovalOfUser(approvalId: number, userId: string): Promise<boolean> {
    const count = await this.repository.manager
      .getRepository(EventApproval)
      .createQueryBuilder('approval')
      .innerJoin('approval.person', 'person')
      .innerJoin('person.user', 'user')
      .where('approval.id = :approvalId', { approvalId })
      .andWhere('user.id = :userId', { userId })
      .getCount();

    return count > 0;
  }

  async findByName(name: string): Promise<Event | null> {
    return await this.repository.findOne({
      where: { name },
    });
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
