import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  isCancelled,
  isFullyApproved,
} from '../../events/constants/approval-flow';
import { EventApproval } from '../../events/entities/event-approval.entity';
import { Event } from '../../events/entities/event.entity';
import {
  RegistrationData,
  RegistrationSource,
  normalizeRegistration,
  validateRegistration,
} from '../constants/registration.constants';
import { RegisterParticipantDto } from '../dto/registration.dto';
import { EventRegistration } from '../entities/event-registration.entity';
import {
  ExcelRow,
  FailedRow,
  RegistrationExcelService,
} from './registration-excel.service';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Evento aprobado con su ocupación, para escoger a cuál inscribir. */
export interface RegistrationEventView {
  id: number;
  name: string;
  eventType: string;
  faculty: string;
  modality: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  minimumCapacity: number;
  maximumCapacity: number;
  registeredCount: number;
  availableSlots: number;
}

export interface RegistrationView extends RegistrationData {
  id: number;
  position: number;
  source: RegistrationSource;
  createdAt: Date;
}

/** Persona que ocupó el último cupo del evento. */
export interface LastSlotView extends RegistrationData {
  position: number;
  rowNumber: number | null;
}

export interface RegisterResult {
  registration: RegistrationView;
  event: RegistrationEventView;
  capacityReached: boolean;
  lastSlot: LastSlotView | null;
}

export interface ImportResult {
  totalRows: number;
  registered: number;
  failed: number;
  failedByCapacity: number;
  event: RegistrationEventView;
  capacityReached: boolean;
  lastSlot: LastSlotView | null;
  failedFile: { fileName: string; contentBase64: string } | null;
}

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(EventRegistration)
    private readonly registrations: Repository<EventRegistration>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    private readonly dataSource: DataSource,
    private readonly excel: RegistrationExcelService,
  ) {}

  /** Eventos con la aprobación completa y cuántas personas tienen inscritas. */
  async findApprovedEvents(): Promise<RegistrationEventView[]> {
    const events = await this.events.find({
      relations: { approvals: true, faculty: true },
      order: { startDate: 'DESC' },
    });

    const counts = await this.registrations
      .createQueryBuilder('registration')
      .innerJoin('registration.event', 'event')
      .select('event.id', 'eventId')
      .addSelect('COUNT(registration.id)', 'total')
      .groupBy('event.id')
      .getRawMany<{ eventId: number; total: string }>();

    const countByEvent = new Map(
      counts.map((row) => [Number(row.eventId), Number(row.total)]),
    );

    return events
      .filter(
        (event) => isFullyApproved(event.approvals) && !isCancelled(event),
      )
      .map((event) => this.toEventView(event, countByEvent.get(event.id) ?? 0));
  }

  /** Evento aprobado con la lista de inscritos, en el orden en que se inscribieron. */
  async findByEvent(eventId: number): Promise<{
    event: RegistrationEventView;
    registrations: RegistrationView[];
  }> {
    const event = await this.events.findOne({
      where: { id: eventId },
      relations: { approvals: true, faculty: true },
    });

    if (!event || !isFullyApproved(event.approvals) || isCancelled(event)) {
      throw new NotFoundException(
        'No se encontró el evento o todavía no tiene la aprobación completa.',
      );
    }

    const registrations = await this.registrations.find({
      where: { event: { id: eventId } },
      order: { id: 'ASC' },
    });

    return {
      event: this.toEventView(event, registrations.length),
      registrations: registrations.map((registration, index) =>
        this.toView(registration, index + 1),
      ),
    };
  }

  /** Inscribe a una persona desde el formulario. */
  async register(
    eventId: number,
    dto: RegisterParticipantDto,
    user: AuthUser,
  ): Promise<RegisterResult> {
    const data = normalizeRegistration(dto);
    const errors = validateRegistration(data);

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }

    return this.dataSource.transaction(async (manager) => {
      const event = await this.lockApprovedEvent(manager, eventId);
      const count = await manager.count(EventRegistration, {
        where: { event: { id: eventId } },
      });

      if (count >= event.maximumCapacity) {
        throw new ConflictException(
          `El evento «${event.name}» ya llenó su cupo máximo de ${event.maximumCapacity} personas.`,
        );
      }

      const duplicate = await manager.exists(EventRegistration, {
        where: { event: { id: eventId }, documentNumber: data.documentNumber },
      });

      if (duplicate) {
        throw new ConflictException(
          `La persona con documento ${data.documentNumber} ya está inscrita en este evento.`,
        );
      }

      const saved = await manager.save(
        manager.create(EventRegistration, {
          ...data,
          event: { id: eventId },
          source: RegistrationSource.FORMULARIO,
          registeredBy: user.userId,
        }),
      );

      const position = count + 1;
      const capacityReached = position >= event.maximumCapacity;

      return {
        registration: this.toView(saved, position),
        event: this.toEventView(event, position),
        capacityReached,
        lastSlot: capacityReached
          ? { ...data, position, rowNumber: null }
          : null,
      };
    });
  }

  /**
   * Inscribe a las personas de un Excel. Las filas con datos faltantes o inválidos,
   * repetidas o que ya no caben en el cupo se devuelven en un Excel para corregirlas.
   */
  async importExcel(
    eventId: number,
    file: UploadedFileLike | undefined,
    user: AuthUser,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('Adjunta el archivo de Excel.');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser un Excel .xlsx.');
    }

    const rows = await this.excel.readRows(file.buffer);

    const result = await this.dataSource.transaction(async (manager) => {
      const event = await this.lockApprovedEvent(manager, eventId);

      const existing = await manager.find(EventRegistration, {
        where: { event: { id: eventId } },
        select: { id: true, documentNumber: true },
      });

      const registeredDocuments = new Set(
        existing.map((registration) => registration.documentNumber),
      );
      const rowByDocument = new Map<string, number>();
      const toSave: { row: ExcelRow; data: RegistrationData }[] = [];
      const failed: FailedRow[] = [];
      let count = existing.length;
      let failedByCapacity = 0;
      let lastSlot: LastSlotView | null = null;

      for (const row of rows) {
        const data = normalizeRegistration(row.values);
        const errors = validateRegistration(data);

        if (errors.length === 0) {
          const firstRow = rowByDocument.get(data.documentNumber);

          if (registeredDocuments.has(data.documentNumber)) {
            errors.push('La persona ya está inscrita en este evento');
          } else if (firstRow) {
            errors.push(`Documento repetido en el archivo (fila ${firstRow})`);
          }
        }

        if (errors.length > 0) {
          failed.push({ ...row, errors });
          continue;
        }

        if (count >= event.maximumCapacity) {
          failedByCapacity++;
          failed.push({
            ...row,
            errors: [
              `Sin cupo: el evento alcanzó su cupo máximo de ${event.maximumCapacity} personas`,
            ],
          });
          continue;
        }

        rowByDocument.set(data.documentNumber, row.rowNumber);
        toSave.push({ row, data });
        count++;

        if (count === event.maximumCapacity) {
          lastSlot = { ...data, position: count, rowNumber: row.rowNumber };
        }
      }

      await manager.save(
        toSave.map(({ data }) =>
          manager.create(EventRegistration, {
            ...data,
            event: { id: eventId },
            source: RegistrationSource.EXCEL,
            registeredBy: user.userId,
          }),
        ),
        { chunk: 200 },
      );

      return { event, count, toSave, failed, failedByCapacity, lastSlot };
    });

    const failedFile =
      result.failed.length > 0
        ? {
            fileName: `asistencia-con-error-evento-${eventId}.xlsx`,
            contentBase64: (
              await this.excel.buildFailedFile(result.failed)
            ).toString('base64'),
          }
        : null;

    return {
      totalRows: rows.length,
      registered: result.toSave.length,
      failed: result.failed.length,
      failedByCapacity: result.failedByCapacity,
      event: this.toEventView(result.event, result.count),
      capacityReached: result.count >= result.event.maximumCapacity,
      lastSlot: result.lastSlot,
      failedFile,
    };
  }

  async remove(id: number): Promise<void> {
    const registration = await this.registrations.findOne({
      where: { id },
      relations: { event: true },
    });

    if (!registration) {
      throw new NotFoundException('No se encontró la inscripción.');
    }

    if (isCancelled(registration.event)) {
      throw new ConflictException(
        'El evento está cancelado; no se pueden modificar sus inscritos.',
      );
    }

    await this.registrations.delete(id);
  }

  buildTemplate(): Promise<Buffer> {
    return this.excel.buildTemplate();
  }

  /**
   * Bloquea la fila del evento hasta que termine la transacción, para que dos
   * inscripciones al mismo tiempo no pasen el cupo, y verifica que esté aprobado.
   */
  private async lockApprovedEvent(
    manager: EntityManager,
    eventId: number,
  ): Promise<Event> {
    const event = await manager.findOne(Event, {
      where: { id: eventId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!event) {
      throw new NotFoundException('No se encontró el evento.');
    }

    const approvals = await manager.find(EventApproval, {
      where: { event: { id: eventId } },
      select: { id: true, status: true },
    });

    if (!isFullyApproved(approvals)) {
      throw new ConflictException(
        'Solo se pueden inscribir personas a eventos con la aprobación completa.',
      );
    }

    if (isCancelled(event)) {
      throw new ConflictException(
        'El evento está cancelado; no se pueden inscribir personas.',
      );
    }

    const withFaculty = await manager.findOne(Event, {
      where: { id: eventId },
      relations: { faculty: true },
    });

    return withFaculty ?? event;
  }

  private toEventView(
    event: Event,
    registeredCount: number,
  ): RegistrationEventView {
    return {
      id: event.id,
      name: event.name,
      eventType: event.eventType,
      faculty: event.faculty?.name ?? '',
      modality: event.modality,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      minimumCapacity: event.minimumCapacity,
      maximumCapacity: event.maximumCapacity,
      registeredCount,
      availableSlots: Math.max(0, event.maximumCapacity - registeredCount),
    };
  }

  private toView(
    registration: EventRegistration,
    position: number,
  ): RegistrationView {
    return {
      id: registration.id,
      position,
      documentType: registration.documentType,
      documentNumber: registration.documentNumber,
      firstNames: registration.firstNames,
      lastNames: registration.lastNames,
      email: registration.email,
      phone: registration.phone,
      source: registration.source,
      createdAt: registration.createdAt,
    };
  }
}
