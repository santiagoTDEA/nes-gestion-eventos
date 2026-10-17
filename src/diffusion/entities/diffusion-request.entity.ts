import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Event } from '../../events/entities/event.entity';
import {
  DiffusionArea,
  DiffusionRequestType,
  DiffusionStatus,
} from '../constants/diffusion.constants';
import { DiffusionAsset } from './diffusion-asset.entity';
import { DiffusionStatusHistory } from './diffusion-status-history.entity';

/** Datos del evento al momento de aprobarse; la solicitud no cambia si luego se edita el evento. */
export interface EventSnapshot {
  name: string;
  eventType: string;
  faculty: string;
  modality: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  participantProfile: string;
  presentation: string;
}

@Entity('diffusion_requests')
export class DiffusionRequest {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ name: 'id_diffusion_request' })
  id!: number;

  @ManyToOne(() => Event, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_event' })
  event!: Event;

  @ApiProperty({ enum: DiffusionRequestType })
  @Column({ name: 'type', type: 'varchar', length: 20 })
  type!: DiffusionRequestType;

  @ApiProperty({ enum: DiffusionArea })
  @Column({ name: 'area', type: 'varchar', length: 30 })
  area!: DiffusionArea;

  @ApiProperty({ enum: DiffusionStatus })
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: DiffusionStatus.SOLICITADA,
  })
  status!: DiffusionStatus;

  @ApiProperty({ description: 'Usuario que creó el evento (solicitante)' })
  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy?: string | null;

  /** Usuarios que pueden revisar las piezas: el creador y la persona de Elaboración. */
  @Column({ name: 'author_ids', type: 'simple-array' })
  authorIds!: string[];

  @ApiProperty({ description: 'Copia de los datos del evento al aprobarse' })
  @Column({ name: 'event_snapshot', type: 'jsonb' })
  eventSnapshot!: EventSnapshot;

  @OneToMany(() => DiffusionAsset, (asset) => asset.request)
  assets!: DiffusionAsset[];

  @OneToMany(() => DiffusionStatusHistory, (item) => item.request)
  history!: DiffusionStatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
