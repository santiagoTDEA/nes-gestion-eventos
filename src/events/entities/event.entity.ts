import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Faculty } from '../../faculty/entities/faculty.entity';
import { EventApproval } from './event-approval.entity';

@Entity('event_forms')
export class Event {
  @ApiProperty({
    description: 'Identificador único del evento',
    example: 1,
  })
  @PrimaryGeneratedColumn({ name: 'id_event' })
  id!: number;

  @ApiProperty({
    description: 'Tipo de evento',
    example: 'Curso',
    maxLength: 50,
  })
  @Column({ name: 'event_type', length: 50 })
  eventType!: string;

  @ApiProperty({
    description: 'Tipo de evento personalizado cuando el tipo es "¿Otro?"',
    example: 'Taller',
    maxLength: 100,
    required: false,
  })
  @Column({
    name: 'other_event_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  otherEventType?: string | null;

  @ApiProperty({
    description: 'Nombre del evento',
    example: 'Diplomado en Gestión de Proyectos',
    maxLength: 150,
  })
  @Column({ name: 'name', length: 150 })
  name!: string;

  @ApiProperty({
    description: 'Facultad organizadora del evento',
    type: () => Faculty,
  })
  @ManyToOne(() => Faculty, { nullable: false })
  @JoinColumn({ name: 'id_faculty' })
  faculty!: Faculty;

  @ApiProperty({
    description: 'Programa académico',
    example: 'Ingeniería de Sistemas',
    maxLength: 150,
  })
  @Column({ name: 'academic_program', length: 150 })
  academicProgram!: string;

  @ApiProperty({
    description: 'Perfil del docente',
    example: 'Magíster en gerencia de proyectos',
  })
  @Column({ name: 'teacher_profile', type: 'text' })
  teacherProfile!: string;

  @ApiProperty({
    description: 'Duración del evento en horas',
    example: 40,
  })
  @Column({ name: 'duration', type: 'int' })
  duration!: number;

  @ApiProperty({
    description: 'Hora de inicio',
    example: '08:00',
  })
  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @ApiProperty({
    description: 'Hora de finalización',
    example: '12:00',
  })
  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @ApiProperty({
    description: 'Días de la semana en los que se dicta el evento',
    example: ['Lun', 'Mié'],
    type: [String],
  })
  @Column({ name: 'selected_days', type: 'simple-array' })
  selectedDays!: string[];

  @ApiProperty({
    description: 'Modalidad del evento',
    example: 'Presencial',
    maxLength: 20,
  })
  @Column({ name: 'modality', length: 20 })
  modality!: string;

  @ApiProperty({
    description: 'Fecha de inicio',
    example: '2026-03-01',
  })
  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @ApiProperty({
    description: 'Fecha de finalización',
    example: '2026-06-30',
  })
  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @ApiProperty({
    description: 'Cupo mínimo de participantes',
    example: 15,
  })
  @Column({ name: 'minimum_capacity', type: 'int' })
  minimumCapacity!: number;

  @ApiProperty({
    description: 'Cupo máximo de participantes',
    example: 40,
  })
  @Column({ name: 'maximum_capacity', type: 'int' })
  maximumCapacity!: number;

  @ApiProperty({
    description: 'Perfil del participante',
    example: 'Profesionales del área de tecnología',
  })
  @Column({ name: 'participant_profile', type: 'text' })
  participantProfile!: string;

  @ApiProperty({ description: 'Presentación del evento' })
  @Column({ name: 'presentation', type: 'text' })
  presentation!: string;

  @ApiProperty({ description: 'Alcance del evento' })
  @Column({ name: 'scope', type: 'text' })
  scope!: string;

  @ApiProperty({ description: 'Objetivo general del evento' })
  @Column({ name: 'general_objective', type: 'text' })
  generalObjective!: string;

  @ApiProperty({
    description: 'Objetivos específicos del evento',
    type: [String],
  })
  @Column({ name: 'objectives', type: 'jsonb' })
  objectives!: string[];

  @ApiProperty({ description: 'Competencias a desarrollar' })
  @Column({ name: 'competencies', type: 'text' })
  competencies!: string;

  @ApiProperty({
    description: 'Módulos o contenidos del evento',
    type: [String],
  })
  @Column({ name: 'modules', type: 'jsonb' })
  modules!: string[];

  @ApiProperty({
    description: 'Aspectos logísticos con su respectiva descripción',
    example: { Difusión: 'Sí' },
  })
  @Column({ name: 'logistics', type: 'jsonb' })
  logistics!: Record<string, string>;

  @ApiProperty({
    description: 'Costo por participante',
    example: 350000,
  })
  @Column({
    name: 'cost_per_participant',
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  costPerParticipant!: number;

  @ApiProperty({
    description: 'Cupo mínimo confirmado para la viabilidad financiera',
    example: 15,
  })
  @Column({ name: 'confirmed_minimum_capacity', type: 'int' })
  confirmedMinimumCapacity!: number;

  @ApiProperty({ description: 'Observaciones financieras' })
  @Column({ name: 'financial_observations', type: 'text' })
  financialObservations!: string;

  @ApiProperty({
    description: 'Aprobaciones del evento',
    type: () => [EventApproval],
  })
  @OneToMany(() => EventApproval, (approval) => approval.event, {
    cascade: true,
  })
  approvals!: EventApproval[];

  @ApiProperty({ description: 'Fecha de creación del evento' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
