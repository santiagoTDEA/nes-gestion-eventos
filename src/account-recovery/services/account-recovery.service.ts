import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';

import { User } from '../../auth/entities/auth.entity';
import {
  passwordMatches,
  passwordPolicyErrors,
} from '../../auth/utils/password-policy.util';
import { Env } from '../../enviroments/models/enviroment.model';
import { MailSender } from '../../mail/mail-sender';
import {
  RequestRecoveryDto,
  ResetPasswordDto,
  VerifyRecoveryDto,
} from '../dto/account-recovery.dto';
import { PasswordRecovery } from '../entities/password-recovery.entity';
import { passwordChangedEmail, recoveryCodeEmail } from '../recovery-emails';

/** Reglas del flujo; también las usa la pantalla para sus contadores. */
export const RECOVERY_RULES = {
  codeMinutes: 10,
  resetMinutes: 15,
  maxAttempts: 5,
  resendSeconds: 60,
  maxRequestsPerHour: 5,
};

export interface RecoveryRequestedView {
  message: string;
  expiresInMinutes: number;
  resendInSeconds: number;
}

/** Misma respuesta exista o no el usuario: así nadie averigua qué cuentas existen. */
const REQUESTED: RecoveryRequestedView = {
  message:
    'Si el usuario y el correo coinciden con una cuenta activa, te enviamos un código a ese correo.',
  expiresInMinutes: RECOVERY_RULES.codeMinutes,
  resendInSeconds: RECOVERY_RULES.resendSeconds,
};

const INVALID_CODE = 'El código no es válido o ya venció. Solicita uno nuevo.';
const INVALID_RESET =
  'El permiso para cambiar la contraseña venció o ya se usó. Vuelve a solicitar un código.';

const minutesFromNow = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000);

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);
  private readonly secret: string;

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(PasswordRecovery)
    private readonly recoveries: Repository<PasswordRecovery>,
    private readonly dataSource: DataSource,
    private readonly mail: MailSender,
    config: ConfigService<Env>,
  ) {
    this.secret = config.getOrThrow('JWT_SECRET', { infer: true });
  }

  /**
   * Paso 1: si usuario y correo coinciden, envía un código al correo.
   * Siempre responde lo mismo y no espera el envío, para que tampoco el tiempo
   * de respuesta revele si la cuenta existe.
   */
  async request(
    dto: RequestRecoveryDto,
    ip?: string,
  ): Promise<RecoveryRequestedView> {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();

    const user = await this.users.findOne({
      where: { username },
      relations: { person: true, status: true },
    });
    const personEmail = user?.person?.email?.trim().toLowerCase();

    if (
      !user ||
      !personEmail ||
      personEmail !== email ||
      this.isInactive(user)
    ) {
      return REQUESTED;
    }

    if (await this.tooManyRequests(user.id)) {
      return REQUESTED;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.dataSource.transaction(async (manager) => {
      // Pedir un código nuevo anula los anteriores.
      await manager
        .createQueryBuilder()
        .update(PasswordRecovery)
        .set({ usedAt: new Date() })
        .where('id_user = :userId AND used_at IS NULL', { userId: user.id })
        .execute();

      await manager.save(
        manager.create(PasswordRecovery, {
          user: { id: user.id },
          codeHash: this.hash(code),
          expiresAt: minutesFromNow(RECOVERY_RULES.codeMinutes),
          requestIp: ip?.slice(0, 64) ?? null,
        }),
      );
    });

    this.sendInBackground(
      recoveryCodeEmail(
        personEmail,
        user.person?.name ?? user.username,
        code,
        RECOVERY_RULES.codeMinutes,
      ),
    );

    return REQUESTED;
  }

  /** Paso 2: valida el código y entrega un permiso temporal de un solo uso. */
  async verify(
    dto: VerifyRecoveryDto,
  ): Promise<{ resetToken: string; expiresInMinutes: number }> {
    const user = await this.users.findOne({
      where: { username: dto.username.trim() },
    });

    const recovery = user
      ? await this.recoveries.findOne({
          where: {
            user: { id: user.id },
            usedAt: IsNull(),
            resetTokenHash: IsNull(),
          },
          order: { createdAt: 'DESC' },
        })
      : null;

    if (
      !recovery ||
      recovery.expiresAt <= new Date() ||
      recovery.attempts >= RECOVERY_RULES.maxAttempts
    ) {
      throw new BadRequestException(INVALID_CODE);
    }

    if (!this.matches(dto.code, recovery.codeHash)) {
      const attempts = await this.registerFailedAttempt(recovery.id);
      const remaining = RECOVERY_RULES.maxAttempts - attempts;

      throw new BadRequestException(
        remaining > 0
          ? `El código no es correcto. Te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`
          : 'Superaste el número de intentos. Solicita un código nuevo.',
      );
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.recoveries.update(recovery.id, {
      resetTokenHash: this.hash(resetToken),
      resetExpiresAt: minutesFromNow(RECOVERY_RULES.resetMinutes),
    });

    return { resetToken, expiresInMinutes: RECOVERY_RULES.resetMinutes };
  }

  /** Paso 3: con el permiso vigente, guarda la contraseña nueva. */
  async reset(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { resetToken, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'La confirmación no coincide con la contraseña nueva.',
      );
    }

    const policyErrors = passwordPolicyErrors(newPassword);
    if (policyErrors.length > 0) {
      throw new BadRequestException(
        `La contraseña nueva ${policyErrors.join(', ')}.`,
      );
    }

    const recovery = await this.recoveries.findOne({
      where: { resetTokenHash: this.hash(resetToken), usedAt: IsNull() },
      relations: { user: { person: true } },
    });

    if (!recovery?.resetExpiresAt || recovery.resetExpiresAt <= new Date()) {
      throw new BadRequestException(INVALID_RESET);
    }

    const { user } = recovery;
    if (passwordMatches(user.password, newPassword)) {
      throw new BadRequestException(
        'La contraseña nueva debe ser distinta de la actual.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Se marca usada en la misma operación que la valida: dos envíos a la vez no pasan.
      const closed = await manager
        .createQueryBuilder()
        .update(PasswordRecovery)
        .set({ usedAt: new Date() })
        .where('id_recovery = :id AND used_at IS NULL', { id: recovery.id })
        .execute();

      if (!closed.affected) {
        throw new BadRequestException(INVALID_RESET);
      }

      await manager.update(User, user.id, { password: newPassword });
    });

    const email = user.person?.email;
    if (email) {
      this.sendInBackground(
        passwordChangedEmail(email, user.person?.name ?? user.username),
      );
    }

    return {
      message: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.',
    };
  }

  /** Límite por cuenta: 1 código por minuto y máximo 5 por hora. */
  private async tooManyRequests(userId: string): Promise<boolean> {
    const recent = await this.recoveries.find({
      where: {
        user: { id: userId },
        createdAt: MoreThan(new Date(Date.now() - 60 * 60_000)),
      },
      order: { createdAt: 'DESC' },
      select: { id: true, createdAt: true },
    });

    const last = recent[0]?.createdAt.getTime() ?? 0;
    return (
      recent.length >= RECOVERY_RULES.maxRequestsPerHour ||
      Date.now() - last < RECOVERY_RULES.resendSeconds * 1000
    );
  }

  /** Suma el intento en la base (atómico) y cierra la solicitud al llegar al máximo. */
  private async registerFailedAttempt(id: string): Promise<number> {
    const result = await this.recoveries
      .createQueryBuilder()
      .update(PasswordRecovery)
      .set({ attempts: () => 'attempts + 1' })
      .where('id_recovery = :id', { id })
      .returning('attempts')
      .execute();

    const attempts = Number(
      (result.raw as { attempts: number }[])[0]?.attempts ??
        RECOVERY_RULES.maxAttempts,
    );

    if (attempts >= RECOVERY_RULES.maxAttempts) {
      await this.recoveries.update(id, { usedAt: new Date() });
    }

    return attempts;
  }

  private isInactive(user: User): boolean {
    return user.status?.statusName?.toLowerCase().trim() === 'inactivo';
  }

  private hash(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  private matches(value: string, hash: string): boolean {
    const expected = Buffer.from(hash, 'hex');
    const actual = Buffer.from(this.hash(value), 'hex');
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private sendInBackground(message: Parameters<MailSender['send']>[0]): void {
    this.mail.send(message).catch((error: unknown) => {
      this.logger.error(
        `No se pudo enviar el correo a ${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }
}
