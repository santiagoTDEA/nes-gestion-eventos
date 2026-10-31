import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';
import {
  CertificateEventView,
  CertificateParticipant,
  CertificateService,
} from '../services/certificate.service';

/** Certificados solo para roles con permisos y módulos completos. */
const GLOBAL_ONLY = { globalOnly: true };

@ApiBearerAuth('access-token')
@ApiTags('Certificados')
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @RequirePermission(Module.CERTIFICADOS, Action.VER, GLOBAL_ONLY)
  @Get('events')
  @ApiOperation({
    summary: 'Eventos aprobados y finalizados que se pueden certificar',
  })
  async findEvents(): Promise<CertificateEventView[]> {
    return this.certificateService.findCertifiableEvents();
  }

  @RequirePermission(Module.CERTIFICADOS, Action.VER, GLOBAL_ONLY)
  @Get('events/:eventId')
  @ApiOperation({
    summary: 'Datos del evento e inscritos para generar los certificados',
  })
  async findForCertificates(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<{
    event: CertificateEventView;
    participants: CertificateParticipant[];
  }> {
    return this.certificateService.findForCertificates(eventId);
  }
}
