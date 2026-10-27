import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class EventApprovalDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  personId!: number;

  @IsString()
  @IsNotEmpty()
  roleId!: string;

  @IsDateString()
  date!: string;
}

export class EventScheduleDto {
  @IsDateString()
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  eventType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  otherEventType?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  facultyId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  academicProgram!: string;

  @IsString()
  @IsNotEmpty()
  teacherProfile!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  modality!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EventScheduleDto)
  schedules!: EventScheduleDto[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumCapacity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maximumCapacity!: number;

  @IsString()
  @IsNotEmpty()
  participantProfile!: string;

  @IsString()
  @IsNotEmpty()
  presentation!: string;

  @IsString()
  @IsNotEmpty()
  scope!: string;

  @IsString()
  @IsNotEmpty()
  generalObjective!: string;

  @IsArray()
  @ArrayMinSize(3)
  @IsString({ each: true })
  objectives!: string[];

  @IsString()
  @IsNotEmpty()
  competencies!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  modules!: string[];

  @IsObject()
  logistics!: Record<string, string>;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerParticipant!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  confirmedMinimumCapacity!: number;

  @IsString()
  @IsNotEmpty()
  financialObservations!: string;

  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => EventApprovalDto)
  approvals!: EventApprovalDto[];
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class ReturnEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observation!: string;
}
