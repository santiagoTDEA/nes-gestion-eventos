import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
    ApiProperty,
    ApiPropertyOptional,
    PartialType,
} from '@nestjs/swagger';
export class AccesoRoleDto {
    @ApiProperty({
        example: 'registrar_eventos',
        description: 'Código del módulo al que tendrá acceso el rol',
    })
    @IsString({
        message: 'El módulo debe ser un texto',
    })
    @IsNotEmpty({
        message: 'El módulo es obligatorio',
    })
    modulo!: string;

    @ApiProperty({
        example: ['crear', 'editar', 'eliminar','ver'],
        description: 'Acciones permitidas dentro del módulo',
        type: [String],
    })
    @IsArray({
        message: 'Las acciones deben ser un arreglo',
    })
    @IsString({
        each: true,
        message: 'Cada acción debe ser un texto',
    })
    acciones!: string[];
}

export class CreateRoleDto {
    @ApiProperty({
        example: 'Administrador',
        description: 'Nombre del rol',
        maxLength: 50,
    })
    @IsString({
        message: 'El nombre del rol debe ser un texto',
    })
    @IsNotEmpty({
        message: 'El nombre del rol es obligatorio',
    })
    @MaxLength(50, {
        message: 'El nombre del rol no puede superar los 50 caracteres',
    })
    name!: string;

    @ApiPropertyOptional({
        example: 'Rol encargado de la administración de Educación Continua',
        description: 'Descripción del rol',
        maxLength: 100,
    })
    @IsString({
        message: 'La descripción debe ser un texto',
    })
    @IsOptional()
    @MaxLength(100, {
        message: 'La descripción no puede superar los 100 caracteres',
    })
    description?: string;

    @ApiPropertyOptional({
        example: false,
        description: 'Indica si el rol tiene todas las acciones disponibles',
        default: false,
    })
    @IsBoolean({
        message: 'El permiso total debe ser un booleano',
    })
    @IsOptional()
    permissionsFull?: boolean;

    @ApiPropertyOptional({
        example: false,
        description: 'Indica si el rol tiene acceso a todos los módulos',
        default: false,
    })
    @IsBoolean({
        message: 'El acceso total a módulos debe ser un booleano',
    })
    @IsOptional()
    modulesFull?: boolean;

    @ApiPropertyOptional({
        type: () => [AccesoRoleDto],
        description: 'Módulos y acciones específicas permitidas para el rol',
        example: [
            {
                modulo: 'registrar_eventos',
                acciones: ['crear', 'editar', 'eliminar'],
            },
        ],
    })
    @IsArray({
        message: 'Los accesos deben ser un arreglo',
    })
    @ValidateNested({ each: true })
    @Type(() => AccesoRoleDto)
    @IsOptional()
    accesos?: AccesoRoleDto[];

    @ApiPropertyOptional({
        example: true,
        description: 'Indica si el rol está activo',
        default: true,
    })
    @IsBoolean({
        message: 'El estado activo debe ser un booleano',
    })
    @IsOptional()
    isActive?: boolean;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) { }