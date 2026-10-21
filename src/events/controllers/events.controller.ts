import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequireAnyPermission, RequirePermission } from '../../auth/decorators/permission/permission.decorator';
import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateEventDto, ReturnEventDto, UpdateEventDto } from '../dto/event.dto';
import { EventResponse, EventsService } from '../services/events.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@ApiBearerAuth('access-token')
@ApiTags('Eventos y aprobaciones')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos visibles para la persona autenticada' })
  @RequireAnyPermission(
    { module: Module.EVENTOS, action: Action.VER },
    { module: Module.APROBACIONES, action: Action.VER },
  )
  findAll(@Req() request: AuthenticatedRequest): Promise<EventResponse[]> {
    return this.eventsService.findAll(request.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un evento visible para la persona autenticada' })
  @RequireAnyPermission(
    { module: Module.EVENTOS, action: Action.VER },
    { module: Module.APROBACIONES, action: Action.VER },
  )
  findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponse> {
    return this.eventsService.findById(id, request.user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un evento y su flujo de aprobación' })
  @RequirePermission(Module.EVENTOS, Action.CREAR)
  create(
    @Body() dto: CreateEventDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponse> {
    return this.eventsService.create(dto, request.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un evento propio que no haya sido aprobado' })
  @RequirePermission(Module.EVENTOS, Action.EDITAR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponse> {
    return this.eventsService.update(id, dto, request.user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprobar el paso asignado a la persona autenticada' })
  @RequirePermission(Module.APROBACIONES, Action.EDITAR)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponse> {
    return this.eventsService.approve(id, request.user);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Devolver un evento al autor con una observación' })
  @RequirePermission(Module.APROBACIONES, Action.EDITAR)
  returnToAuthor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnEventDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponse> {
    return this.eventsService.returnToAuthor(id, dto.observation, request.user);
  }

  @Post(':id/resubmit')
  @ApiOperation({ summary: 'Reenviar un evento devuelto por su autor' })
  @RequirePermission(Module.APROBACIONES, Action.EDITAR)
  resubmit(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponse> {
    return this.eventsService.resubmit(id, request.user);
  }
}
