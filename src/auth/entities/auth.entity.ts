import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

import { Person } from '../../person/entities/person.entity';
import { Status } from '../../state/entities/state.entity';

@Entity('users')
export class User {
  @ApiProperty({
    description: 'Identificador único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    description: 'Nombre de usuario único',
    example: 'santiago.osipina',
    maxLength: 100,
  })
  @Column({
    unique: true,
    length: 100,
  })
  username!: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'MiPassword123',
    maxLength: 255,
  })
  @Column({
    length: 255,
  })
  password!: string;

  @ApiProperty({
    description: 'Estado actual del usuario',
    type: () => Status,
  })
  @ManyToOne(() => Status, {
    nullable: false,
  })
  @JoinColumn({
    name: 'id_status',
  })
  status!: Status;

  @ApiProperty({
    description: 'Persona asociada al usuario',
    type: () => Person,
  })
  @OneToOne(() => Person, {
    nullable: true,
  })
  @JoinColumn({
    name: 'id_person',
  })
  person?: Person;
}
