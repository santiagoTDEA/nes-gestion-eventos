import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Person } from '../../person/entities/person.entity';

import { Status } from '../../state/entities/state.entity';
@Entity('faculties')
export class Faculty {
  @ApiProperty({
    description: 'Identificador único de la facultad',
    example: 1,
  })
  @PrimaryGeneratedColumn({ name: 'id_faculty' })
  id!: number;

  @ApiProperty({
    description: 'Nombre único de la facultad',
    example: 'Facultad de Ingeniería',
    maxLength: 50,
  })
  @Column({
    name: 'name',
    length: 50,
    unique: true,
  })
  name!: string;

  @ApiProperty({
    description: 'Departamento de la facultad',
    example: 'Departamento de Ingeniería de Sistemas',
    maxLength: 100,
  })
  @Column({
    name: 'department',
    length: 100,
  })
  department!: string;

  @ApiProperty({
    description: 'Correo electrónico de la facultad',
    example: 'ingenieria@universidad.edu.co',
    maxLength: 150,
    required: false,
  })
  @Column({
    name: 'email',
    length: 150,
    nullable: true,
  })
  email?: string;

  @ApiProperty({
    description: 'Número telefónico de la facultad',
    example: '+57 604 1234567',
    maxLength: 20,
    required: false,
  })
  @Column({
    name: 'phone',
    length: 20,
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    description: 'Estado actual de la facultad',
    type: () => Status,
  })
  @ManyToOne(() => Status, {
    nullable: false,
  })
  @JoinColumn({
    name: 'id_status',
  })
  status!: Status;

  @OneToMany(() => Person, (person) => person.faculty)
  persons!: Person[];
}
