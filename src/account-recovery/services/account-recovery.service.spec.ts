import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';

import { User } from '../../auth/entities/auth.entity';
import type { Env } from '../../enviroments/models/enviroment.model';
import { MailMessage, MailSender } from '../../mail/mail-sender';
import { PasswordRecovery } from '../entities/password-recovery.entity';
import {
  AccountRecoveryService,
  RECOVERY_RULES,
} from './account-recovery.service';

// @nestjs/typeorm se publica como ESM y Jest no lo transforma; aquí solo se usa su decorador.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
// También es ESM; la prueba entrega su propia configuración.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

type Row = PasswordRecovery & { userId: string };

/**
 * Base de datos en memoria con lo justo que usa el servicio: así se prueban
 * las reglas de verdad (vencimiento, intentos, un solo uso) sin Postgres.
 */
function createStore() {
  const users = new Map<string, User>();
  const rows: Row[] = [];
  let sequence = 0;

  const open = (row: Row) => !row.usedAt;
  const queryBuilder = () => {
    let values: Record<string, unknown> = {};
    let sql = '';
    let params: Record<string, string> = {};
    const builder = {
      update: () => builder,
      set: (next: Record<string, unknown>) => ((values = next), builder),
      where: (where: string, p: Record<string, string>) => (
        (sql = where),
        (params = p),
        builder
      ),
      returning: () => builder,
      execute: () => {
        const targets = rows.filter((row) =>
          sql.startsWith('id_user')
            ? row.userId === params.userId && open(row)
            : row.id === params.id && (!sql.includes('used_at') || open(row)),
        );
        targets.forEach((row) => {
          if (typeof values.attempts === 'function') row.attempts += 1;
          if (values.usedAt) row.usedAt = values.usedAt as Date;
        });
        return Promise.resolve({
          affected: targets.length,
          raw: targets.map((row) => ({ attempts: row.attempts })),
        });
      },
    };
    return builder;
  };

  const recoveries = {
    find: jest.fn(({ where }: { where: { user: { id: string } } }) =>
      Promise.resolve(
        rows
          .filter((row) => row.userId === where.user.id)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
    ),
    findOne: jest.fn(
      ({
        where,
      }: {
        where: { user?: { id: string }; resetTokenHash?: unknown };
      }) => {
        const match = rows
          .filter(open)
          .filter((row) =>
            where.user
              ? row.userId === where.user.id && !row.resetTokenHash
              : row.resetTokenHash === where.resetTokenHash,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return Promise.resolve(
          match ? { ...match, user: users.get(match.userId) } : null,
        );
      },
    ),
    update: jest.fn((id: string, values: Partial<Row>) => {
      Object.assign(rows.find((row) => row.id === id) ?? {}, values);
      return Promise.resolve({ affected: 1 });
    }),
    createQueryBuilder: queryBuilder,
  };

  const manager = {
    createQueryBuilder: queryBuilder,
    create: (_entity: unknown, data: Partial<Row> & { user: { id: string } }) =>
      data,
    save: (data: Partial<Row> & { user: { id: string } }) => {
      rows.push({
        id: `rec-${++sequence}`,
        attempts: 0,
        usedAt: null,
        resetTokenHash: null,
        resetExpiresAt: null,
        createdAt: new Date(Date.now() + sequence),
        ...data,
        userId: data.user.id,
      } as Row);
      return Promise.resolve();
    },
    update: (_entity: unknown, id: string, values: Partial<User>) => {
      Object.assign(users.get(id) ?? {}, values);
      return Promise.resolve();
    },
  };

  const usersRepo = {
    findOne: ({ where }: { where: { username: string } }) =>
      Promise.resolve(
        [...users.values()].find((user) => user.username === where.username) ??
          null,
      ),
  };

  const dataSource = {
    transaction: (work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
  };

  return { users, rows, recoveries, usersRepo, dataSource };
}

describe('AccountRecoveryService', () => {
  let store: ReturnType<typeof createStore>;
  let service: AccountRecoveryService;
  let sent: MailMessage[];

  const request = (username = 'ana.ruiz', email = 'Ana@Correo.com ') =>
    service.request({ username, email }, '127.0.0.1');

  /** El código viaja solo en el correo; la prueba lo lee de ahí, como la persona. */
  const lastCode = () =>
    /\b(\d{6})\b/.exec(sent[sent.length - 1].text)?.[1] ?? '';

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    store = createStore();
    sent = [];
    store.users.set('u1', {
      id: 'u1',
      username: 'ana.ruiz',
      password: 'Actual123',
      status: { statusName: 'Activo' },
      person: { name: 'Ana Ruiz', email: 'ana@correo.com' },
    } as unknown as User);

    const mail: MailSender = {
      send: (message: MailMessage) => {
        sent.push(message);
        return Promise.resolve();
      },
    };

    service = new AccountRecoveryService(
      store.usersRepo as unknown as Repository<User>,
      store.recoveries as unknown as Repository<PasswordRecovery>,
      store.dataSource as unknown as DataSource,
      mail,
      {
        getOrThrow: () => 'secreto-de-prueba',
      } as unknown as ConfigService<Env>,
    );
  });

  describe('paso 1: solicitar código', () => {
    it('envía un código de 6 dígitos al correo y no lo guarda en claro', async () => {
      const result = await request();
      await flush();

      expect(result.expiresInMinutes).toBe(RECOVERY_RULES.codeMinutes);
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('ana@correo.com');
      expect(lastCode()).toMatch(/^\d{6}$/);
      expect(store.rows[0].codeHash).toHaveLength(64);
      expect(store.rows[0].codeHash).not.toContain(lastCode());
    });

    it('responde igual y no envía nada si el usuario no existe o el correo no coincide', async () => {
      const ok = await request();
      await flush();
      sent = [];

      expect(await request('no.existe')).toEqual(ok);
      expect(await request('ana.ruiz', 'otra@correo.com')).toEqual(ok);
      await flush();
      expect(sent).toHaveLength(0);
    });

    it('no envía a usuarios inactivos', async () => {
      (store.users.get('u1') as User).status = {
        statusName: 'Inactivo',
      } as User['status'];
      await request();
      await flush();
      expect(sent).toHaveLength(0);
    });

    it('espera un minuto entre códigos de la misma cuenta', async () => {
      await request();
      await request();
      await flush();
      expect(sent).toHaveLength(1);
    });
  });

  describe('paso 2: verificar código', () => {
    it('con el código correcto entrega un permiso temporal', async () => {
      await request();
      await flush();

      const result = await service.verify({
        username: 'ana.ruiz',
        code: lastCode(),
      });
      expect(result.resetToken).toMatch(/^[a-f0-9]{64}$/);
      expect(result.expiresInMinutes).toBe(RECOVERY_RULES.resetMinutes);
    });

    it('cuenta los intentos fallidos y bloquea al quinto', async () => {
      await request();
      await flush();
      const wrong = lastCode() === '000000' ? '111111' : '000000';

      for (let i = 1; i < RECOVERY_RULES.maxAttempts; i++) {
        await expect(
          service.verify({ username: 'ana.ruiz', code: wrong }),
        ).rejects.toThrow(/Te queda/);
      }
      await expect(
        service.verify({ username: 'ana.ruiz', code: wrong }),
      ).rejects.toThrow('Superaste el número de intentos');

      // Ni el código correcto sirve después del bloqueo.
      await expect(
        service.verify({ username: 'ana.ruiz', code: lastCode() }),
      ).rejects.toThrow('ya venció');
    });

    it('rechaza un código vencido', async () => {
      await request();
      await flush();
      store.rows[0].expiresAt = new Date(Date.now() - 1000);

      await expect(
        service.verify({ username: 'ana.ruiz', code: lastCode() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('pedir un código nuevo anula el anterior', async () => {
      await request();
      await flush();
      const first = lastCode();
      store.rows[0].createdAt = new Date(Date.now() - 2 * 60_000);

      await request();
      await flush();
      expect(sent).toHaveLength(2);

      if (first !== lastCode()) {
        await expect(
          service.verify({ username: 'ana.ruiz', code: first }),
        ).rejects.toThrow(BadRequestException);
      }
      await expect(
        service.verify({ username: 'ana.ruiz', code: lastCode() }),
      ).resolves.toHaveProperty('resetToken');
    });
  });

  describe('paso 3: cambiar contraseña', () => {
    const verified = async () => {
      await request();
      await flush();
      return (await service.verify({ username: 'ana.ruiz', code: lastCode() }))
        .resetToken;
    };

    it('cambia la contraseña, cierra el permiso y avisa por correo', async () => {
      const resetToken = await verified();
      sent = [];

      await expect(
        service.reset({
          resetToken,
          newPassword: 'Nueva2026',
          confirmPassword: 'Nueva2026',
        }),
      ).resolves.toEqual({
        message: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.',
      });
      await flush();

      expect(store.users.get('u1')?.password).toBe('Nueva2026');
      expect(sent[0].subject).toContain('fue cambiada');
    });

    it('el permiso sirve una sola vez', async () => {
      const resetToken = await verified();
      const dto = {
        resetToken,
        newPassword: 'Nueva2026',
        confirmPassword: 'Nueva2026',
      };

      await service.reset(dto);
      await expect(
        service.reset({
          ...dto,
          newPassword: 'Otra20266',
          confirmPassword: 'Otra20266',
        }),
      ).rejects.toThrow('venció o ya se usó');
    });

    it('rechaza un permiso vencido', async () => {
      const resetToken = await verified();
      store.rows[0].resetExpiresAt = new Date(Date.now() - 1000);

      await expect(
        service.reset({
          resetToken,
          newPassword: 'Nueva2026',
          confirmPassword: 'Nueva2026',
        }),
      ).rejects.toThrow('venció o ya se usó');
    });

    it('aplica las reglas de contraseña segura y la confirmación', async () => {
      const resetToken = await verified();

      await expect(
        service.reset({
          resetToken,
          newPassword: 'corta',
          confirmPassword: 'corta',
        }),
      ).rejects.toThrow('mínimo 8 caracteres');
      await expect(
        service.reset({
          resetToken,
          newPassword: 'Nueva2026',
          confirmPassword: 'Nueva2027',
        }),
      ).rejects.toThrow('La confirmación no coincide');
      await expect(
        service.reset({
          resetToken,
          newPassword: 'Actual123',
          confirmPassword: 'Actual123',
        }),
      ).rejects.toThrow('distinta de la actual');
      expect(store.users.get('u1')?.password).toBe('Actual123');
    });

    it('un permiso inventado no sirve', async () => {
      await expect(
        service.reset({
          resetToken: 'a'.repeat(64),
          newPassword: 'Nueva2026',
          confirmPassword: 'Nueva2026',
        }),
      ).rejects.toThrow('venció o ya se usó');
    });
  });
});
