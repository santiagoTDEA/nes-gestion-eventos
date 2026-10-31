import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Event } from '../../events/entities/event.entity';
import { User } from '../../auth/entities/auth.entity';
import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { hasGlobalAccess } from '../../auth/utils/access-scope.util';
import { ErrorManager } from '../../utils/error.manager';
import { normalizeRoleName } from '../../events/constants/approval-flow';
import {
  NotificationService,
  NotificationDraft,
} from '../../notifications/services/notification.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import {
  AREA_LABEL,
  AREA_ROLE,
  DIFFUSION_TRANSITIONS,
  DiffusionArea,
  DiffusionAssetType,
  DiffusionStatus,
  REQUESTS_BY_LOGISTICS,
  allowedAssetTypes,
  isAreaExecutor,
} from '../constants/diffusion.constants';
import { DiffusionRequest } from '../entities/diffusion-request.entity';
import { DiffusionAsset } from '../entities/diffusion-asset.entity';
import { DiffusionStatusHistory } from '../entities/diffusion-status-history.entity';
import { FileStorage } from '../storage/file-storage';
import { TransitionDto } from '../dto/diffusion.dto';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface DiffusionAction {
  to: DiffusionStatus;
  label: string;
  requiresNote: boolean;
}

export interface DiffusionRequestView {
  id: number;
  eventId: number;
  eventName: string;
  type: string;
  area: DiffusionArea;
  areaLabel: string;
  status: DiffusionStatus;
  eventSnapshot: DiffusionRequest['eventSnapshot'];
  allowedAssetTypes: DiffusionAssetType[];
  allowedActions: DiffusionAction[];
  canUpload: boolean;
  assets: {
    id: number;
    assetType: DiffusionAssetType;
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }[];
  history: {
    id: number;
    fromStatus: DiffusionStatus | null;
    toStatus: DiffusionStatus;
    changedByName: string;
    note: string | null;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const MB = 1024 * 1024;

const MIME_BY_ASSET: Record<
  DiffusionAssetType,
  { mimes: string[]; maxSize: number }
> = {
  [DiffusionAssetType.FLYER]: {
    mimes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    maxSize: 10 * MB,
  },
  [DiffusionAssetType.BANNER]: {
    mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    maxSize: 10 * MB,
  },
  [DiffusionAssetType.HISTORIAS]: {
    mimes: ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'],
    maxSize: 25 * MB,
  },
  [DiffusionAssetType.VIDEO]: {
    mimes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxSize: 100 * MB,
  },
  [DiffusionAssetType.CORREOS]: {
    mimes: ['application/pdf', 'text/html', 'image/png', 'image/jpeg'],
    maxSize: 10 * MB,
  },
};

@Injectable()
export class DiffusionService {
  private readonly logger = new Logger(DiffusionService.name);

  constructor(
    @InjectRepository(DiffusionRequest)
    private readonly requests: Repository<DiffusionRequest>,
    @InjectRepository(DiffusionAsset)
    private readonly assets: Repository<DiffusionAsset>,
    @InjectRepository(DiffusionStatusHistory)
    private readonly history: Repository<DiffusionStatusHistory>,
    private readonly notifications: NotificationService,
    private readonly storage: FileStorage,
  ) {}

  /**
   * Se llama cuando el evento completa el flujo de aprobación: crea una solicitud
   * por cada apoyo que el organizador marcó con "Sí" en logística. Es idempotente.
   */
  async createFromEvent(event: Event, authorIds: string[]): Promise<void> {
    try {
      const existing = await this.requests.count({
        where: { event: { id: event.id } },
      });
      if (existing > 0) return;

      const drafts: NotificationDraft[] = [];

      for (const rule of REQUESTS_BY_LOGISTICS) {
        if (!this.isYes(event.logistics, rule.aspect)) continue;

        const request = await this.requests.save(
          this.requests.create({
            event: { id: event.id },
            type: rule.type,
            area: rule.area,
            status: DiffusionStatus.SOLICITADA,
            requestedBy: event.createdBy,
            authorIds,
            eventSnapshot: {
              name: event.name,
              eventType: event.eventType,
              faculty: event.faculty?.name ?? '',
              modality: event.modality,
              startDate: event.startDate,
              endDate: event.endDate,
              schedules: (event.schedules ?? []).map((schedule) => ({
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime.slice(0, 5),
                endTime: schedule.endTime.slice(0, 5),
              })),
              participantProfile: event.participantProfile,
              presentation: event.presentation,
            },
          }),
        );

        await this.history.save(
          this.history.create({
            request: { id: request.id },
            fromStatus: null,
            toStatus: DiffusionStatus.SOLICITADA,
            changedByName: 'Sistema (evento aprobado)',
            note: null,
          }),
        );

        for (const userId of await this.executorIds(rule.area)) {
          drafts.push({
            userId,
            eventId: event.id,
            type: NotificationType.DIFUSION_NUEVA,
            message: `Nueva solicitud de ${rule.type === 'difusion' ? 'difusión' : 'piezas'} para «${event.name}» (${AREA_LABEL[rule.area]}).`,
          });
        }
      }

      await this.notifications.notify(drafts);
    } catch (error) {
      // Aprobar el evento no debe fallar porque la difusión no pudo crearse.
      this.logger.error(
        'No se pudieron crear las solicitudes de difusión',
        error,
      );
    }
  }

  async findAll(user: AuthUser): Promise<DiffusionRequestView[]> {
    const query = this.requests
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.event', 'event')
      .leftJoinAndSelect('request.assets', 'asset')
      .leftJoinAndSelect('request.history', 'history')
      .orderBy('request.createdAt', 'DESC')
      .addOrderBy('history.id', 'ASC');

    if (!hasGlobalAccess(user.role)) {
      const areas = this.executorAreas(user);

      query.where(
        areas.length > 0
          ? '(request.area IN (:...areas) OR request.authorIds LIKE :author)'
          : 'request.authorIds LIKE :author',
        { areas, author: `%${user.userId}%` },
      );
    }

    return (await query.getMany()).map((request) => this.toView(request, user));
  }

  async findOne(id: number, user: AuthUser): Promise<DiffusionRequestView> {
    return this.toView(await this.load(id, user), user);
  }

  async transition(
    id: number,
    dto: TransitionDto,
    user: AuthUser,
  ): Promise<DiffusionRequestView> {
    const request = await this.load(id, user);
    const rule = DIFFUSION_TRANSITIONS.find(
      (item) => item.from === request.status && item.to === dto.to,
    );

    if (!rule) {
      this.fail(
        'BAD_REQUEST',
        `No se puede pasar de "${request.status}" a "${dto.to}"`,
      );
    }

    if (!this.canAct(rule.by, request, user)) {
      this.fail(
        'FORBIDDEN',
        'No tienes permiso para realizar este cambio de estado',
      );
    }

    const note = dto.note?.trim();
    if (rule.requiresNote && (!note || note.length < 10)) {
      this.fail(
        'BAD_REQUEST',
        'La observación es obligatoria (mínimo 10 caracteres)',
      );
    }

    if (rule.requiresAsset && request.assets.length === 0) {
      this.fail(
        'BAD_REQUEST',
        'Sube al menos una pieza antes de enviarla a revisión',
      );
    }

    const from = request.status;
    await this.requests.update(request.id, { status: dto.to });
    await this.history.save(
      this.history.create({
        request: { id: request.id },
        fromStatus: from,
        toStatus: dto.to,
        changedByName: await this.userName(user),
        changedBy: user.userId,
        note: note ?? null,
      }),
    );

    await this.notifyTransition(request, dto.to, note, user);

    return this.findOne(id, user);
  }

  async addAsset(
    id: number,
    assetType: DiffusionAssetType,
    file: UploadedFileLike | undefined,
    user: AuthUser,
  ): Promise<DiffusionRequestView> {
    const request = await this.load(id, user);

    if (!file) {
      this.fail('BAD_REQUEST', 'Adjunta un archivo');
    }

    if (
      !this.canAct('executor', request, user) ||
      request.status !== DiffusionStatus.EN_DISENO
    ) {
      this.fail(
        'FORBIDDEN',
        'Solo el área responsable puede subir piezas mientras la solicitud está en diseño',
      );
    }

    if (!allowedAssetTypes(request.type, request.area).includes(assetType)) {
      this.fail(
        'BAD_REQUEST',
        `Esta solicitud no admite piezas de tipo "${assetType}"`,
      );
    }

    const rules = MIME_BY_ASSET[assetType];
    if (!rules.mimes.includes(file.mimetype)) {
      this.fail(
        'BAD_REQUEST',
        `Formato no permitido para "${assetType}" (${file.mimetype})`,
      );
    }

    if (file.size > rules.maxSize) {
      this.fail(
        'BAD_REQUEST',
        `El archivo supera el máximo de ${Math.round(rules.maxSize / MB)} MB`,
      );
    }

    const path = await this.storage.save(`diffusion/${request.id}`, {
      originalName: file.originalname,
      buffer: file.buffer,
    });

    await this.assets.save(
      this.assets.create({
        request: { id: request.id },
        assetType,
        originalName: file.originalname.slice(0, 255),
        path,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: user.userId,
      }),
    );

    return this.findOne(id, user);
  }

  async removeAsset(
    id: number,
    assetId: number,
    user: AuthUser,
  ): Promise<DiffusionRequestView> {
    const request = await this.load(id, user);

    if (
      !this.canAct('executor', request, user) ||
      request.status !== DiffusionStatus.EN_DISENO
    ) {
      this.fail(
        'FORBIDDEN',
        'Solo el área responsable puede quitar piezas mientras la solicitud está en diseño',
      );
    }

    const asset = request.assets.find((item) => item.id === assetId);
    if (!asset) {
      this.fail('NOT_FOUND', 'No se encontró la pieza');
    }

    await this.assets.delete(asset.id);
    await this.storage.remove(asset.path);

    return this.findOne(id, user);
  }

  // --- Reglas de acceso ---------------------------------------------------

  /** Áreas que atiende el rol del usuario. */
  private executorAreas(user: AuthUser): DiffusionArea[] {
    return (Object.values(DiffusionArea) as DiffusionArea[]).filter((area) =>
      isAreaExecutor(user.role?.name, area),
    );
  }

  private canAct(
    by: 'executor' | 'author',
    request: DiffusionRequest,
    user: AuthUser,
  ): boolean {
    if (hasGlobalAccess(user.role)) return true;

    return by === 'executor'
      ? isAreaExecutor(user.role?.name, request.area)
      : request.authorIds.includes(user.userId);
  }

  private async load(id: number, user: AuthUser): Promise<DiffusionRequest> {
    const request = await this.requests.findOne({
      where: { id },
      relations: { event: true, assets: true, history: true },
    });

    if (!request) {
      this.fail('NOT_FOUND', `No se encontró la solicitud con ID "${id}"`);
    }

    const visible =
      hasGlobalAccess(user.role) ||
      isAreaExecutor(user.role?.name, request.area) ||
      request.authorIds.includes(user.userId);

    if (!visible) {
      this.fail('FORBIDDEN', 'No tienes permiso para acceder a esta solicitud');
    }

    return request;
  }

  private toView(
    request: DiffusionRequest,
    user: AuthUser,
  ): DiffusionRequestView {
    const allowedActions = DIFFUSION_TRANSITIONS.filter(
      (rule) =>
        rule.from === request.status && this.canAct(rule.by, request, user),
    ).map((rule) => ({
      to: rule.to,
      label: rule.label,
      requiresNote: !!rule.requiresNote,
    }));

    return {
      id: request.id,
      eventId: request.event.id,
      eventName: request.event.name,
      type: request.type,
      area: request.area,
      areaLabel: AREA_LABEL[request.area],
      status: request.status,
      eventSnapshot: request.eventSnapshot,
      allowedAssetTypes: allowedAssetTypes(request.type, request.area),
      allowedActions,
      canUpload:
        request.status === DiffusionStatus.EN_DISENO &&
        this.canAct('executor', request, user),
      assets: [...(request.assets ?? [])]
        .sort((a, b) => a.id - b.id)
        .map((asset) => ({
          id: asset.id,
          assetType: asset.assetType,
          originalName: asset.originalName,
          path: asset.path,
          mimeType: asset.mimeType,
          size: asset.size,
          createdAt: asset.createdAt,
        })),
      history: [...(request.history ?? [])]
        .sort((a, b) => a.id - b.id)
        .map((item) => ({
          id: item.id,
          fromStatus: item.fromStatus ?? null,
          toStatus: item.toStatus,
          changedByName: item.changedByName,
          note: item.note ?? null,
          createdAt: item.createdAt,
        })),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  // --- Notificaciones -----------------------------------------------------

  private async notifyTransition(
    request: DiffusionRequest,
    to: DiffusionStatus,
    note: string | undefined,
    actor: AuthUser,
  ): Promise<void> {
    try {
      const name = request.event.name;
      const area = AREA_LABEL[request.area];
      const authors = request.authorIds.filter((id) => id !== actor.userId);
      const executors = (await this.executorIds(request.area)).filter(
        (id) => id !== actor.userId,
      );
      const drafts: NotificationDraft[] = [];
      const push = (
        userIds: string[],
        type: NotificationType,
        message: string,
      ) =>
        userIds.forEach((userId) =>
          drafts.push({ userId, eventId: request.event.id, type, message }),
        );

      if (
        to === DiffusionStatus.EN_DISENO &&
        request.status === DiffusionStatus.SOLICITADA
      ) {
        push(
          authors,
          NotificationType.DIFUSION_ESTADO,
          `${area} empezó el diseño de las piezas de «${name}».`,
        );
      } else if (to === DiffusionStatus.EN_REVISION) {
        push(
          authors,
          NotificationType.DIFUSION_REVISION,
          `Las piezas de «${name}» están listas para tu revisión.`,
        );
      } else if (to === DiffusionStatus.PUBLICADA) {
        push(
          executors,
          NotificationType.DIFUSION_ESTADO,
          `Las piezas de «${name}» fueron aprobadas y publicadas.`,
        );
      } else if (to === DiffusionStatus.EN_DISENO) {
        push(
          executors,
          NotificationType.DIFUSION_DEVUELTA,
          `Devolvieron las piezas de «${name}»: ${note ?? ''}`,
        );
      }

      await this.notifications.notify(drafts);
    } catch (error) {
      this.logger.error(
        'No se pudieron registrar las notificaciones de difusión',
        error,
      );
    }
  }

  /** Usuarios cuyo rol atiende el área. */
  private async executorIds(area: DiffusionArea): Promise<string[]> {
    const rows = await this.requests.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin('user.person', 'person')
      .innerJoin('person.role', 'role')
      .select('user.id', 'id')
      .addSelect('role.name', 'roleName')
      .getRawMany<{ id: string; roleName: string }>();

    return rows
      .filter((row) => normalizeRoleName(row.roleName) === AREA_ROLE[area])
      .map((row) => row.id);
  }

  private async userName(user: AuthUser): Promise<string> {
    const row = await this.requests.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoin('user.person', 'person')
      .select('person.name', 'name')
      .where('user.id = :id', { id: user.userId })
      .getRawOne<{ name: string | null }>();

    return row?.name || user.username;
  }

  private isYes(
    logistics: Record<string, string> | undefined,
    aspect: string,
  ): boolean {
    return normalizeRoleName(logistics?.[aspect]) === 'si';
  }

  private fail(
    type: 'BAD_REQUEST' | 'FORBIDDEN' | 'NOT_FOUND',
    message: string,
  ): never {
    try {
      throw new ErrorManager({ type, message });
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }
}
