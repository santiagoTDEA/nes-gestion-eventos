import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { DiffusionAssetType } from '../constants/diffusion.constants';
import { DiffusionRequest } from './diffusion-request.entity';

/** Pieza guardada en el repositorio de una solicitud (flyer, video, banner...). */
@Entity('diffusion_assets')
export class DiffusionAsset {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ name: 'id_diffusion_asset' })
  id!: number;

  @ManyToOne(() => DiffusionRequest, (request) => request.assets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_diffusion_request' })
  request!: DiffusionRequest;

  @ApiProperty({ enum: DiffusionAssetType })
  @Column({ name: 'asset_type', type: 'varchar', length: 20 })
  assetType!: DiffusionAssetType;

  @ApiProperty({ description: 'Nombre original del archivo' })
  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  /** Ruta relativa dentro del almacenamiento público (se sirve en /files/...). */
  @ApiProperty({ description: 'Ruta pública del archivo' })
  @Column({ name: 'path', type: 'varchar', length: 400 })
  path!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'size', type: 'int' })
  size!: number;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
