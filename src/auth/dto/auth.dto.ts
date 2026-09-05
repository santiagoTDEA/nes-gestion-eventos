
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

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