import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Faculty } from '../../faculty/entities/faculty.entity';
import { User } from '../../auth/entities/auth.entity';
import { EventApproval } from './event-approval.entity';
import { EventObservation } from './event-observation.entity';

export type EventWorkflowStatus = 'en_flujo' | 'devuelto';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn({ name: 'id_event' })
  id!: number;

  @Column({ name: 'event_type', length: 50 })
  eventType!: string;

  @Column({ name: 'other_event_type', length: 100, nullable: true })
  otherEventType!: string | null;

  @Column({ length: 150 })
  name!: string;

  @ManyToOne(() => Faculty, { nullable: false })
  @JoinColumn({ name: 'id_faculty' })
  faculty!: Faculty;

  @Column({ name: 'academic_program', length: 150 })
  academicProgram!: string;

  @Column({ name: 'teacher_profile', type: 'text' })
  teacherProfile!: string;

  @Column({ type: 'integer' })
  duration!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'selected_days', type: 'jsonb' })
  selectedDays!: string[];

  @Column({ length: 30 })
  modality!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'minimum_capacity', type: 'integer' })
  minimumCapacity!: number;

  @Column({ name: 'maximum_capacity', type: 'integer' })
  maximumCapacity!: number;

  @Column({ name: 'participant_profile', type: 'text' })
  participantProfile!: string;

  @Column({ type: 'text' })
  presentation!: string;

  @Column({ type: 'text' })
  scope!: string;

  @Column({ name: 'general_objective', type: 'text' })
  generalObjective!: string;

  @Column({ type: 'jsonb' })
  objectives!: string[];

  @Column({ type: 'text' })
  competencies!: string;

  @Column({ type: 'jsonb' })
  modules!: string[];

  @Column({ type: 'jsonb' })
  logistics!: Record<string, string>;

  @Column({ name: 'cost_per_participant', type: 'numeric', precision: 12, scale: 2 })
  costPerParticipant!: number;

  @Column({ name: 'confirmed_minimum_capacity', type: 'integer' })
  confirmedMinimumCapacity!: number;

  @Column({ name: 'financial_observations', type: 'text' })
  financialObservations!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy!: User;

  @Column({
    name: 'workflow_status',
    type: 'varchar',
    length: 20,
    default: 'en_flujo',
  })
  workflowStatus!: EventWorkflowStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => EventApproval, (approval) => approval.event)
  approvals!: EventApproval[];

  @OneToMany(() => EventObservation, (observation) => observation.event)
  observations!: EventObservation[];
}
