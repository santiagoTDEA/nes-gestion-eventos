import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { CurrentUser } from '../../auth/decorators/current-user/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';
import type { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { RegisterParticipantDto } from '../dto/registration.dto';
import { XLSX_MIME } from '../services/registration-excel.service';
import {
  ImportResult,
  RegisterResult,
  RegistrationEventView,
  RegistrationService,
  RegistrationView,
  UploadedFileLike,
} from '../services/registration.service';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Gestión de asistencia solo para roles con permisos y módulos completos. */
const GLOBAL_ONLY = { globalOnly: true };

@ApiBearerAuth('access-token')
@ApiTags('Asistencia')
@Controller('registrations')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @RequirePermission(Module.ASISTENCIA, Action.VER, GLOBAL_ONLY)
  @Get('events')
  @ApiOperation({
    summary: 'Eventos con aprobación completa y su ocupación de cupos',
  })
  async findEvents(): Promise<RegistrationEventView[]> {
    return this.registrationService.findApprovedEvents();
  }

  @RequirePermission(Module.ASISTENCIA, Action.VER, GLOBAL_ONLY)
  @Get('template')
  @ApiOperation({ summary: 'Descargar la plantilla de asistencia en Excel' })
  async template(): Promise<StreamableFile> {
    return new StreamableFile(await this.registrationService.buildTemplate(), {
      type: XLSX_MIME,
      disposition: 'attachment; filename="plantilla-asistencia.xlsx"',
    });
  }

  @RequirePermission(Module.ASISTENCIA, Action.VER, GLOBAL_ONLY)
  @Get('events/:eventId')
  @ApiOperation({ summary: 'Asistentes de un evento' })
  async findByEvent(@Param('eventId', ParseIntPipe) eventId: number): Promise<{
    event: RegistrationEventView;
    registrations: RegistrationView[];
  }> {
    return this.registrationService.findByEvent(eventId);
  }

  @RequirePermission(Module.ASISTENCIA, Action.CREAR, GLOBAL_ONLY)
  @Post('events/:eventId')
  @ApiOperation({ summary: 'Registrar la asistencia de una persona desde el formulario' })
  async register(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: RegisterParticipantDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RegisterResult> {
    return this.registrationService.register(eventId, dto, user);
  }

  @RequirePermission(Module.ASISTENCIA, Action.CREAR, GLOBAL_ONLY)
  @Post('events/:eventId/import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Registrar asistentes desde un Excel (.xlsx); devuelve las filas con error en otro Excel',
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async import(
    @Param('eventId', ParseIntPipe) eventId: number,
    @UploadedFile() file: UploadedFileLike | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<ImportResult> {
    return this.registrationService.importExcel(eventId, file, user);
  }

  @RequirePermission(Module.ASISTENCIA, Action.ELIMINAR, GLOBAL_ONLY)
  @Delete(':id')
  @ApiOperation({ summary: 'Retirar la asistencia de una persona' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.registrationService.remove(id);
  }
}
