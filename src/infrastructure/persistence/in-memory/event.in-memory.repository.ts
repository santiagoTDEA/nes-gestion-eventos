import { Event } from '../../../domain/entities/event.entity';
import { IEventRepository } from '../../../domain/repositories/event.repository.interface';

/**
 * Implementación InMemory del repositorio de Eventos.
 * Permite almacenar y consultar eventos en memoria para desarrollo y pruebas.
 */
export class EventInMemoryRepository implements IEventRepository {
  private events: Event[] = [];

  async create(event: Event): Promise<Event> {
    const createdEvent = new Event({
      ...event,
      id: event.id ?? Math.random().toString(36).substring(2, 9),
    });
    this.events.push(createdEvent);
    return createdEvent;
  }

  async findAll(): Promise<Event[]> {
    return this.events;
  }

  async findById(id: string): Promise<Event | null> {
    const event = this.events.find((e) => e.id === id);
    return event ?? null;
  }

  async update(id: string, updatedFields: Partial<Event>): Promise<Event> {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Evento con ID ${id} no encontrado.`);
    }
    this.events[index] = new Event({
      ...this.events[index],
      ...updatedFields,
      updatedAt: new Date(),
    });
    return this.events[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    this.events.splice(index, 1);
    return true;
  }
}