import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { ErrorManager } from '../../utils/error.manager';
import { UserRepository } from '../repository/auth.repository';

const MAX_ATTEMPTS = 10;

/**
 * Firma digital de cada usuario: un código único (FD-XXXXXXXXXXXX) que se genera
 * solo al crear el usuario y no cambia. Se estampa en cada aprobación que firma.
 */
@Injectable()
export class SignatureService {
  constructor(private readonly userRepository: UserRepository) {}

  /** Genera un código que ningún otro usuario tiene. */
  async generateUnique(): Promise<string> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const signature = `FD-${randomBytes(6).toString('hex').toUpperCase()}`;

      if (!(await this.userRepository.existsSignature(signature))) {
        return signature;
      }
    }

    throw new ErrorManager({
      type: 'INTERNAL_SERVER_ERROR',
      message: 'No se pudo generar una firma única',
    });
  }

  /** Firma del usuario; si es un usuario anterior a esta función, se le genera en ese momento. */
  async getOrCreate(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ErrorManager({
        type: 'NOT_FOUND',
        message: 'No se encontró el usuario',
      });
    }

    if (user.signature) {
      return user.signature;
    }

    const signature = await this.generateUnique();
    await this.userRepository.saveSignature(userId, signature);

    return signature;
  }
}
