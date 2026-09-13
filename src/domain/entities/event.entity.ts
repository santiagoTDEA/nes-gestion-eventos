import { EventType } from '../enums/event-type.enum';
import { EventModality } from '../enums/event-modality.enum';
import { EventStatus } from '../enums/event-status.enum';

/**
 * Entidad principal que representa un evento académico o administrativo en la universidad.
 * Modela las propiedades centrales, su estado y restricciones de aforo.
 */
export class Event {
  // Identificador único del evento
  id?: string;

  // Título o nombre público del evento
  title?: string;

  // Descripción detallada sobre los temas o agenda del evento
  description?: string;

  // Clasificación del evento (CURSO, TALLER, CONFERENCIA, etc.)
  type?: EventType;

  // Modalidad de realización (PRESENCIAL, VIRTUAL, HIBRIDO)
  modality?: EventModality;

  // Estado del flujo de vida del evento (BORRADOR, APROBADO, FINALIZADO, etc.)
  status?: EventStatus;

  // Capacidad máxima de asistentes permitidos
  capacity?: number;

  // Fecha y hora programada para el inicio del evento
  startDate?: Date;

  // Fecha y hora programada para la finalización del evento
  endDate?: Date;

  // Ubicación física (aula/auditorio) o enlace de la reunión virtual (opcional)
  location?: string;

  // Fecha de creación del registro en el sistema
  createdAt?: Date;

  // Fecha de la última actualización realizada sobre el evento
  updatedAt?: Date;

  /**
   * Constructor de la entidad Event. Asigna las propiedades recibidas
   * y establece valores por defecto para estados y fechas.
   */
  constructor(partial?: Partial<Event>) {
    if (partial) {
      Object.assign(this, partial);
    }
    // Asigna las fechas de creación y actualización si no vienen especificadas
    this.createdAt = partial?.createdAt ?? new Date();
    this.updatedAt = partial?.updatedAt ?? new Date();
    // Todo evento nuevo se inicializa por defecto en estado BORRADOR
    this.status = partial?.status ?? EventStatus.BORRADOR;
  }
}