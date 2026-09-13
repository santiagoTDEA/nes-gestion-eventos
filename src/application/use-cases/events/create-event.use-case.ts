import { Event } from '../../../domain/entities/event.entity';
import { IEventRepository } from '../../../domain/repositories/event.repository.interface';
import { EventType } from '../../../domain/enums/event-type.enum';
import { EventModality } from '../../../domain/enums/event-modality.enum';

/**
 * DTO (Data Transfer Object) para la creación de un evento.
 * Define los datos requeridos obligatoriamente al solicitar la creación.
 */
export interface CreateEventDto {
  title: string;
  description: string;
  type: EventType;
  modality: EventModality;
  capacity: number;
  startDate: Date;
  endDate: Date;
  location?: string;
}

/**
 * Caso de Uso: Registrar un nuevo evento en el sistema.
 * Contiene la lógica de negocio y las validaciones previas a la persistencia.
 */
export class CreateEventUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  /**
   * Ejecuta la lógica del caso de uso.
   * @param dto Datos del evento recibidos desde la capa externa (controlador/API).
   */
  async execute(dto: CreateEventDto): Promise<Event> {
    // 1. Regla de Negocio: La capacidad del evento debe ser mayor a cero.
    if (dto.capacity <= 0) {
      throw new Error('La capacidad del evento debe ser mayor a 0.');
    }

    // 2. Regla de Negocio: La fecha de finalización no puede ser anterior a la fecha de inicio.
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new Error('La fecha de finalización debe ser posterior a la fecha de inicio.');
    }

    // 3. Creación de la instancia de la entidad de dominio.
    const newEvent = new Event({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      modality: dto.modality,
      capacity: dto.capacity,
      startDate: dto.startDate,
      endDate: dto.endDate,
      location: dto.location,
    });

    // 4. Delegación de la persistencia a través del repositorio de dominio.
    return await this.eventRepository.create(newEvent);
  }
}