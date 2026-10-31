import {
  Body,
  Controller,
  HttpCode,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '../../auth/decorators/public/public.decorator';
import {
  RequestRecoveryDto,
  ResetPasswordDto,
  VerifyRecoveryDto,
} from '../dto/account-recovery.dto';
import {
  AccountRecoveryService,
  RecoveryRequestedView,
} from '../services/account-recovery.service';

/**
 * Recuperación de cuenta por correo. Son endpoints públicos (sin token), así
 * que además de los límites por cuenta del servicio llevan un límite por IP.
 */
@Public()
@UseGuards(ThrottlerGuard)
@ApiTags('Recuperación de cuenta')
@Controller('auth/recovery')
export class AccountRecoveryController {
  constructor(private readonly recoveryService: AccountRecoveryService) {}

  @Post('request')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Paso 1: envía un código al correo si el usuario y el correo coinciden (respuesta siempre igual)',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes desde esta IP',
  })
  async request(
    @Body() dto: RequestRecoveryDto,
    @Ip() ip: string,
  ): Promise<RecoveryRequestedView> {
    return this.recoveryService.request(dto, ip);
  }

  @Post('verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Paso 2: valida el código y entrega un permiso temporal para cambiar la contraseña',
  })
  async verify(
    @Body() dto: VerifyRecoveryDto,
  ): Promise<{ resetToken: string; expiresInMinutes: number }> {
    return this.recoveryService.verify(dto);
  }

  @Post('reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Paso 3: guarda la contraseña nueva con el permiso temporal',
  })
  async reset(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.recoveryService.reset(dto);
  }
}
