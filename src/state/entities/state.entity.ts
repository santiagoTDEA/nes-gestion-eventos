import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('statuses')
export class Status {
  @ApiProperty({
    description: 'Identificador único del estado',
    example: 1,
  })
  @PrimaryGeneratedColumn({ name: 'id_status' })
  idStatus!: number;

  @ApiProperty({
    description: 'Nombre único del estado',
    example: 'Activo',
    maxLength: 50,
  })
  @Column({
    name: 'status_name',
    length: 50,
    unique: true,
  })
  statusName!: string;
}
