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
import { CreateEventDto, UpdateEventDto } from '../dto/event.dto';
import { EventService } from '../services/event.service';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';

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
  async findAll(): Promise<Event[]> {
    return this.eventService.findAll();
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
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Event> {
    return this.eventService.findById(id);
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
  async create(@Body() createEventDto: CreateEventDto): Promise<Event> {
    return this.eventService.create(createEventDto);
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
  ): Promise<Event> {
    return this.eventService.update(id, updateEventDto);
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
  ): Promise<{ message: string }> {
    await this.eventService.remove(id);

    return {
      message: 'Evento eliminado correctamente',
    };
  }
}
