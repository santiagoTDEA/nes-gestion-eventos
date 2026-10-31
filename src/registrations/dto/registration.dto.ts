import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { DocumentType } from '../constants/registration.constants';

/**
 * Inscripción desde el formulario. Aquí solo se valida la forma del cuerpo;
 * el formato de cada dato lo valida el servicio con las mismas reglas del Excel.
 */
export class RegisterParticipantDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.CC })
  @IsEnum(DocumentType, { message: 'El tipo de documento no es válido.' })
  documentType!: DocumentType;

  @ApiProperty({ example: '1037654321' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  @MaxLength(20)
  documentNumber!: string;

  @ApiProperty({ example: 'Santiago' })
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  @MaxLength(100)
  firstNames!: string;

  @ApiProperty({ example: 'Ospina' })
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @MaxLength(100)
  lastNames!: string;

  @ApiProperty({ example: 'santiago@correo.com' })
  @IsString()
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  @MaxLength(20)
  phone!: string;
}
