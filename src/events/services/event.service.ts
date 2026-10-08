import { Injectable } from '@nestjs/common';
import { EventRepository } from '../repository/event.repository';
import { FacultyRepository } from '../../faculty/repository/faculty.repository';
import { PersonRepository } from '../../person/repository/person.repository';
import { RoleRepository } from '../../roles/repositories/role.repository';
import { Event } from '../entities/event.entity';
import { EventApproval } from '../entities/event-approval.entity';
import { CreateEventDto, UpdateEventDto } from '../dto/event.dto';
import { ErrorManager } from '../../utils/error.manager';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly facultyRepository: FacultyRepository,
    private readonly personRepository: PersonRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async findAll(): Promise<Event[]> {
    return this.eventRepository.findAll();
  }

  async findById(idEvent: number): Promise<Event> {
    try {
      const event = await this.eventRepository.findById(idEvent);

      if (!event) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró el evento con ese ID "${idEvent}"`,
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

  async create(createEventDto: CreateEventDto): Promise<Event> {
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

      const approvals = await this.buildApprovals(createEventDto.approvals);

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

      return this.eventRepository.create(event);
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

  private async buildApprovals(
    approvalDtos: CreateEventDto['approvals'],
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

      const approval = new EventApproval();

      approval.person = person;
      approval.role = role;
      approval.date = approvalDto.date;
      approval.signature = approvalDto.signature;

      approvals.push(approval);
    }

    return approvals;
  }

  async update(
    idEvent: number,
    updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    try {
      const event = await this.findById(idEvent);
      const { facultyId, approvals, ...fields } = updateEventDto;

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
        event.approvals = await this.buildApprovals(approvals);
      }

      Object.assign(event, fields);

      if (fields.eventType !== undefined && fields.eventType !== '¿Otro?') {
        event.otherEventType = null;
      }

      return this.eventRepository.update(event, approvals !== undefined);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async remove(idEvent: number): Promise<void> {
    try {
      await this.findById(idEvent);

      await this.eventRepository.delete(idEvent);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }
}
