import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { User } from '../../auth/entities/auth.entity';
import { Event } from '../../events/entities/event.entity';

/** Tipos de notificación del flujo de gestión de eventos. */
export enum NotificationType {
  CREADO = 'creado',
  ASIGNADO = 'asignado',
  TURNO = 'turno',
  FIRMADO = 'firmado',
  DEVUELTO = 'devuelto',
  REENVIADO = 'reenviado',
  APROBADO = 'aprobado',
}

@Entity('notifications')
export class Notification {
  @ApiProperty({ description: 'Identificador de la notificación', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id_notification' })
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_user' })
  user!: User;

  @ApiProperty({ description: 'Evento al que se refiere', type: () => Event })
  @ManyToOne(() => Event, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @ApiProperty({ enum: NotificationType, example: NotificationType.TURNO })
  @Column({ name: 'type', type: 'varchar', length: 20 })
  type!: NotificationType;

  @ApiProperty({ description: 'Texto que ve el usuario' })
  @Column({ name: 'message', type: 'text' })
  message!: string;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Fecha en que el usuario la leyó; nula si sigue sin leer',
    required: false,
  })
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;
}
