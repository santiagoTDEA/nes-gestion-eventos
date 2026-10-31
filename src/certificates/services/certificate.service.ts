import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  eventEndsAt,
  hasFinished,
  isFullyApproved,
} from '../../events/constants/approval-flow';
import { Event } from '../../events/entities/event.entity';
import { EventRegistration } from '../../registrations/entities/event-registration.entity';

/** Evento que ya se puede certificar: aprobado y finalizado. */
export interface CertificateEventView {
  id: number;
  name: string;
  eventType: string;
  faculty: string;
  modality: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  endsAt: Date;
  registeredCount: number;
}

/** Datos de la persona que van en el certificado. */
export interface CertificateParticipant {
  id: number;
  documentType: string;
  documentNumber: string;
  fullName: string;
}

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(EventRegistration)
    private readonly registrations: Repository<EventRegistration>,
  ) {}

  /** Eventos con la aprobación completa que ya terminaron, con cuántos inscritos tienen. */
  async findCertifiableEvents(): Promise<CertificateEventView[]> {
    const events = await this.events.find({
      relations: { approvals: true, faculty: true },
      order: { endDate: 'DESC' },
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
      .filter((event) => isFullyApproved(event.approvals) && hasFinished(event))
      .map((event) => this.toEventView(event, countByEvent.get(event.id) ?? 0));
  }

  /** Datos del evento y de sus inscritos para llenar la plantilla del certificado. */
  async findForCertificates(eventId: number): Promise<{
    event: CertificateEventView;
    participants: CertificateParticipant[];
  }> {
    const event = await this.events.findOne({
      where: { id: eventId },
      relations: { approvals: true, faculty: true },
    });

    if (!event || !isFullyApproved(event.approvals)) {
      throw new NotFoundException(
        'No se encontró el evento o todavía no tiene la aprobación completa.',
      );
    }

    if (!hasFinished(event)) {
      throw new ConflictException(
        `El evento «${event.name}» todavía no ha terminado; los certificados se generan cuando finalice.`,
      );
    }

    const registrations = await this.registrations.find({
      where: { event: { id: eventId } },
      order: { lastNames: 'ASC', firstNames: 'ASC' },
    });

    return {
      event: this.toEventView(event, registrations.length),
      participants: registrations.map((registration) => ({
        id: registration.id,
        documentType: registration.documentType,
        documentNumber: registration.documentNumber,
        fullName: `${registration.firstNames} ${registration.lastNames}`,
      })),
    };
  }

  private toEventView(
    event: Event,
    registeredCount: number,
  ): CertificateEventView {
    return {
      id: event.id,
      name: event.name,
      // "¿Otro?" se reemplaza por el tipo que escribió el organizador.
      eventType: event.otherEventType || event.eventType,
      faculty: event.faculty?.name ?? '',
      modality: event.modality,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      duration: event.duration,
      endsAt: eventEndsAt(event),
      registeredCount,
    };
  }
}
