import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

import { Status } from '../../state/entities/state.entity';
import { Faculty } from '../../faculty/entities/faculty.entity';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../auth/entities/auth.entity';

@Entity('persons')
export class Person {
  @ApiProperty({
    description: 'Identificador único de la persona',
    example: 1,
  })
  @PrimaryGeneratedColumn({ name: 'id_person' })
  id!: number;

  @ApiProperty({
    description: 'Número de cédula de la persona',
    example: '1034567890',
    maxLength: 10,
    minLength: 8,
  })
  @Column({
    name: 'cedula',
    length: 10,
    unique: true,
  })
  cedula!: string;

  @ApiProperty({
    description: 'Correo electrónico de la persona',
    example: 'persona@universidad.edu.co',
    maxLength: 150,
  })
  @Column({
    name: 'email',
    length: 150,
  })
  email!: string;

  @ApiProperty({
    description: 'Número telefónico de la persona',
    example: '3001234567',
    maxLength: 20,
  })
  @Column({
    name: 'phone',
    length: 20,
  })
  phone!: string;

  @ApiProperty({
    description: 'Dirección de residencia de la persona',
    example: 'Calle 10 # 20-30',
    maxLength: 200,
  })
  @Column({
    name: 'address',
    length: 200,
  })
  address!: string;

  @ApiProperty({
    description: 'Estado actual de la persona',
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
    description: 'Facultad a la que pertenece la persona',
    type: () => Faculty,
  })
  @ManyToOne(() => Faculty, (faculty) => faculty.persons, {
    nullable: false,
  })
  @JoinColumn({
    name: 'id_faculty',
  })
  faculty!: Faculty;

  @ApiProperty({
    description: 'Rol asignado a la persona',
    type: () => Role,
  })
  @ManyToOne(() => Role, (role) => role.persons, {
    nullable: false,
  })
  @JoinColumn({
    name: 'id_role',
  })
  role!: Role;

  @ApiProperty({
    description: 'Usuario asociado a la persona',
    type: () => User,
  })
  @OneToOne(() => User, (user) => user.person)
  user!: User;
}
