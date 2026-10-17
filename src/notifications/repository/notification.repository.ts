import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, IsNull, Repository } from 'typeorm';

import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  async createMany(items: DeepPartial<Notification>[]): Promise<void> {
    if (items.length === 0) {
      return;
    }

    await this.repository.save(
      items.map((item) => this.repository.create(item)),
    );
  }

  async findForUser(userId: string, limit: number): Promise<Notification[]> {
    return await this.repository.find({
      where: { user: { id: userId } },
      relations: { event: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return await this.repository.count({
      where: { user: { id: userId }, readAt: IsNull() },
    });
  }

  /** Marca como leída una notificación del usuario; devuelve si existía. */
  async markRead(id: number, userId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, user: { id: userId }, readAt: IsNull() },
      { readAt: () => 'NOW()' },
    );

    return (result.affected ?? 0) > 0;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.update(
      { user: { id: userId }, readAt: IsNull() },
      { readAt: () => 'NOW()' },
    );
  }
}
