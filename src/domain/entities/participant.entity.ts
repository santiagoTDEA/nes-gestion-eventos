import { ParticipantProfile } from '../enums/participant-profile.enum';

/**
 * Entidad que representa a un participante en el sistema de eventos.
 * Contiene la información personal básica y su perfil dentro de la universidad.
 */
export class Participant {
  // Identificador único del participante (UUID o ID numérico)
  id?: string;

  // Nombre completo del participante
  fullName?: string;

  // Correo electrónico institucional o personal de contacto
  email?: string;

  // Número de documento de identidad (Cédula, TI, etc.)
  documentNumber?: string;

  // Perfil del participante (ESTUDIANTE, DOCENTE, EGRESADO, etc.)
  profile?: ParticipantProfile;

  // Fecha y hora en la que se registró el participante en la plataforma
  createdAt?: Date;

  /**
   * Constructor de la entidad. Permite instanciar un participante asignando
   * valores iniciales de forma flexible utilizando la utilidad Partial.
   */
  constructor(partial?: Partial<Participant>) {
    if (partial) {
      Object.assign(this, partial);
    }
    // Asigna la fecha actual si no se proporciona una explícitamente
    this.createdAt = partial?.createdAt ?? new Date();
  }
}