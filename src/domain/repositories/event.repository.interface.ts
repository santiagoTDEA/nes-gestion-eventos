import { Event } from '../entities/event.entity';

/**
 * Contrato (Interfaz) que define las operaciones permitidas para la entidad Event.
 * La capa de infraestructura se encargará de implementar estos métodos.
 */
export interface IEventRepository {
  /**
   * Registra un nuevo evento en el sistema.
   * @param event Objeto con los datos del evento a crear.
   */
  create(event: Event): Promise<Event>;

  /**
   * Obtiene la lista completa de eventos registrados.
   */
  findAll(): Promise<Event[]>;

  /**
   * Busca un evento por su identificador único.
   * @param id Identificador del evento.
   */
  findById(id: string): Promise<Event | null>;

  /**
   * Actualiza la información de un evento existente.
   * @param id Identificador del evento a modificar.
   * @param event Datos actualizados del evento.
   */
  update(id: string, event: Partial<Event>): Promise<Event>;

  /**
   * Elimina un evento del sistema.
   * @param id Identificador del evento a remover.
   */
  delete(id: string): Promise<boolean>;
}