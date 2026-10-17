import { Injectable } from '@nestjs/common';

import { NotificationRepository } from '../repository/notification.repository';
import {
  Notification,
  NotificationType,
} from '../entities/notification.entity';

export interface NotificationView {
  id: number;
  type: NotificationType;
  message: string;
  eventId: number;
  eventName: string;
  createdAt: Date;
  read: boolean;
}

export interface NotificationDraft {
  userId: string;
  eventId: number;
  type: NotificationType;
  message: string;
}

const MAX_NOTIFICATIONS = 50;

@Injectable()
export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  /** Crea notificaciones; un mismo usuario no recibe dos veces el mismo aviso de una acción. */
  async notify(drafts: NotificationDraft[]): Promise<void> {
    await this.repository.createMany(
      drafts.map((draft) => ({
        user: { id: draft.userId },
        event: { id: draft.eventId },
        type: draft.type,
        message: draft.message,
      })),
    );
  }

  async findForUser(userId: string): Promise<{
    unread: number;
    items: NotificationView[];
  }> {
    const [items, unread] = await Promise.all([
      this.repository.findForUser(userId, MAX_NOTIFICATIONS),
      this.repository.countUnread(userId),
    ]);

    return { unread, items: items.map((item) => this.toView(item)) };
  }

  async markRead(id: number, userId: string): Promise<void> {
    await this.repository.markRead(id, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.markAllRead(userId);
  }

  private toView(item: Notification): NotificationView {
    return {
      id: item.id,
      type: item.type,
      message: item.message,
      eventId: item.event.id,
      eventName: item.event.name,
      createdAt: item.createdAt,
      read: !!item.readAt,
    };
  }
}
