import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateFacultyDto {
  @ApiProperty({
    description: 'Nombre único de la facultad',
    example: 'Facultad de Ingeniería',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    description: 'Departamento de la facultad',
    example: 'Departamento de Ingeniería de Sistemas',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department!: string;

  @ApiProperty({
    description: 'Correo electrónico de la facultad',
    example: 'ingenieria@universidad.edu.co',
    maxLength: 150,
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiProperty({
    description: 'Número telefónico de la facultad',
    example: '+57 604 1234567',
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Identificador del estado de la facultad',
    example: 2,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  statusId!: number;
}

export class UpdateFacultyDto {
  @ApiProperty({
    description: 'Nombre único de la facultad',
    example: 'Facultad de Ingeniería',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiProperty({
    description: 'Departamento de la facultad',
    example: 'Departamento de Ingeniería de Sistemas',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department?: string;

  @ApiProperty({
    description: 'Correo electrónico de la facultad',
    example: 'ingenieria@universidad.edu.co',
    maxLength: 150,
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiProperty({
    description: 'Número telefónico de la facultad',
    example: '+57 604 1234567',
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Identificador del estado de la facultad',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  statusId?: number;
}
