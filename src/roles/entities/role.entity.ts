import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoleProps } from '../interfaces/role.interface';
import { ErrorManager } from '../../utils/error.manager';
import { Person } from '../../person/entities/person.entity';

interface RoleAccess {
  modulo: string;
  acciones: string[];
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    unique: true,
    length: 100,
    type: 'varchar',
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'permissions_full',
    type: 'boolean',
    default: false,
  })
  permissionsFull!: boolean;

  @Column({
    name: 'modules_full',
    type: 'boolean',
    default: false,
  })
  modulesFull!: boolean;

  @Column({
    type: 'jsonb',
    default: [],
  })
  accesos!: RoleAccess[];

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
  @OneToMany(() => Person, (person) => person.role)
  persons!: Person[];
  static create(data: RoleProps): Role {
    const role = new Role();

    role.setFields(data);

    return role;
  }

  update(data: Partial<RoleProps>): void {
    this.setFields(data);
  }

  private setFields(data: Partial<RoleProps>): void {
    const permissionsFull = data.permissionsFull ?? this.permissionsFull;

    const modulesFull = data.modulesFull ?? this.modulesFull;

    if (!permissionsFull && modulesFull) {
      throw new ErrorManager({
        type: 'BAD_REQUEST',
        message:
          'No es válido tener acceso a todos los módulos sin tener todos los permisos',
      });
    }

    const fields: Partial<RoleProps> = {
      ...data,
      ...(permissionsFull && modulesFull && { accesos: [] }),
    };

    Object.assign(this, fields);
  }
}
