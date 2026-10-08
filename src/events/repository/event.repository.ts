import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Event } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';

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

  async findAll(): Promise<Event[]> {
    return await this.repository.find({
      relations: {
        faculty: true,
        approvals: {
          person: true,
          role: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Event | null> {
    return await this.repository.findOne({
      where: { id },
      relations: {
        faculty: true,
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

  async findByName(name: string): Promise<Event | null> {
    return await this.repository.findOne({
      where: { name },
    });
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
