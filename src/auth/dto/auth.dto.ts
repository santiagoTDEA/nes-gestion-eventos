import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único',
    example: 'santiago.ospina',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username!: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'MiPassword123',
    minLength: 6,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  password!: string;

  @ApiProperty({
    description: 'Identificador de la persona asociada al usuario',
    example: 1,
    required: false,
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsOptional()
  @IsInt()
  personId?: number;

  @ApiProperty({
    description: 'Identificador del estado del usuario',
    example: 2,
  })
  @IsInt()
  @IsNotEmpty()
  statusId!: number;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único',
    example: 'santiago.ospina',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username?: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'NuevaPassword123',
    minLength: 6,
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  password?: string;

  @ApiProperty({
    description: 'Identificador de la persona asociada al usuario',
    example: 1,
    required: false,
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  personId?: number;

  @ApiProperty({
    description: 'Identificador del estado del usuario',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  statusId?: number;
}

export class ValidarCredencialesDto {
  @ApiProperty({
    description: 'Nombre de usuario del usuario',
    example: 'santiago.ospina',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'MiPassword123',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

/** Cambio de contraseña del propio usuario (pantalla "Mi perfil"). */
export class ChangeOwnPasswordDto {
  @ApiProperty({ description: 'Contraseña actual', example: 'MiPassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu contraseña actual.' })
  @MaxLength(255)
  currentPassword!: string;

  @ApiProperty({
    description: 'Contraseña nueva: mínimo 8 caracteres, con letras y números',
    example: 'NuevaClave2026',
  })
  @IsString()
  @IsNotEmpty({ message: 'Escribe la contraseña nueva.' })
  @MaxLength(255)
  newPassword!: string;

  @ApiProperty({
    description: 'Contraseña nueva repetida',
    example: 'NuevaClave2026',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirma la contraseña nueva.' })
  @MaxLength(255)
  confirmPassword!: string;
}
