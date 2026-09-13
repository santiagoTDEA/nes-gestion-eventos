import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateEventUseCase, CreateEventDto } from '../../../application/use-cases/events/create-event.use-case';
import { GetEventsUseCase } from '../../../application/use-cases/events/get-events.use-case';
import { GetEventByIdUseCase } from '../../../application/use-cases/events/get-event-by-id.use-case';
import { EventInMemoryRepository } from '../../persistence/in-memory/event.in-memory.repository';

// Instancia compartida del repositorio en memoria para mantener el estado de los eventos
const eventRepository = new EventInMemoryRepository();

/**
 * Controlador HTTP encargado de exponer los endpoints de la API para /events.
 */
@ApiTags('events')
@Controller('events')
export class EventController {
  private createEventUseCase = new CreateEventUseCase(eventRepository);
  private getEventsUseCase = new GetEventsUseCase(eventRepository);
  private getEventByIdUseCase = new GetEventByIdUseCase(eventRepository);

  /**
   * Endpoint POST /events: Registra un nuevo evento.
   */
  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo evento' })
  @ApiResponse({ status: 201, description: 'El evento ha sido creado exitosamente.' })
  async create(@Body() dto: CreateEventDto) {
    return await this.createEventUseCase.execute(dto);
  }

  /**
   * Endpoint GET /events: Obtiene la lista completa de eventos.
   */
  @Get()
  @ApiOperation({ summary: 'Obtener la lista completa de eventos' })
  @ApiResponse({ status: 200, description: 'Lista de eventos recuperada correctamente.' })
  async findAll() {
    return await this.getEventsUseCase.execute();
  }

  /**
   * Endpoint GET /events/:id: Obtiene un evento específico por su ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un evento por su ID' })
  @ApiResponse({ status: 200, description: 'Evento encontrado.' })
  async findOne(@Param('id') id: string) {
    return await this.getEventByIdUseCase.execute(id);
  }
}