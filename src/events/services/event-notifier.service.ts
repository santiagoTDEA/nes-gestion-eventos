import { Injectable, Logger } from '@nestjs/common';

import { EventRepository } from '../repository/event.repository';
import { Event } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';
import { ApprovalStatus, flowPosition } from '../constants/approval-flow';
import {
  NotificationDraft,
  NotificationService,
} from '../../notifications/services/notification.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

interface WorkflowStep {
  approval: EventApproval;
  /** Usuario vinculado a la persona del paso; puede no existir. */
  userId?: string;
}

interface WorkflowContext {
  steps: WorkflowStep[];
  /** Quien creó el evento y la persona del primer paso (Elaboración). */
  authorIds: string[];
  /** Paso que espera firma, si el flujo no ha terminado. */
  current?: WorkflowStep;
}

const MAX_OBSERVATION_PREVIEW = 140;

/**
 * Genera las notificaciones del flujo de un evento: asignación, turno de firma,
 * firmas, devolución, reenvío y aprobación final. Un fallo al notificar nunca
 * debe romper la acción principal, por eso cada método captura sus errores.
 */
@Injectable()
export class EventNotifier {
  private readonly logger = new Logger(EventNotifier.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Evento nuevo: confirma al autor y avisa a cada responsable asignado. */
  async created(event: Event): Promise<void> {
    await this.safely(async () => {
      const context = await this.buildContext(event);
      const drafts: NotificationDraft[] = [];

      this.toUsers(drafts, context.authorIds, event, {
        type: NotificationType.CREADO,
        message: `Tu evento «${event.name}» fue enviado al flujo de aprobación.`,
      });

      for (const step of context.steps.slice(1)) {
        if (!step.userId) continue;

        const role = step.approval.role.name;
        const isCurrent = step === context.current;

        this.toUsers(drafts, [step.userId], event, {
          type: isCurrent ? NotificationType.TURNO : NotificationType.ASIGNADO,
          message: isCurrent
            ? `Te toca firmar el evento «${event.name}» como ${role}.`
            : `Fuiste asignado al evento «${event.name}» como ${role}; firmarás cuando sea tu turno.`,
        });
      }

      await this.notificationService.notify(drafts);
    });
  }

  /** Un paso se firmó: avisa al autor y al siguiente responsable, o cierra el flujo. */
  async signed(event: Event, actorUserId: string): Promise<void> {
    await this.safely(async () => {
      const context = await this.buildContext(event);
      const drafts: NotificationDraft[] = [];

      if (!context.current) {
        const everyone = [
          ...context.authorIds,
          ...context.steps.map((step) => step.userId),
        ];

        this.toUsers(drafts, everyone, event, {
          type: NotificationType.APROBADO,
          message: `El evento «${event.name}» completó el flujo de aprobación.`,
        });
        await this.notificationService.notify(drafts);

        return;
      }

      const lastSigned = [...context.steps]
        .reverse()
        .find((step) => step.approval.status === ApprovalStatus.APROBADO);

      if (lastSigned) {
        const who = lastSigned.approval.person?.name || 'Un responsable';

        this.toUsers(
          drafts,
          context.authorIds.filter((id) => id !== actorUserId),
          event,
          {
            type: NotificationType.FIRMADO,
            message: `${who} firmó el evento «${event.name}» como ${lastSigned.approval.role.name}.`,
          },
        );
      }

      this.toUsers(drafts, [context.current.userId], event, {
        type: NotificationType.TURNO,
        message: `Te toca firmar el evento «${event.name}» como ${context.current.approval.role.name}.`,
      });

      await this.notificationService.notify(drafts);
    });
  }

  /** El evento volvió al autor con una observación. */
  async returned(
    event: Event,
    stepRole: string,
    observation: string,
    actorUserId: string,
  ): Promise<void> {
    await this.safely(async () => {
      const context = await this.buildContext(event);
      const preview =
        observation.length > MAX_OBSERVATION_PREVIEW
          ? `${observation.slice(0, MAX_OBSERVATION_PREVIEW)}…`
          : observation;
      const drafts: NotificationDraft[] = [];

      this.toUsers(
        drafts,
        context.authorIds.filter((id) => id !== actorUserId),
        event,
        {
          type: NotificationType.DEVUELTO,
          message: `${stepRole} devolvió el evento «${event.name}»: ${preview}`,
        },
      );

      await this.notificationService.notify(drafts);
    });
  }

  /** El autor reenvió el evento: vuelve a ser el turno de quien lo devolvió. */
  async resubmitted(event: Event): Promise<void> {
    await this.safely(async () => {
      const context = await this.buildContext(event);
      const drafts: NotificationDraft[] = [];

      this.toUsers(drafts, [context.current?.userId], event, {
        type: NotificationType.REENVIADO,
        message: `El autor corrigió y reenvió el evento «${event.name}»; te toca firmar como ${context.current?.approval.role.name}.`,
      });

      await this.notificationService.notify(drafts);
    });
  }

  /** Usuarios que se consideran autores del evento (creador y persona de Elaboración). */
  async authorIds(event: Event): Promise<string[]> {
    return (await this.buildContext(event)).authorIds;
  }

  private async buildContext(event: Event): Promise<WorkflowContext> {
    const users = await this.eventRepository.findApprovalUsers(event.id);
    const steps = [...event.approvals]
      .sort((a, b) => flowPosition(a.role?.name) - flowPosition(b.role?.name))
      .map((approval) => ({ approval, userId: users.get(approval.id) }));

    const authorIds = [event.createdBy, steps[0]?.userId].filter(
      (id): id is string => !!id,
    );

    return {
      steps,
      authorIds: [...new Set(authorIds)],
      current: steps.find(
        (step) => step.approval.status !== ApprovalStatus.APROBADO,
      ),
    };
  }

  /** Agrega un aviso por usuario, sin repetir destinatarios ni usuarios vacíos. */
  private toUsers(
    drafts: NotificationDraft[],
    userIds: (string | undefined | null)[],
    event: Event,
    content: { type: NotificationType; message: string },
  ): void {
    for (const userId of new Set(userIds)) {
      if (!userId) continue;

      drafts.push({ userId, eventId: event.id, ...content });
    }
  }

  private async safely(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.error('No se pudieron registrar las notificaciones', error);
    }
  }
}
