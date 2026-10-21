import {
  CreateDateColumn,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Person } from '../../person/entities/person.entity';

@Entity('event_observations')
export class EventObservation {
  @PrimaryGeneratedColumn({ name: 'id_observation' })
  id!: number;

  @ManyToOne(() => Event, (event) => event.observations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @Column({ name: 'step_role', length: 50 })
  stepRole!: string;

  @Column({ type: 'text' })
  observation!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'author_person_id' })
  author!: Person | null;
}
