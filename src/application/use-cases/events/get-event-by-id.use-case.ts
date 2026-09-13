import { Event } from '../../../domain/entities/event.entity';
import { IEventRepository } from '../../../domain/repositories/event.repository.interface';

/**
 * Caso de Uso: Obtener la información detallada de un evento por su ID.
 */
export class GetEventByIdUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  /**
   * Ejecuta la búsqueda del evento por su identificador único.
   * @param id Identificador del evento.
   */
  async execute(id: string): Promise<Event | null> {
    if (!id) {
      throw new Error('El ID del evento es requerido.');
    }
    return await this.eventRepository.findById(id);
  }
}