import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreatePersonDto {

    @ApiProperty({
        description: 'Número de cédula de ciudadanía colombiana',
        example: '1034567890',
        minLength: 8,
        maxLength: 10,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(10)
    @Matches(/^\d+$/, {
        message: 'La cédula debe contener únicamente números',
    })
    cedula!: string;

    @ApiProperty({
        description: 'Correo electrónico de la persona',
        example: 'persona@universidad.edu.co',
        maxLength: 150,
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(150)
    email!: string;

    @ApiProperty({
        description: 'Número telefónico de la persona',
        example: '3001234567',
        maxLength: 20,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    phone!: string;

    @ApiProperty({
        description: 'Dirección de residencia de la persona',
        example: 'Calle 10 # 20-30',
        maxLength: 200,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    address!: string;

    @ApiProperty({
        description: 'Identificador de la facultad a la que pertenece la persona',
        example: 1,
    })
    @IsInt()
    @IsNotEmpty()
    facultyId!: number;

    @ApiProperty({
        description: 'Identificador del rol asignado a la persona',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsString()
    @IsNotEmpty()
    roleId!: string;

    @ApiProperty({
        description: 'Identificador del estado de la persona',
        example: 2,
    })
    @IsNotEmpty()
    @IsInt()
    statusId!: number;
}

export class UpdatePersonDto {

    @ApiProperty({
        description: 'Número de cédula de la persona',
        example: '1034567890',
        minLength: 8,
        maxLength: 10,
        required: false,
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(10)
    @Matches(/^\d+$/, {
        message: 'La cédula debe contener únicamente números',
    })
    cedula?: string;

    @ApiProperty({
        description: 'Correo electrónico de la persona',
        example: 'persona@universidad.edu.co',
        maxLength: 150,
        required: false,
    })
    @IsOptional()
    @IsEmail()
    @MaxLength(150)
    email?: string;

    @ApiProperty({
        description: 'Número telefónico de la persona',
        example: '3001234567',
        maxLength: 20,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ApiProperty({
        description: 'Dirección de residencia de la persona',
        example: 'Calle 10 # 20-30',
        maxLength: 200,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    address?: string;

    @ApiProperty({
        description: 'Identificador de la facultad a la que pertenece la persona',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    facultyId?: number;

    @ApiProperty({
        description: 'Identificador del estado de la persona',
        example: 2,
        required: false,
    })
    @IsOptional()
    @IsInt()
    statusId?: number;

    @ApiProperty({
        description: 'Identificador del rol asignado a la persona',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    roleId?: string;
}