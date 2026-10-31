import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { UserService } from './auth.service';
import { User } from '../entities/auth.entity';
import { UserRepository } from '../repository/auth.repository';
import { ChangeOwnPasswordDto } from '../dto/auth.dto';
import { passwordPolicyErrors } from '../utils/password-policy.util';

// @nestjs/typeorm se publica como ESM y Jest no lo transforma; aquí solo se usa su decorador.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
// También es ESM; el cambio de contraseña no firma tokens.
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));

describe('UserService.changeOwnPassword', () => {
  let service: UserService;
  let stored: User | null;
  const update = jest.fn<UserRepository['update']>();

  const dto = (
    changes: Partial<ChangeOwnPasswordDto> = {},
  ): ChangeOwnPasswordDto => ({
    currentPassword: 'Actual123',
    newPassword: 'Nueva2026x',
    confirmPassword: 'Nueva2026x',
    ...changes,
  });

  beforeEach(() => {
    stored = { id: 'user-1', password: 'Actual123' } as User;
    update.mockReset();
    update.mockResolvedValue(stored);

    const userRepository = {
      findById: jest.fn(() => Promise.resolve(stored)),
      update,
    } as unknown as UserRepository;

    service = new UserService(
      userRepository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('cambia la contraseña del usuario del token', async () => {
    await expect(service.changeOwnPassword('user-1', dto())).resolves.toEqual({
      message: 'La contraseña se actualizó correctamente.',
    });
    expect(update).toHaveBeenCalledWith('user-1', { password: 'Nueva2026x' });
  });

  it('rechaza si la contraseña actual no es correcta (400, no 401)', async () => {
    await expect(
      service.changeOwnPassword('user-1', dto({ currentPassword: 'Otra1234' })),
    ).rejects.toThrow(
      new BadRequestException('La contraseña actual no es correcta.'),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza si la confirmación no coincide', async () => {
    await expect(
      service.changeOwnPassword(
        'user-1',
        dto({ confirmPassword: 'Distinta2026' }),
      ),
    ).rejects.toThrow('La confirmación no coincide con la contraseña nueva.');
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza si la nueva es igual a la actual', async () => {
    await expect(
      service.changeOwnPassword(
        'user-1',
        dto({ newPassword: 'Actual123', confirmPassword: 'Actual123' }),
      ),
    ).rejects.toThrow('La contraseña nueva debe ser distinta de la actual.');
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña nueva débil sin consultar la base de datos', async () => {
    await expect(
      service.changeOwnPassword(
        'user-1',
        dto({ newPassword: 'corta', confirmPassword: 'corta' }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 404 si el usuario del token ya no existe', async () => {
    stored = null;
    await expect(service.changeOwnPassword('user-1', dto())).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('passwordPolicyErrors', () => {
  it('acepta letras y números con 8 o más caracteres', () => {
    expect(passwordPolicyErrors('Nueva2026')).toEqual([]);
    expect(passwordPolicyErrors('ñandú2026')).toEqual([]);
  });

  it('explica cada regla que falta', () => {
    expect(passwordPolicyErrors('abc')).toEqual([
      'debe tener mínimo 8 caracteres',
      'debe tener al menos un número',
    ]);
    expect(passwordPolicyErrors('12345678')).toEqual([
      'debe tener al menos una letra',
    ]);
    expect(passwordPolicyErrors('clave 2026')).toEqual([
      'no puede tener espacios',
    ]);
  });
});
