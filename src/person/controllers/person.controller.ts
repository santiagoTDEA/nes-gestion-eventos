import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PersonService } from '../services/person.service';
import { Person } from '../entities/person.entity';
import { CreatePersonDto, UpdatePersonDto } from '../dto/person.dto';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';

@ApiTags('Personas')
@Controller('persons')
@UseGuards(JwtAuthGuard)
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  @Get()
  @ApiOperation({
    summary: 'Obtener todas las personas',
  })
  @ApiResponse({
    status: 200,
    description: 'Personas obtenidas correctamente',
    type: [Person],
  })
  async findAll(): Promise<Person[]> {
    return this.personService.findAll();
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una persona por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único de la persona',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Persona encontrada correctamente',
    type: Person,
  })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Person> {
    return this.personService.findById(id);
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.CREAR)
  @Post()
  @ApiOperation({
    summary: 'Crear una persona',
  })
  @ApiResponse({
    status: 201,
    description: 'Persona creada correctamente',
    type: Person,
  })
  async create(@Body() createPersonDto: CreatePersonDto): Promise<Person> {
    return this.personService.create(createPersonDto);
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.EDITAR)
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una persona',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único de la persona',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Persona actualizada correctamente',
    type: Person,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonDto: UpdatePersonDto,
  ): Promise<Person> {
    return this.personService.update(id, updatePersonDto);
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.ELIMINAR)
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una persona',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único de la persona',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Persona eliminada correctamente',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.personService.remove(id);
  }
}
