import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { CurrentUser } from '../../auth/decorators/current-user/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';
import type { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  NotificationService,
  NotificationView,
} from '../services/notification.service';

/**
 * Las notificaciones son del usuario autenticado, así que basta con estar
 * logueado: el permiso se declara como catálogo y todo se filtra por su id.
 */
@ApiBearerAuth('access-token')
@ApiTags('Notificaciones')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @RequirePermission(Module.EVENTOS, Action.VER, { isCatalog: true })
  @Get()
  @ApiOperation({
    summary: 'Notificaciones del usuario autenticado y cuántas no ha leído',
  })
  async findMine(
    @CurrentUser() user: AuthUser,
  ): Promise<{ unread: number; items: NotificationView[] }> {
    return this.notificationService.findForUser(user.userId);
  }

  @RequirePermission(Module.EVENTOS, Action.VER, { isCatalog: true })
  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas mis notificaciones como leídas' })
  async markAllRead(@CurrentUser() user: AuthUser): Promise<{ ok: boolean }> {
    await this.notificationService.markAllRead(user.userId);

    return { ok: true };
  }

  @RequirePermission(Module.EVENTOS, Action.VER, { isCatalog: true })
  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una de mis notificaciones como leída' })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<{ ok: boolean }> {
    await this.notificationService.markRead(id, user.userId);

    return { ok: true };
  }
}
