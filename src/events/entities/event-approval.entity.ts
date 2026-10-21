import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Person } from '../../person/entities/person.entity';
import { Role } from '../../roles/entities/role.entity';

export type ApprovalStatus = 'pendiente' | 'aprobado';

@Entity('event_approvals')
export class EventApproval {
  @PrimaryGeneratedColumn({ name: 'id_approval' })
  id!: number;

  @ManyToOne(() => Event, (event) => event.approvals, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @Column({ name: 'step_order', type: 'integer' })
  stepOrder!: number;

  @Column({ name: 'step_role', length: 50 })
  stepRole!: string;

  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'id_person' })
  person!: Person | null;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'id_role' })
  role!: Role | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  status!: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  signature!: string | null;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt!: Date | null;
}
