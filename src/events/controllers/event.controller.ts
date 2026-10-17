import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Event } from '../entities/event.entity';
import {
  CreateEventDto,
  ReturnEventDto,
  UpdateEventDto,
} from '../dto/event.dto';
import { EventService } from '../services/event.service';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth('access-token')
@ApiTags('Eventos')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @RequirePermission(Module.EVENTOS, Action.VER)
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los eventos',
  })
  @ApiResponse({
    status: 200,
    description: 'Eventos obtenidos correctamente',
    type: [Event],
  })
  async findAll(@CurrentUser() user: AuthUser): Promise<Event[]> {
    return this.eventService.findAll(user);
  }

  @RequirePermission(Module.EVENTOS, Action.VER)
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un evento por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del evento',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Evento encontrado correctamente',
    type: Event,
  })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<Event> {
    return this.eventService.findById(id, user);
  }

  @RequirePermission(Module.EVENTOS, Action.CREAR)
  @Post()
  @ApiOperation({
    summary: 'Crear un evento',
  })
  @ApiResponse({
    status: 201,
    description: 'Evento creado correctamente',
    type: Event,
  })
  async create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Event> {
    return this.eventService.create(createEventDto, user);
  }

  @RequirePermission(Module.EVENTOS, Action.EDITAR)
  @Post(':id/return')
  @ApiOperation({
    summary: 'Devolver el evento al autor con una observación',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del evento',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Evento devuelto correctamente',
    type: Event,
  })
  async returnToAuthor(
    @Param('id', ParseIntPipe) id: number,
    @Body() returnEventDto: ReturnEventDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Event> {
    return this.eventService.returnToAuthor(id, returnEventDto, user);
  }

  @RequirePermission(Module.EVENTOS, Action.EDITAR)
  @Post(':id/resubmit')
  @ApiOperation({
    summary: 'Reenviar el evento corregido para continuar el flujo',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del evento',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Evento reenviado correctamente',
    type: Event,
  })
  async resubmit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<Event> {
    return this.eventService.resubmit(id, user);
  }

  @RequirePermission(Module.EVENTOS, Action.EDITAR)
  @Post(':id/approve')
  @ApiOperation({
    summary: 'Firmar el paso actual del workflow de aprobación',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del evento',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Paso firmado correctamente',
    type: Event,
  })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<Event> {
    return this.eventService.approve(id, user);
  }

  @RequirePermission(Module.EVENTOS, Action.EDITAR)
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un evento',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del evento',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Evento actualizado correctamente',
    type: Event,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Event> {
    return this.eventService.update(id, updateEventDto, user);
  }

  @RequirePermission(Module.EVENTOS, Action.ELIMINAR)
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un evento',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del evento',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Evento eliminado correctamente',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string }> {
    await this.eventService.remove(id, user);

    return {
      message: 'Evento eliminado correctamente',
    };
  }
}
