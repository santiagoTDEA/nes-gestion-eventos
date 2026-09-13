import { Participant } from '../entities/participant.entity';

/**
 * Contrato (Interfaz) que define las operaciones permitidas para la entidad Participant.
 */
export interface IParticipantRepository {
  /**
   * Registra un nuevo participante.
   * @param participant Objeto con los datos del participante.
   */
  create(participant: Participant): Promise<Participant>;

  /**
   * Busca un participante por su documento de identidad.
   * @param documentNumber Número de documento.
   */
  findByDocument(documentNumber: string): Promise<Participant | null>;

  /**
   * Obtiene todos los participantes asociados a un evento específico.
   * @param eventId Identificador del evento.
   */
  findByEventId(eventId: string): Promise<Participant[]>;
}