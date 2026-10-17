import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { DiffusionStatus } from '../constants/diffusion.constants';
import { DiffusionRequest } from './diffusion-request.entity';

/** Trazabilidad: cada cambio de estado de una solicitud, con quién y cuándo. */
@Entity('diffusion_status_history')
export class DiffusionStatusHistory {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ name: 'id_diffusion_history' })
  id!: number;

  @ManyToOne(() => DiffusionRequest, (request) => request.history, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_diffusion_request' })
  request!: DiffusionRequest;

  @ApiProperty({ enum: DiffusionStatus, required: false })
  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus?: DiffusionStatus | null;

  @ApiProperty({ enum: DiffusionStatus })
  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus!: DiffusionStatus;

  @ApiProperty({ description: 'Nombre de quien hizo el cambio' })
  @Column({ name: 'changed_by_name', type: 'varchar', length: 150 })
  changedByName!: string;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy?: string | null;

  @ApiProperty({ description: 'Observación del cambio', required: false })
  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
