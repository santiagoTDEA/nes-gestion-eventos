import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export const EVENT_WEEK_DAYS = [
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
  'Dom',
] as const;

export const EVENT_MODALITIES = ['Presencial', 'Virtual', 'Mixta'] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateEventApprovalDto {
  @ApiProperty({
    description: 'Identificador de la persona responsable',
    example: 1,
  })
  @IsInt()
  @Min(1)
  personId!: number;

  @ApiProperty({
    description: 'Identificador del rol con el que aprueba',
    example: '3f2b8c1e-5a4d-4b7e-9c1a-2d6f8e0a1b3c',
  })
  @IsUUID()
  roleId!: string;

  @ApiProperty({
    description: 'Fecha de la aprobación',
    example: '2026-02-15',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Firma de la aprobación',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class CreateEventDto {
  @ApiProperty({
    description: 'Tipo de evento',
    example: 'Curso',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  eventType!: string;

  @ApiProperty({
    description: 'Tipo de evento personalizado cuando el tipo es "¿Otro?"',
    example: 'Taller',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  otherEventType?: string;

  @ApiProperty({
    description: 'Nombre del evento',
    example: 'Diplomado en Gestión de Proyectos',
    minLength: 3,
    maxLength: 150,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    description: 'Identificador de la facultad organizadora',
    example: 1,
  })
  @IsInt()
  @Min(1)
  facultyId!: number;

  @ApiProperty({
    description: 'Programa académico',
    example: 'Ingeniería de Sistemas',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  academicProgram!: string;

  @ApiProperty({
    description: 'Perfil del docente',
    example: 'Magíster en gerencia de proyectos',
  })
  @IsString()
  @IsNotEmpty()
  teacherProfile!: string;

  @ApiProperty({
    description: 'Duración del evento en horas',
    example: 40,
  })
  @IsInt()
  @Min(1)
  duration!: number;

  @ApiProperty({
    description: 'Hora de inicio (HH:mm)',
    example: '08:00',
  })
  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime!: string;

  @ApiProperty({
    description: 'Hora de finalización (HH:mm)',
    example: '12:00',
  })
  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime!: string;

  @ApiProperty({
    description: 'Días de la semana en los que se dicta el evento',
    example: ['Lun', 'Mié'],
    enum: EVENT_WEEK_DAYS,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(EVENT_WEEK_DAYS, { each: true })
  selectedDays!: string[];

  @ApiProperty({
    description: 'Modalidad del evento',
    example: 'Presencial',
    enum: EVENT_MODALITIES,
  })
  @IsIn(EVENT_MODALITIES)
  modality!: string;

  @ApiProperty({
    description: 'Fecha de inicio',
    example: '2026-03-01',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'Fecha de finalización',
    example: '2026-06-30',
  })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    description: 'Cupo mínimo de participantes',
    example: 15,
  })
  @IsInt()
  @Min(1)
  minimumCapacity!: number;

  @ApiProperty({
    description: 'Cupo máximo de participantes',
    example: 40,
  })
  @IsInt()
  @Min(1)
  maximumCapacity!: number;

  @ApiProperty({
    description: 'Perfil del participante',
    example: 'Profesionales del área de tecnología',
  })
  @IsString()
  @IsNotEmpty()
  participantProfile!: string;

  @ApiProperty({ description: 'Presentación del evento' })
  @IsString()
  @IsNotEmpty()
  presentation!: string;

  @ApiProperty({ description: 'Alcance del evento' })
  @IsString()
  @IsNotEmpty()
  scope!: string;

  @ApiProperty({ description: 'Objetivo general del evento' })
  @IsString()
  @IsNotEmpty()
  generalObjective!: string;

  @ApiProperty({
    description: 'Objetivos específicos del evento (mínimo 3)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(3)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  objectives!: string[];

  @ApiProperty({ description: 'Competencias a desarrollar' })
  @IsString()
  @IsNotEmpty()
  competencies!: string;

  @ApiProperty({
    description: 'Módulos o contenidos del evento (mínimo 1)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  modules!: string[];

  @ApiProperty({
    description: 'Aspectos logísticos con su respectiva descripción',
    example: { Difusión: 'Sí' },
  })
  @IsObject()
  logistics!: Record<string, string>;

  @ApiProperty({
    description: 'Costo por participante',
    example: 350000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  costPerParticipant!: number;

  @ApiProperty({
    description: 'Cupo mínimo confirmado para la viabilidad financiera',
    example: 15,
  })
  @IsInt()
  @Min(1)
  confirmedMinimumCapacity!: number;

  @ApiProperty({ description: 'Observaciones financieras' })
  @IsString()
  @IsNotEmpty()
  financialObservations!: string;

  @ApiProperty({
    description:
      'Aprobaciones del evento (elaboración, revisión, verificación y validación)',
    type: () => [CreateEventApprovalDto],
  })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateEventApprovalDto)
  approvals!: CreateEventApprovalDto[];
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}
