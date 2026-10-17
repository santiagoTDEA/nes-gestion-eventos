import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { TransitionDto, UploadAssetDto } from '../dto/diffusion.dto';
import {
  DiffusionRequestView,
  DiffusionService,
  UploadedFileLike,
} from '../services/diffusion.service';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

@ApiBearerAuth('access-token')
@ApiTags('Difusión')
@Controller('diffusion')
export class DiffusionController {
  constructor(private readonly diffusionService: DiffusionService) {}

  @RequirePermission(Module.DIFUSION, Action.VER)
  @Get()
  @ApiOperation({ summary: 'Solicitudes de difusión visibles para el usuario' })
  async findAll(
    @CurrentUser() user: AuthUser,
  ): Promise<DiffusionRequestView[]> {
    return this.diffusionService.findAll(user);
  }

  @RequirePermission(Module.DIFUSION, Action.VER)
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una solicitud de difusión' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<DiffusionRequestView> {
    return this.diffusionService.findOne(id, user);
  }

  @RequirePermission(Module.DIFUSION, Action.EDITAR)
  @Post(':id/transition')
  @ApiOperation({
    summary: 'Cambiar el estado de la solicitud (según las reglas del flujo)',
  })
  async transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DiffusionRequestView> {
    return this.diffusionService.transition(id, dto, user);
  }

  @RequirePermission(Module.DIFUSION, Action.EDITAR)
  @Post(':id/assets')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir una pieza al repositorio de la solicitud' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async addAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadAssetDto,
    @UploadedFile() file: UploadedFileLike | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<DiffusionRequestView> {
    return this.diffusionService.addAsset(id, dto.assetType, file, user);
  }

  @RequirePermission(Module.DIFUSION, Action.EDITAR)
  @Delete(':id/assets/:assetId')
  @ApiOperation({ summary: 'Quitar una pieza de la solicitud' })
  async removeAsset(
    @Param('id', ParseIntPipe) id: number,
    @Param('assetId', ParseIntPipe) assetId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<DiffusionRequestView> {
    return this.diffusionService.removeAsset(id, assetId, user);
  }
}
