import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Event } from './event.entity';

/** Horario de un evento en un día de la semana (un registro por día). */
@Entity('event_schedules')
@Unique(['event', 'dayOfWeek'])
export class EventSchedule {
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @ManyToOne(() => Event, (event) => event.schedules, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @ApiProperty({
    description: 'Día de la semana: 1 = Lunes ... 7 = Domingo',
    example: 1,
  })
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @ApiProperty({ description: 'Hora de inicio', example: '08:00' })
  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @ApiProperty({ description: 'Hora de finalización', example: '12:00' })
  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;
}
