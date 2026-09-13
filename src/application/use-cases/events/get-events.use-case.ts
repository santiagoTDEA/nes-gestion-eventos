import { Event } from '../../../domain/entities/event.entity';
import { IEventRepository } from '../../../domain/repositories/event.repository.interface';

/**
 * Caso de Uso: Obtener el listado de todos los eventos registrados.
 */
export class GetEventsUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  /**
   * Ejecuta la consulta para obtener todos los eventos.
   */
  async execute(): Promise<Event[]> {
    return await this.eventRepository.findAll();
  }
}