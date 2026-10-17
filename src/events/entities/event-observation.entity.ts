import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Person } from '../../person/entities/person.entity';
import { Event } from './event.entity';

/** Observación con la que un responsable devolvió el evento al autor. */
@Entity('event_observations')
export class EventObservation {
  @ApiProperty({ description: 'Identificador de la observación', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id_event_observation' })
  id!: number;

  @ManyToOne(() => Event, (event) => event.observations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @ApiProperty({
    description: 'Paso del workflow que devolvió el evento',
    example: 'Revisión',
  })
  @Column({ name: 'step_role', type: 'varchar', length: 100 })
  stepRole!: string;

  @ApiProperty({
    description: 'Persona que hizo la observación',
    type: () => Person,
    required: false,
  })
  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'id_author' })
  author?: Person | null;

  @ApiProperty({ description: 'Motivo de la devolución' })
  @Column({ name: 'observation', type: 'text' })
  observation!: string;

  @ApiProperty({ description: 'Fecha de la observación' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({
    description:
      'Fecha en que el autor reenvió el evento; nula si sigue abierta',
    required: false,
  })
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;
}
