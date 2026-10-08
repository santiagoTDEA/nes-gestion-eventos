import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Person } from '../../person/entities/person.entity';
import { Role } from '../../roles/entities/role.entity';
import { Event } from './event.entity';

@Entity('event_approvals')
export class EventApproval {
  @ApiProperty({
    description: 'Identificador único de la aprobación',
    example: 1,
  })
  @PrimaryGeneratedColumn({ name: 'id_event_approval' })
  id!: number;

  @ManyToOne(() => Event, (event) => event.approvals, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @ApiProperty({
    description: 'Persona responsable de la aprobación',
    type: () => Person,
  })
  @ManyToOne(() => Person, { nullable: false })
  @JoinColumn({ name: 'id_person' })
  person!: Person;

  @ApiProperty({
    description: 'Rol con el que la persona aprueba',
    type: () => Role,
  })
  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn({ name: 'id_role' })
  role!: Role;

  @ApiProperty({
    description: 'Fecha de la aprobación',
    example: '2026-02-15',
  })
  @Column({ name: 'approval_date', type: 'date' })
  date!: string;

  @ApiProperty({
    description: 'Firma de la aprobación',
    example: 'Juan Pérez',
  })
  @Column({ name: 'signature', type: 'text' })
  signature!: string;
}
