import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../auth/entities/auth.entity';

/**
 * Una solicitud de recuperación de cuenta. Pasa por dos etapas:
 *   1. Código enviado al correo (codeHash, expiresAt, attempts).
 *   2. Código verificado: permiso temporal para cambiar la contraseña (resetTokenHash).
 * Nada se guarda en claro: código y permiso van como HMAC-SHA256.
 * usedAt marca la solicitud como cerrada (usada, anulada o bloqueada por intentos).
 */
@Entity('password_recoveries')
export class PasswordRecovery {
  @PrimaryGeneratedColumn('uuid', { name: 'id_recovery' })
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_user' })
  user!: User;

  @Column({ name: 'code_hash', type: 'varchar', length: 64 })
  codeHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Index()
  @Column({
    name: 'reset_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  resetTokenHash?: string | null;

  @Column({ name: 'reset_expires_at', type: 'timestamptz', nullable: true })
  resetExpiresAt?: Date | null;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @Column({ name: 'request_ip', type: 'varchar', length: 64, nullable: true })
  requestIp?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
