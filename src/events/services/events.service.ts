import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Faculty } from '../../faculty/entities/faculty.entity';
import { PersonRepository } from '../../person/repository/person.repository';
import { RoleRepository } from '../../roles/repositories/role.repository';
import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateEventDto, EventApprovalDto, UpdateEventDto } from '../dto/event.dto';
import { Event, EventWorkflowStatus } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';
import { EventObservation } from '../entities/event-observation.entity';

const APPROVAL_STEPS = [
  { order: 1, key: 'revision', title: 'Revisión' },
  { order: 2, key: 'verificacion', title: 'Verificación' },
  { order: 3, key: 'validacion', title: 'Validación' },
] as const;

const EVENT_FIELDS = [
  'eventType',
  'otherEventType',
  'name',
  'academicProgram',
  'teacherProfile',
  'duration',
  'startTime',
  'endTime',
  'selectedDays',
  'modality',
  'startDate',
  'endDate',
  'minimumCapacity',
  'maximumCapacity',
  'participantProfile',
  'presentation',
  'scope',
  'generalObjective',
  'objectives',
  'competencies',
  'modules',
  'logistics',
  'costPerParticipant',
  'confirmedMinimumCapacity',
  'financialObservations',
] as const;

export interface EventApprovalResponse {
  id: number;
  date: string;
  signature: string | null;
  status: 'pendiente' | 'aprobado';
  signedAt: string | null;
  person: { id: number; name: string; email: string } | null;
  role: { id: string; name: string };
}

export interface EventResponse {
  id: number;
  eventType: string;
  otherEventType?: string | null;
  name: string;
  faculty: { id: number; name: string };
  academicProgram: string;
  teacherProfile: string;
  duration: number;
  startTime: string;
  endTime: string;
  selectedDays: string[];
  modality: string;
  startDate: string;
  endDate: string;
  minimumCapacity: number;
  maximumCapacity: number;
  participantProfile: string;
  presentation: string;
  scope: string;
  generalObjective: string;
  objectives: string[];
  competencies: string;
  modules: string[];
  logistics: Record<string, string>;
  costPerParticipant: number;
  confirmedMinimumCapacity: number;
  financialObservations: string;
  approvals: EventApprovalResponse[];
  createdBy: string;
  workflowStatus: EventWorkflowStatus;
  observations: Array<{
    id: number;
    stepRole: string;
    observation: string;
    createdAt: string;
    resolvedAt: string | null;
    author: { id: number; name: string } | null;
  }>;
  createdAt: string;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly personRepository: PersonRepository,
    private readonly roleRepository: RoleRepository,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async findAll(user: AuthUser): Promise<EventResponse[]> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.faculty', 'faculty')
      .leftJoinAndSelect('event.createdBy', 'creator')
      .leftJoinAndSelect('event.approvals', 'approval')
      .leftJoinAndSelect('approval.person', 'approvalPerson')
      .leftJoinAndSelect('approvalPerson.user', 'approvalUser')
      .leftJoinAndSelect('approval.role', 'approvalRole')
      .leftJoinAndSelect('event.observations', 'observation')
      .leftJoinAndSelect('observation.author', 'observationAuthor')
      .orderBy('event.createdAt', 'DESC')
      .addOrderBy('approval.stepOrder', 'ASC')
      .addOrderBy('observation.createdAt', 'DESC');

    if (!this.hasGlobalEventAccess(user)) {
      query
        .where('creator.id = :userId', { userId: user.userId })
        .orWhere('approvalUser.id = :userId', { userId: user.userId });
    }

    const events = await query.distinct(true).getMany();
    return events.map((event) => this.toResponse(event));
  }

  async findById(id: number, user: AuthUser): Promise<EventResponse> {
    const event = await this.loadEvent(this.dataSource.manager, id);
    this.assertCanView(event, user);
    return this.toResponse(event);
  }

  async create(dto: CreateEventDto, user: AuthUser): Promise<EventResponse> {
    this.validateEventDates(dto);
    return this.dataSource.transaction(async (manager) => {
      const faculty = await manager.getRepository(Faculty).findOne({
        where: { id: dto.facultyId },
        relations: { status: true },
      });
      if (!faculty) {
        throw new NotFoundException('No se encontró la facultad.');
      }
      if (faculty.status.statusName.trim().toLowerCase() === 'inactivo') {
        throw new BadRequestException('No se puede asignar un evento a una facultad inactiva.');
      }

      const author = await this.personRepository.findByUserId(user.userId);
      const event = manager.getRepository(Event).create({
        ...this.pickEventFields(dto),
        faculty,
        createdBy: { id: user.userId } as Event['createdBy'],
        workflowStatus: 'en_flujo',
      });
      const savedEvent = await manager.getRepository(Event).save(event);

      const approvals: EventApproval[] = [];
      approvals.push(
        manager.getRepository(EventApproval).create({
          event: savedEvent,
          stepOrder: 0,
          stepRole: 'Elaboración',
          person: author,
          role: author?.role ?? null,
          date: new Date().toISOString().slice(0, 10),
          status: 'aprobado',
          signature: null,
          signedAt: new Date(),
        }),
      );
      approvals.push(...(await this.buildAssignedApprovals(manager, savedEvent, dto.approvals)));
      await manager.getRepository(EventApproval).save(approvals);
      return this.toResponse(await this.loadEvent(manager, savedEvent.id));
    });
  }

  async update(
    id: number,
    dto: UpdateEventDto,
    user: AuthUser,
  ): Promise<EventResponse> {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.loadEvent(manager, id);
      this.assertCanView(event, user);
      if (
        event.createdBy.id !== user.userId &&
        !this.hasGlobalEventAccess(user)
      ) {
        throw new ForbiddenException('Solo la persona que creó el evento puede editarlo.');
      }
      if (this.isComplete(event)) {
        throw new ConflictException('No se puede editar un evento que ya completó las aprobaciones.');
      }

      const { facultyId, approvals, ...fields } = dto;
      for (const field of EVENT_FIELDS) {
        if (fields[field] !== undefined) {
          Object.assign(event, { [field]: fields[field] });
        }
      }
      if (facultyId !== undefined) {
        const faculty = await manager.getRepository(Faculty).findOne({
          where: { id: facultyId },
          relations: { status: true },
        });
        if (!faculty) {
          throw new NotFoundException('No se encontró la facultad.');
        }
        if (faculty.status.statusName.trim().toLowerCase() === 'inactivo') {
          throw new BadRequestException('No se puede asignar un evento a una facultad inactiva.');
        }
        event.faculty = faculty;
      }
      this.validateEventDates(event);
      await manager.getRepository(Event).save(event);

      if (approvals !== undefined) {
        await this.updatePendingApprovals(manager, event, approvals);
      }
      return this.toResponse(await this.loadEvent(manager, event.id));
    });
  }

  async approve(id: number, user: AuthUser): Promise<EventResponse> {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.loadEvent(manager, id);
      this.assertCanView(event, user);
      if (event.workflowStatus === 'devuelto') {
        throw new ConflictException('El evento fue devuelto y debe ser corregido antes de aprobarse.');
      }
      const approval = this.currentApproval(event);
      this.assertAssignedApprover(approval, user);
      approval.status = 'aprobado';
      approval.signedAt = new Date();
      await manager.getRepository(EventApproval).save(approval);
      return this.toResponse(await this.loadEvent(manager, event.id));
    });
  }

  async returnToAuthor(
    id: number,
    observationText: string,
    user: AuthUser,
  ): Promise<EventResponse> {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.loadEvent(manager, id);
      this.assertCanView(event, user);
      if (event.workflowStatus === 'devuelto') {
        throw new ConflictException('El evento ya fue devuelto.');
      }
      const approval = this.currentApproval(event);
      this.assertAssignedApprover(approval, user);

      const observation = manager.getRepository(EventObservation).create({
        event,
        stepRole: approval.stepRole,
        observation: observationText.trim(),
        author: approval.person,
        resolvedAt: null,
      });
      await manager.getRepository(EventObservation).save(observation);
      event.workflowStatus = 'devuelto';
      await manager.getRepository(Event).save(event);
      return this.toResponse(await this.loadEvent(manager, event.id));
    });
  }

  async resubmit(id: number, user: AuthUser): Promise<EventResponse> {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.loadEvent(manager, id);
      this.assertCanView(event, user);
      if (event.workflowStatus !== 'devuelto') {
        throw new ConflictException('El evento no está devuelto.');
      }
      const authorApproval = event.approvals.find((approval) => approval.stepOrder === 0);
      if (
        event.createdBy.id !== user.userId &&
        authorApproval?.person?.user?.id !== user.userId
      ) {
        throw new ForbiddenException('Solo la persona autora puede reenviar el evento.');
      }

      event.workflowStatus = 'en_flujo';
      await manager.getRepository(Event).save(event);
      await manager.getRepository(EventObservation).update(
        { event: { id } as Event, resolvedAt: null },
        { resolvedAt: new Date() },
      );
      return this.toResponse(await this.loadEvent(manager, event.id));
    });
  }

  private async buildAssignedApprovals(
    manager: EntityManager,
    event: Event,
    input: EventApprovalDto[],
  ): Promise<EventApproval[]> {
    if (input.length !== APPROVAL_STEPS.length) {
      throw new BadRequestException('Se requieren tres responsables: revisión, verificación y validación.');
    }

    return Promise.all(
      APPROVAL_STEPS.map(async (step, index) => {
        const item = input[index];
        const person = await this.personRepository.findById(item.personId);
        if (!person) {
          throw new NotFoundException(`No se encontró la persona asignada a ${step.title}.`);
        }
        if (person.status.statusName.trim().toLowerCase() === 'inactivo') {
          throw new BadRequestException(`La persona asignada a ${step.title} está inactiva.`);
        }
        const role = await this.roleRepository.findById(item.roleId);
        if (!role) {
          throw new NotFoundException(`No se encontró el rol de ${step.title}.`);
        }
        if (person.role.id !== role.id) {
          throw new BadRequestException(`La persona asignada a ${step.title} no tiene el rol seleccionado.`);
        }
        return manager.getRepository(EventApproval).create({
          event,
          stepOrder: step.order,
          stepRole: step.title,
          person,
          role,
          date: item.date,
          status: 'pendiente',
          signature: null,
          signedAt: null,
        });
      }),
    );
  }

  private async updatePendingApprovals(
    manager: EntityManager,
    event: Event,
    input: EventApprovalDto[],
  ): Promise<void> {
    const updated = await this.buildAssignedApprovals(manager, event, input);
    const existing = event.approvals.filter((approval) => approval.stepOrder > 0);
    for (const next of updated) {
      const previous = existing.find((approval) => approval.stepOrder === next.stepOrder);
      if (previous?.status === 'aprobado') {
        continue;
      }
      if (previous) {
        Object.assign(previous, {
          person: next.person,
          role: next.role,
          date: next.date,
        });
        await manager.getRepository(EventApproval).save(previous);
      } else {
        await manager.getRepository(EventApproval).save(next);
      }
    }
  }

  private async loadEvent(manager: EntityManager, id: number): Promise<Event> {
    const event = await manager.getRepository(Event).findOne({
      where: { id },
      relations: {
        faculty: true,
        createdBy: true,
        approvals: {
          person: { user: true },
          role: true,
        },
        observations: {
          author: true,
        },
      },
      order: {
        approvals: { stepOrder: 'ASC' },
        observations: { createdAt: 'DESC' },
      },
    });
    if (!event) {
      throw new NotFoundException('No se encontró el evento.');
    }
    return event;
  }

  private assertCanView(event: Event, user: AuthUser): void {
    if (this.hasGlobalEventAccess(user)) {
      return;
    }
    const isCreator = event.createdBy?.id === user.userId;
    const isAssigned = event.approvals?.some(
      (approval) => approval.person?.user?.id === user.userId,
    );
    if (!isCreator && !isAssigned) {
      throw new NotFoundException('No se encontró el evento.');
    }
  }

  private assertAssignedApprover(approval: EventApproval, user: AuthUser): void {
    if (!approval.person || approval.person.user?.id !== user.userId) {
      throw new ForbiddenException('Este paso no está asignado a la persona autenticada.');
    }
  }

  private currentApproval(event: Event): EventApproval {
    const current = [...event.approvals]
      .filter((approval) => approval.status === 'pendiente')
      .sort((left, right) => left.stepOrder - right.stepOrder)[0];
    if (!current) {
      throw new ConflictException('El evento ya completó el flujo de aprobación.');
    }
    return current;
  }

  private isComplete(event: Event): boolean {
    return event.approvals.length > 0 &&
      event.approvals.every((approval) => approval.status === 'aprobado');
  }

  private hasGlobalEventAccess(user: AuthUser): boolean {
    const roleName = String(user.role?.name ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return (
      roleName === 'admin' ||
      roleName === 'administrador' ||
      (user.role?.permissionsFull === true && user.role?.modulesFull === true)
    );
  }

  private validateEventDates(dto: Partial<CreateEventDto>): void {
    if (
      dto.startDate &&
      dto.endDate &&
      dto.endDate < dto.startDate
    ) {
      throw new BadRequestException('La fecha de finalización no puede ser anterior a la fecha de inicio.');
    }
    if (
      dto.startTime &&
      dto.endTime &&
      dto.endTime < dto.startTime
    ) {
      throw new BadRequestException('La hora de finalización no puede ser anterior a la hora de inicio.');
    }
    if (
      dto.minimumCapacity !== undefined &&
      dto.maximumCapacity !== undefined &&
      dto.maximumCapacity < dto.minimumCapacity
    ) {
      throw new BadRequestException('La capacidad máxima no puede ser menor que la capacidad mínima.');
    }
  }

  private pickEventFields(dto: CreateEventDto): Partial<Event> {
    const fields: Partial<Event> = {};
    for (const field of EVENT_FIELDS) {
      Object.assign(fields, { [field]: dto[field] });
    }
    return fields;
  }

  private toResponse(event: Event): EventResponse {
    const approvals = [...(event.approvals ?? [])]
      .sort((left, right) => left.stepOrder - right.stepOrder)
      .map((approval) => ({
        id: approval.id,
        date: approval.date,
        signature: approval.signature,
        status: approval.status,
        signedAt: approval.signedAt?.toISOString() ?? null,
        person: approval.person
          ? {
              id: approval.person.id,
              name: approval.person.email,
              email: approval.person.email,
            }
          : null,
        role: {
          id: approval.role?.id ?? '',
          name: approval.stepRole,
        },
      }));

    return {
      id: event.id,
      eventType: event.eventType,
      otherEventType: event.otherEventType,
      name: event.name,
      faculty: { id: event.faculty.id, name: event.faculty.name },
      academicProgram: event.academicProgram,
      teacherProfile: event.teacherProfile,
      duration: event.duration,
      startTime: event.startTime,
      endTime: event.endTime,
      selectedDays: event.selectedDays,
      modality: event.modality,
      startDate: event.startDate,
      endDate: event.endDate,
      minimumCapacity: event.minimumCapacity,
      maximumCapacity: event.maximumCapacity,
      participantProfile: event.participantProfile,
      presentation: event.presentation,
      scope: event.scope,
      generalObjective: event.generalObjective,
      objectives: event.objectives,
      competencies: event.competencies,
      modules: event.modules,
      logistics: event.logistics,
      costPerParticipant: Number(event.costPerParticipant),
      confirmedMinimumCapacity: event.confirmedMinimumCapacity,
      financialObservations: event.financialObservations,
      approvals,
      createdBy: event.createdBy.id,
      workflowStatus: event.workflowStatus,
      observations: [...(event.observations ?? [])]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((observation) => ({
          id: observation.id,
          stepRole: observation.stepRole,
          observation: observation.observation,
          createdAt: observation.createdAt.toISOString(),
          resolvedAt: observation.resolvedAt?.toISOString() ?? null,
          author: observation.author
            ? { id: observation.author.id, name: observation.author.email }
            : null,
        })),
      createdAt: event.createdAt.toISOString(),
    };
  }
}
