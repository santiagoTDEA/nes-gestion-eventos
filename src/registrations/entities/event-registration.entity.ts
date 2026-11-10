import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Event } from '../../events/entities/event.entity';
import { RegistrationSource } from '../constants/registration.constants';

/** Asistente de un evento aprobado. Un documento solo se registra una vez por evento. */
@Entity('event_registrations')
@Index(['event', 'documentNumber'], { unique: true })
export class EventRegistration {
  @ApiProperty({ description: 'Identificador de la asistencia', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id_registration' })
  id!: number;

  @ManyToOne(() => Event, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @ApiProperty({ description: 'Tipo de documento', example: 'CC' })
  @Column({ name: 'document_type', length: 5 })
  documentType!: string;

  @ApiProperty({ description: 'Número de documento', example: '1037654321' })
  @Column({ name: 'document_number', length: 15 })
  documentNumber!: string;

  @ApiProperty({ description: 'Nombres', example: 'Santiago' })
  @Column({ name: 'first_names', length: 100 })
  firstNames!: string;

  @ApiProperty({ description: 'Apellidos', example: 'Ospina' })
  @Column({ name: 'last_names', length: 100 })
  lastNames!: string;

  @ApiProperty({
    description: 'Correo electrónico',
    example: 'santiago@correo.com',
  })
  @Column({ name: 'email', length: 150 })
  email!: string;

  @ApiProperty({ description: 'Teléfono de contacto', example: '3001234567' })
  @Column({ name: 'phone', length: 16 })
  phone!: string;

  @ApiProperty({
    enum: RegistrationSource,
    description: 'Medio de registro de asistencia',
  })
  @Column({ name: 'source', type: 'varchar', length: 12 })
  source!: RegistrationSource;

  @Column({ name: 'registered_by', type: 'uuid', nullable: true })
  registeredBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
