import { Event } from '../../../domain/entities/event.entity';
import { IEventRepository } from '../../../domain/repositories/event.repository.interface';
import { EventType } from '../../../domain/enums/event-type.enum';
import { EventModality } from '../../../domain/enums/event-modality.enum';

/**
 * DTO para la creación de un evento. 
 * Debe ser una clase para que NestJS procese la reflexión de tipos en los controladores.
 */
export class CreateEventDto {
  title!: string;
  description!: string;
  type!: EventType;
  modality!: EventModality;
  capacity!: number;
  startDate!: Date;
  endDate!: Date;
  location?: string;
}

export class CreateEventUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  async execute(dto: CreateEventDto): Promise<Event> {
    if (dto.capacity <= 0) {
      throw new Error('La capacidad del evento debe ser mayor a 0.');
    }

    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new Error('La fecha de finalización debe ser posterior a la fecha de inicio.');
    }

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

    return await this.eventRepository.create(newEvent);
  }
}