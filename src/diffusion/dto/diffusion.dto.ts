import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  DiffusionAssetType,
  DiffusionStatus,
} from '../constants/diffusion.constants';

export class TransitionDto {
  @ApiProperty({
    enum: DiffusionStatus,
    description: 'Estado al que pasa la solicitud',
  })
  @IsEnum(DiffusionStatus)
  to!: DiffusionStatus;

  @ApiProperty({
    required: false,
    description: 'Observación; obligatoria al devolver a diseño',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UploadAssetDto {
  @ApiProperty({
    enum: DiffusionAssetType,
    description: 'Tipo de pieza que se sube',
  })
  @IsEnum(DiffusionAssetType)
  @IsNotEmpty()
  assetType!: DiffusionAssetType;
}
