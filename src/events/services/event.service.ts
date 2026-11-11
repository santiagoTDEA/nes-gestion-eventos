import { Injectable } from '@nestjs/common';
import { EventRepository } from '../repository/event.repository';
import { FacultyRepository } from '../../faculty/repository/faculty.repository';
import { PersonRepository } from '../../person/repository/person.repository';
import { RoleRepository } from '../../roles/repositories/role.repository';
import { Event } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';
import {
  CancelEventDto,
  CreateEventDto,
  ReturnEventDto,
  UpdateEventDto,
} from '../dto/event.dto';
import { EventObservation } from '../entities/event-observation.entity';
import { EventNotifier } from './event-notifier.service';
import { DiffusionService } from '../../diffusion/services/diffusion.service';
import { SignatureService } from '../../auth/services/signature.service';
import { ErrorManager } from '../../utils/error.manager';
import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  getOwnerScope,
  hasGlobalAccess,
} from '../../auth/utils/access-scope.util';
import {
  ApprovalStatus,
  flowPosition,
  isCancelled,
  isFirstStep,
  isFullyApproved,
  isVerificationRole,
  WorkflowStatus,
} from '../constants/approval-flow';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly facultyRepository: FacultyRepository,
    private readonly personRepository: PersonRepository,
    private readonly roleRepository: RoleRepository,
    private readonly notifier: EventNotifier,
    private readonly diffusionService: DiffusionService,
    private readonly signatureService: SignatureService,
  ) {}

  /** Todos los eventos visibles, incluidos los cancelados (solo el módulo Eventos los muestra). */
  async findAll(user: AuthUser): Promise<Event[]> {
    const events = await this.eventRepository.findAll(getOwnerScope(user));
    const managed = await this.managedEventIds(
      user,
      events.map((event) => event.id),
    );

    return events.map((event) =>
      Object.assign(event, {
        canManage: managed === 'all' || managed.has(event.id),
      }),
    );
  }

  async findById(idEvent: number, user: AuthUser): Promise<Event> {
    const event = await this.findVisible(idEvent, user);
    event.canManage = await this.canManage(event, user);

    return event;
  }

  /**
   * Cancela el evento en el estado en que esté. Solo marca la cancelación: las
   * aprobaciones, firmas y el estado del workflow quedan intactos para reactivarlo.
   */
  async cancel(
    idEvent: number,
    dto: CancelEventDto,
    user: AuthUser,
  ): Promise<Event> {
    try {
      const event = await this.findVisible(idEvent, user);
      await this.assertCanManage(event, user, 'cancelar');

      if (isCancelled(event)) {
        throw new ErrorManager({
          type: 'CONFLICT',
          message: 'El evento ya está cancelado',
        });
      }

      const reason = dto.reason.trim();
      const person = await this.personRepository.findByUserId(user.userId);

      await this.eventRepository.setCancellation(idEvent, {
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy: user.userId,
        cancelledByName: person?.name || user.username,
      });

      const updated = await this.findById(idEvent, user);
      await this.notifier.cancelled(updated, reason, user.userId);

      return updated;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  /** Quita la cancelación: el evento sigue en el mismo paso y con las mismas firmas. */
  async reactivate(idEvent: number, user: AuthUser): Promise<Event> {
    try {
      const event = await this.findVisible(idEvent, user);
      await this.assertCanManage(event, user, 'reactivar');

      if (!isCancelled(event)) {
        throw new ErrorManager({
          type: 'CONFLICT',
          message: 'El evento no está cancelado',
        });
      }

      await this.eventRepository.clearCancellation(idEvent, user.userId);

      const updated = await this.findById(idEvent, user);
      await this.notifier.reactivated(updated, user.userId);

      return updated;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  /**
   * Puede cancelar, reactivar y editar el evento en cualquier estado:
   * - rol con permisos y módulos completos (administrador), o
   * - rol Verificación y responsable del paso de Verificación de ese evento.
   */
  private async canManage(event: Event, user: AuthUser): Promise<boolean> {
    const managed = await this.managedEventIds(user, [event.id]);

    return managed === 'all' || managed.has(event.id);
  }

  private async managedEventIds(
    user: AuthUser,
    eventIds: number[],
  ): Promise<'all' | Set<number>> {
    if (hasGlobalAccess(user.role)) return 'all';
    if (!isVerificationRole(user.role?.name)) return new Set();

    return new Set(
      await this.eventRepository.findVerificationEventIds(
        user.userId,
        eventIds,
      ),
    );
  }

  private async assertCanManage(
    event: Event,
    user: AuthUser,
    action: string,
  ): Promise<void> {
    if (!(await this.canManage(event, user))) {
      throw new ErrorManager({
        type: 'FORBIDDEN',
        message: `Solo un administrador o el responsable de Verificación del evento pueden ${action}lo`,
      });
    }
  }

  /** Las acciones del flujo no aplican a un evento cancelado. */
  private assertNotCancelled(event: Event, action: string): void {
    if (isCancelled(event)) {
      throw new ErrorManager({
        type: 'CONFLICT',
        message: `El evento está cancelado; reactívalo antes de ${action}`,
      });
    }
  }

  /** Evento por id, validando que el usuario lo pueda ver. */
  private async findVisible(idEvent: number, user: AuthUser): Promise<Event> {
    try {
      const event = await this.eventRepository.findById(idEvent);

      if (!event) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró el evento con ese ID "${idEvent}"`,
        });
      }

      const ownerId = getOwnerScope(user);

      if (
        ownerId &&
        (await this.eventRepository.findVisibleIds(ownerId, idEvent)).length ===
          0
      ) {
        throw new ErrorManager({
          type: 'FORBIDDEN',
          message: 'No tienes permiso para acceder a este evento',
        });
      }

      return event;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async create(createEventDto: CreateEventDto, user: AuthUser): Promise<Event> {
    try {
      this.validateBusinessRules(createEventDto);

      const existingEvent = await this.eventRepository.findByName(
        createEventDto.name,
      );

      if (existingEvent) {
        throw new ErrorManager({
          type: 'CONFLICT',
          message: `Ya existe un evento con el nombre "${createEventDto.name}"`,
        });
      }

      const faculty = await this.facultyRepository.findById(
        createEventDto.facultyId,
      );

      if (!faculty) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: 'No se encontró la facultad',
        });
      }

      // Quien crea el evento es su responsable de elaboración; no viene en el body.
      const approvals = [
        await this.buildAuthorApproval(user),
        ...(await this.buildApprovals(createEventDto.approvals)),
      ];
      this.assertFlowComplete(approvals);

      const event = new Event();

      event.eventType = createEventDto.eventType;
      event.otherEventType = createEventDto.otherEventType;
      event.name = createEventDto.name;
      event.faculty = faculty;
      event.academicProgram = createEventDto.academicProgram;
      event.teacherProfile = createEventDto.teacherProfile;
      event.duration = createEventDto.duration;
      event.startTime = createEventDto.startTime;
      event.endTime = createEventDto.endTime;
      event.selectedDays = createEventDto.selectedDays;
      event.modality = createEventDto.modality;
      event.startDate = createEventDto.startDate;
      event.endDate = createEventDto.endDate;
      event.minimumCapacity = createEventDto.minimumCapacity;
      event.maximumCapacity = createEventDto.maximumCapacity;
      event.participantProfile = createEventDto.participantProfile;
      event.presentation = createEventDto.presentation;
      event.scope = createEventDto.scope;
      event.generalObjective = createEventDto.generalObjective;
      event.objectives = createEventDto.objectives;
      event.competencies = createEventDto.competencies;
      event.modules = createEventDto.modules;
      event.logistics = createEventDto.logistics;
      event.costPerParticipant = createEventDto.costPerParticipant;
      event.confirmedMinimumCapacity = createEventDto.confirmedMinimumCapacity;
      event.financialObservations = createEventDto.financialObservations;
      event.approvals = approvals;
      event.createdBy = user.userId;

      const created = await this.eventRepository.create(event);
      await this.notifier.created(created);

      return created;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  private validateBusinessRules(data: {
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string;
    minimumCapacity: number;
    maximumCapacity: number;
  }): void {
    if (data.endTime < data.startTime) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message: 'La hora de finalización no puede ser anterior a la de inicio',
      });
    }

    if (data.endDate < data.startDate) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message:
          'La fecha de finalización no puede ser anterior a la de inicio',
      });
    }

    if (data.maximumCapacity < data.minimumCapacity) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message: 'El cupo máximo no puede ser menor al cupo mínimo',
      });
    }
  }

  /**
   * Paso de Elaboración: la persona vinculada al usuario que crea el evento, con el
   * rol Elaboración, fecha de hoy y su nombre como firma. Nace firmado.
   */
  private async buildAuthorApproval(user: AuthUser): Promise<EventApproval> {
    const person = await this.personRepository.findByUserId(user.userId);

    if (!person) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message:
          'Tu usuario no tiene una persona asociada; no se puede registrar al responsable de elaboración',
      });
    }

    const roles = await this.roleRepository.findAll();
    const role = roles.find((item) => isFirstStep(item.name));

    if (!role) {
      throw new ErrorManager({
        type: 'NOT_FOUND',
        message: 'No existe el rol Elaboración',
      });
    }

    const approval = new EventApproval();

    approval.person = person;
    approval.role = role;
    approval.date = new Date().toISOString().slice(0, 10);
    approval.signature = await this.signatureService.getOrCreate(user.userId);
    approval.status = ApprovalStatus.APROBADO;
    approval.signedAt = new Date();

    return approval;
  }

  /** El flujo exige exactamente un responsable por paso: Elaboración, Revisión, Verificación y Validación. */
  private assertFlowComplete(approvals: EventApproval[]): void {
    const positions = approvals
      .map((approval) => flowPosition(approval.role?.name))
      .sort();

    if (positions.join(',') !== '0,1,2,3') {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message:
          'Debes asignar un responsable de Revisión, uno de Verificación y uno de Validación',
      });
    }
  }

  private async buildApprovals(
    approvalDtos: CreateEventDto['approvals'],
    previous: EventApproval[] = [],
  ): Promise<EventApproval[]> {
    const approvals: EventApproval[] = [];

    for (const approvalDto of approvalDtos) {
      const person = await this.personRepository.findById(approvalDto.personId);

      if (!person) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró la persona con ID "${approvalDto.personId}"`,
        });
      }

      const role = await this.roleRepository.findById(approvalDto.roleId);

      if (!role) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró el rol con ID "${approvalDto.roleId}"`,
        });
      }

      // El paso de elaboración lo agrega el servidor con el usuario autenticado.
      if (isFirstStep(role.name)) {
        continue;
      }

      const approval = new EventApproval();

      approval.person = person;
      approval.role = role;
      approval.date = approvalDto.date;
      approval.signature = null;

      // Si el paso ya existía con la misma persona, conserva su estado y firma.
      const carried = previous.find(
        (item) => item.role?.id === role.id && item.person?.id === person.id,
      );

      if (carried) {
        approval.status = carried.status;
        approval.signature = carried.signature;
        approval.signedAt = carried.signedAt;
      } else {
        approval.status = ApprovalStatus.PENDIENTE;
        approval.signedAt = null;
      }

      approvals.push(approval);
    }

    return approvals;
  }

  /**
   * Paso del workflow que espera firma. Solo puede actuar sobre él la persona
   * asignada a ese paso, y solo mientras el evento no esté devuelto.
   */
  private async resolveCurrentStep(
    event: Event,
    user: AuthUser,
  ): Promise<EventApproval> {
    if (event.workflowStatus === WorkflowStatus.DEVUELTO) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message:
          'El evento fue devuelto al autor; debe corregirlo y reenviarlo antes de continuar',
      });
    }

    const steps = [...event.approvals].sort(
      (a, b) => flowPosition(a.role?.name) - flowPosition(b.role?.name),
    );
    const current = steps.find(
      (step) => step.status !== ApprovalStatus.APROBADO,
    );

    if (!current) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message: 'El evento ya completó el flujo de aprobación',
      });
    }

    const isResponsible = await this.eventRepository.isApprovalOfUser(
      current.id,
      user.userId,
    );

    if (!isResponsible) {
      throw new ErrorManager({
        type: 'FORBIDDEN',
        message: `El paso actual (${current.role?.name}) no está asignado a tu usuario`,
      });
    }

    return current;
  }

  /** Firma el paso actual con la firma ya registrada en el evento. */
  async approve(idEvent: number, user: AuthUser): Promise<Event> {
    try {
      const event = await this.findById(idEvent, user);
      this.assertNotCancelled(event, 'firmarlo');
      const current = await this.resolveCurrentStep(event, user);

      current.status = ApprovalStatus.APROBADO;
      current.signature = await this.signatureService.getOrCreate(user.userId);
      current.signedAt = new Date();
      await this.eventRepository.saveApproval(current);

      const updated = await this.findById(idEvent, user);
      await this.notifier.signed(updated, user.userId);

      // Evento aprobado por completo: se generan las solicitudes de difusión que pidió en logística.
      if (
        updated.approvals.every(
          (step) => step.status === ApprovalStatus.APROBADO,
        )
      ) {
        await this.diffusionService.createFromEvent(
          updated,
          await this.notifier.authorIds(updated),
        );
      }

      return updated;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  /**
   * Devuelve el evento al autor con una observación. La cadena queda detenida y
   * el paso que devolvió sigue pendiente, así el flujo se retoma en él al reenviar.
   */
  async returnToAuthor(
    idEvent: number,
    dto: ReturnEventDto,
    user: AuthUser,
  ): Promise<Event> {
    try {
      const event = await this.findById(idEvent, user);
      this.assertNotCancelled(event, 'devolverlo');
      const current = await this.resolveCurrentStep(event, user);

      const observation = new EventObservation();
      observation.event = event;
      observation.stepRole = current.role.name;
      observation.author = current.person;
      observation.observation = dto.observation.trim();
      await this.eventRepository.saveObservation(observation);
      await this.eventRepository.setWorkflowStatus(
        idEvent,
        WorkflowStatus.DEVUELTO,
      );

      const updated = await this.findById(idEvent, user);
      await this.notifier.returned(
        updated,
        current.role.name,
        dto.observation.trim(),
        user.userId,
      );

      return updated;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  /** El autor reenvía el evento corregido; el flujo sigue en el paso que lo devolvió. */
  async resubmit(idEvent: number, user: AuthUser): Promise<Event> {
    try {
      const event = await this.findById(idEvent, user);
      this.assertNotCancelled(event, 'reenviarlo');

      if (event.workflowStatus !== WorkflowStatus.DEVUELTO) {
        throw new ErrorManager({
          type: 'BAD_REQUEST',
          message: 'El evento no está devuelto',
        });
      }

      const authorStep = event.approvals.find((step) =>
        isFirstStep(step.role?.name),
      );
      const isAuthor =
        event.createdBy === user.userId ||
        (!!authorStep &&
          (await this.eventRepository.isApprovalOfUser(
            authorStep.id,
            user.userId,
          )));

      if (!isAuthor) {
        throw new ErrorManager({
          type: 'FORBIDDEN',
          message: 'Solo el autor del evento puede reenviarlo',
        });
      }

      await this.eventRepository.resolveObservations(idEvent);
      await this.eventRepository.setWorkflowStatus(
        idEvent,
        WorkflowStatus.EN_FLUJO,
      );

      const updated = await this.findById(idEvent, user);
      await this.notifier.resubmitted(updated);

      return updated;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async update(
    idEvent: number,
    updateEventDto: UpdateEventDto,
    user: AuthUser,
  ): Promise<Event> {
    try {
      const event = await this.findById(idEvent, user);
      this.assertNotCancelled(event, 'editarlo');

      const approved = isFullyApproved(event.approvals);

      // Con el flujo completo el evento queda cerrado, salvo para el administrador
      // y el responsable de Verificación, que pueden corregir sus datos.
      if (approved && !event.canManage) {
        throw new ErrorManager({
          type: 'CONFLICT',
          message:
            'El evento ya completó el flujo de aprobación y no se puede editar',
        });
      }

      const {
        facultyId,
        approvals: requestedApprovals,
        ...fields
      } = updateEventDto;
      // En un evento aprobado no se tocan responsables ni firmas: el flujo queda igual.
      const approvals = approved ? undefined : requestedApprovals;

      if (fields.maximumCapacity !== undefined) {
        const registered =
          await this.eventRepository.countRegistrations(idEvent);

        if (fields.maximumCapacity < registered) {
          throw new ErrorManager({
            type: 'BAD_REQUEST',
            message: `El cupo máximo no puede ser menor a las ${registered} personas ya inscritas`,
          });
        }
      }

      const normalizeTime = (value: string) => value.slice(0, 5);

      this.validateBusinessRules({
        startTime: normalizeTime(fields.startTime ?? event.startTime),
        endTime: normalizeTime(fields.endTime ?? event.endTime),
        startDate: fields.startDate ?? event.startDate,
        endDate: fields.endDate ?? event.endDate,
        minimumCapacity: fields.minimumCapacity ?? event.minimumCapacity,
        maximumCapacity: fields.maximumCapacity ?? event.maximumCapacity,
      });

      if (fields.name !== undefined) {
        const existingEvent = await this.eventRepository.findByName(
          fields.name,
        );

        if (existingEvent && existingEvent.id !== idEvent) {
          throw new ErrorManager({
            type: 'CONFLICT',
            message: `Ya existe un evento con el nombre "${fields.name}"`,
          });
        }
      }

      if (facultyId !== undefined) {
        const faculty = await this.facultyRepository.findById(facultyId);

        if (!faculty) {
          throw new ErrorManager({
            type: 'NOT_FOUND',
            message: 'No se encontró la facultad',
          });
        }

        event.faculty = faculty;
      }

      if (approvals !== undefined) {
        // El autor original se conserva, aunque quien edita sea otra persona.
        const currentAuthor = event.approvals.find((step) =>
          isFirstStep(step.role?.name),
        );
        const author = currentAuthor
          ? Object.assign(new EventApproval(), {
              person: currentAuthor.person,
              role: currentAuthor.role,
              date: currentAuthor.date,
              signature: currentAuthor.signature,
              status: currentAuthor.status,
              signedAt: currentAuthor.signedAt,
            })
          : await this.buildAuthorApproval(user);

        const rebuilt = [
          author,
          ...(await this.buildApprovals(approvals, event.approvals)),
        ];
        this.assertFlowComplete(rebuilt);
        event.approvals = rebuilt;
      }

      Object.assign(event, fields);

      if (fields.eventType !== undefined && fields.eventType !== '¿Otro?') {
        event.otherEventType = null;
      }

      const updated = await this.eventRepository.update(
        event,
        approvals !== undefined,
      );

      // Un evento aprobado ya tiene solicitudes de difusión: se les pasan los datos nuevos.
      if (approved) {
        await this.diffusionService.refreshEventSnapshot(updated);
      }

      return updated;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async remove(idEvent: number, user: AuthUser): Promise<void> {
    try {
      await this.findVisible(idEvent, user);

      await this.eventRepository.delete(idEvent);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }
}
